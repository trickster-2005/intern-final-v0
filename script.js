// ====== 工具 ======
function download(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function arrayToObjects(data, headers) {
  return data.map((r) => {
    const o = {};
    headers.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}

function inferColumns(headers) {
  const genderList = ["在地知識", "學名", "大眾用語"];
  const isAge = (h) => /^(年齡|年龄|age)$/i.test(h.trim());
  const isDate = (h) => /^(日期|date)$/i.test(h.trim());
  const isGender = (h) => /^(類別|類别|gender)$/i.test(h.trim());
  return headers.map((h) => {
    if (isAge(h)) {
      return {
        data: h,
        type: "numeric",
        validator: (v, cb) => {
          if (v === "" || v == null) return cb(true);
          cb(Number.isInteger(Number(v)) && Number(v) > 0);
        },
        allowInvalid: false,
      };
    }
    if (isDate(h)) {
      return {
        data: h,
        type: "date",
        dateFormat: "YYYY-MM-DD",
        correctFormat: true,
        validator: (v, cb) => {
          if (v === "" || v == null) return cb(true);
          cb(/^\d{4}-\d{2}-\d{2}$/.test(v));
        },
        allowInvalid: false,
      };
    }
    if (isGender(h)) {
      return {
        data: h,
        type: "dropdown",
        source: genderList,
        strict: false,
        allowInvalid: false,
      };
    }
    return { data: h, type: "text" };
  });
}

function buildDefaultSheet() {
  const headers = ["年齡", "日期", "類別", "備註"];
  return {
    headers,
    columns: inferColumns(headers),
    data: [
      { 年齡: 20, 日期: "2025-01-01", 類別: "其他", 備註: "示例" },
      { 年齡: 100, 日期: "2025-01-01", 類別: "其他", 備註: "示例" },
    ],
  };
}

// ====== Handsontable 初始化 ======
const container = document.getElementById("hot");
let { headers, columns, data } = buildDefaultSheet();
const hot = new Handsontable(container, {
  data,
  columns,
  colHeaders: headers,
  rowHeaders: true,
  licenseKey: "non-commercial-and-evaluation",
  contextMenu: true,
  dropdownMenu: true,
  filters: true,
  columnSorting: true,
  manualColumnResize: true,
  manualRowResize: true,
  manualColumnMove: true,
  manualRowMove: true,
  autoWrapRow: false,
  undo: true,
  copyPaste: true,
  height: "100%",
  stretchH: "all",
});

function loadDataWithHeaders(objs, headersIn) {
  const cols = inferColumns(headersIn);
  hot.updateSettings({
    data: objs,
    columns: cols,
    colHeaders: headersIn,
  });
}

// ====== 匯入 ======
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const pasteDlg = document.getElementById("pasteDlg");
const pasteBtn = document.getElementById("pasteCsvBtn");
const noHeader = document.getElementById("noHeader");

fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) parseCSVFile(f);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = "var(--accent)";
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = "var(--border)";
  })
);
dropzone.addEventListener("drop", (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f) parseCSVFile(f);
});

function parseCSVFile(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    complete: (res) => {
      const fields = res.meta.fields || [];
      const rows = res.data || [];
      if (!fields.length && rows.length) {
        const hdrs = rows[0].map((_, i) => `Column ${i + 1}`);
        const objs = arrayToObjects(rows, hdrs);
        loadDataWithHeaders(objs, hdrs);
      } else {
        loadDataWithHeaders(rows, fields);
      }
    },
    error: (err) => alert("解析錯誤：" + err.message),
  });
}

pasteBtn.addEventListener("click", () => pasteDlg.showModal());
document.getElementById("closeDlg").addEventListener("click", () => pasteDlg.close());
document.getElementById("cancelDlg").addEventListener("click", () => pasteDlg.close());
document.getElementById("parsePasted").addEventListener("click", () => {
  const txt = document.getElementById("pasteArea").value || "";
  if (!txt.trim()) { pasteDlg.close(); return; }
  Papa.parse(txt, {
    header: !noHeader.checked,
    skipEmptyLines: "greedy",
    complete: (res) => {
      if (!noHeader.checked) {
        const fields = res.meta.fields || [];
        loadDataWithHeaders(res.data || [], fields);
      } else {
        const rows = res.data || [];
        if (!rows.length) { pasteDlg.close(); return; }
        const hdrs = rows[0].map((_, i) => `Column ${i + 1}`);
        const objs = arrayToObjects(rows, hdrs);
        loadDataWithHeaders(objs, hdrs);
      }
      pasteDlg.close();
    },
  });
});

// ====== 列／欄快捷鈕（新版安全 API） ======
document.getElementById("addRow").addEventListener("click", () => {
  const newRow = {};
  hot.getColHeader().forEach(h => newRow[h] = "");
  hot.updateSettings({ data: [...hot.getSourceData(), newRow] });
});

document.getElementById("removeRow").addEventListener("click", () => {
  const data = hot.getSourceData();
  const sel = hot.getSelectedLast();
  const rowIndex = sel ? sel[0] : data.length - 1;
  data.splice(rowIndex, 1);
  hot.updateSettings({ data });
});

document.getElementById("addCol").addEventListener("click", () => {
  const newName = `Column ${hot.countCols() + 1}`;
  const headers = hot.getColHeader();
  const cols = hot.getSettings().columns;
  const data = hot.getSourceData();
  data.forEach((row) => { row[newName] = ""; });
  headers.push(newName);
  cols.push({ data: newName });
  hot.updateSettings({ colHeaders: headers, columns: cols, data });
});

document.getElementById("removeCol").addEventListener("click", () => {
  const sel = hot.getSelectedLast();
  const colIndex = sel ? sel[1] : hot.countCols() - 1;
  if (colIndex >= 0) {
    const headers = hot.getColHeader();
    const cols = hot.getSettings().columns;
    const data = hot.getSourceData();
    data.forEach(row => delete row[headers[colIndex]]);
    headers.splice(colIndex, 1);
    cols.splice(colIndex, 1);
    hot.updateSettings({ colHeaders: headers, columns: cols, data });
  }
});

// ====== 匯出 ======
function getCurrentDataObjects() {
  const headers = hot.getColHeader();
  const data = hot.getSourceData();
  const rows = data.map((r) => {
    const o = {};
    headers.forEach(h => o[h] = r?.[h] ?? "");
    return o;
  });
  return { headers, rows };
}

document.getElementById("exportCsv").addEventListener("click", () => {
  const { headers, rows } = getCurrentDataObjects();
  const csv = Papa.unparse(rows, { columns: headers });
  const content = "\uFEFF" + csv;
  const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  download(`edited-${ts}.csv`, content, "text/csv;charset=utf-8");
});

document.getElementById("exportJson").addEventListener("click", () => {
  const { rows } = getCurrentDataObjects();
  const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  download(`edited-${ts}.json`, JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
});

// ====== 深色模式 ======
const darkBtn = document.getElementById("darkMode");
darkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  darkBtn.textContent = document.body.classList.contains("dark") ? "淺色模式" : "深色模式";
});






// ====== 插入欄位時自訂內容與資料類別 ======
document.getElementById("addCol").addEventListener("click", () => {
  const colName = prompt("請輸入新欄位名稱：", `Column ${hot.countCols() + 1}`);
  if (!colName) return;

  const dataType = prompt("請選擇資料類型：text / numeric / date / dropdown", "text");
  if (!dataType) return;

  let defaultValue = prompt("請輸入此欄位的預設內容（可留空）：", "");
  if (defaultValue === null) defaultValue = "";

  const headers = hot.getColHeader();
  const cols = hot.getSettings().columns;
  const data = hot.getSourceData();

  // 設定每列資料的預設值
  data.forEach((row) => { row[colName] = defaultValue; });

  // 根據資料類型建立 column 設定
  let colSetting = { data: colName, type: dataType };
  if (dataType === "dropdown") {
    colSetting.source = [];
    colSetting.strict = false;
  }
  if (dataType === "numeric") {
    colSetting.validator = (v, cb) => cb(v === "" || Number.isFinite(Number(v)));
  }
  if (dataType === "date") {
    colSetting.dateFormat = "YYYY-MM-DD";
    colSetting.correctFormat = true;
    colSetting.validator = (v, cb) => cb(v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v));
  }

  headers.push(colName);
  cols.push(colSetting);

  hot.updateSettings({ colHeaders: headers, columns: cols, data });
});










// ====== 視覺化 CSV ======
document.getElementById("visualizeBtn").addEventListener("click", () => {
  const data = hot.getSourceData();

  // 將 CSV 資料轉成 d3 tree JSON
  const root = { name: "Root", children: [] };
  data.forEach((row, index) => {
    const node = { name: `Row ${index + 1}`, children: [] };
    for (const key in row) {
      node.children.push({ name: `${key}: ${row[key]}` });
    }
    root.children.push(node);
  });

  // 呼叫 tree.js 的 drawTree
  if (window.drawTree) {
    window.drawTree(root);
  } else {
    console.warn("請先加載 tree.js 並定義 drawTree 函式");
  }
});