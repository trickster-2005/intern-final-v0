const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight;
const margin = { top: 50, right: 90, bottom: 30, left: 90 };
let treeWidth = width - margin.left - margin.right;
const treeHeight = height - margin.top - margin.bottom;

// 放所有圖形的 group
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// 縮放拖曳行為
const zoom = d3.zoom()
  .scaleExtent([0.1, 5])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });
svg.call(zoom);

let currentTreeData = null; // 保留目前編輯的樹狀資料

// 將一般 JSON 轉成 d3 tree 用格式 {name, children}
function convertToD3Tree(obj, key = "root") {
  if (typeof obj !== "object" || obj === null) {
    return { name: `${key}: ${obj}` };
  }
  // 陣列特殊處理 key: arrayIndex
  if (Array.isArray(obj)) {
    return {
      name: key + " (array)",
      children: obj.map((v, i) => convertToD3Tree(v, `[${i}]`))
    };
  }
  return {
    name: key,
    children: Object.entries(obj).map(([k, v]) => convertToD3Tree(v, k)),
  };
}

// 把 d3 tree 格式反轉回一般 JSON
function treeDataToJSON(node) {
  if (!node.children || node.children.length === 0) {
    if (node.name.includes(":")) {
      const [k, v] = node.name.split(/:(.+)/);
      return parseValue(v.trim());
    }
    return node.name;
  }
  if (node.name.endsWith("(array)")) {
    return node.children.map(child => treeDataToJSON(child));
  }
  const obj = {};
  node.children.forEach(child => {
    let key = child.name;
    if (key.includes(":")) {
      key = key.split(/:(.+)/)[0].trim();
    }
    obj[key] = treeDataToJSON(child);
  });
  return obj;
}

// 嘗試把字串轉成 boolean 或 number
function parseValue(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  if (!isNaN(val)) return Number(val);
  return val;
}

function drawTree(data) {
  currentTreeData = data;

  let leafCount = 0;
  function countLeaves(node) {
    if (!node.children || node.children.length === 0) leafCount++;
    else node.children.forEach(countLeaves);
  }
  countLeaves(data);
  treeWidth = Math.max(leafCount * 20, width - margin.left - margin.right);

  g.selectAll("*").remove();

  const root = d3.hierarchy(data);
  const treeLayout = d3.tree()
    .size([treeHeight, treeWidth])
    // .separation((a, b) => {
    //   if (a.parent !== b.parent) return 1.5;
    //   if (a.children && b.children) return 1;
    //   if (!a.children && !b.children) return 0.5;
    //   return 5;
    // });
  treeLayout(root);

  // 折線連結路徑
  g.selectAll(".link")
    .data(root.links())
    .join("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-width", 2)
    .attr("d", d => `M${d.source.y},${d.source.x} H${d.target.y} V${d.target.x}`);

  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodes.append("circle").attr("r", 8);

  nodes.append("text")
    .attr("dy", 3)
    .attr("x", d => (d.children ? 12 : 12))
    .attr("y", d => (d.children ? -15 : 0))
    .style("text-anchor", d => (d.children ? "end" : "start"))
    .text(d => d.data.name)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      const newText = prompt("請輸入新文字", d.data.name);
      if (newText !== null && newText.trim() !== "") {
        d.data.name = newText.trim();
        drawTree(currentTreeData);
      }
    });
}

// 預設範例
const exampleJSON = {
  "name": "Alice",
  "age": 30,
  "hobbies": ["reading", "swimming", "coding"],
  "education": {
    "undergraduate": {
      "school": "University A",
      "year": 2012
    },
    "graduate": {
      "school": "University B",
      "year": 2015
    }
  },
  "isEmployed": true
};

drawTree(convertToD3Tree(exampleJSON));

document.getElementById("upload").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const json = JSON.parse(event.target.result);
      const treeData = convertToD3Tree(json);
      drawTree(treeData);
    } catch {
      alert("請上傳有效的 JSON 檔案");
    }
  };
  reader.readAsText(file);
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!currentTreeData) {
    alert("沒有資料可以下載");
    return;
  }
  const jsonObj = treeDataToJSON(currentTreeData);
  const jsonStr = JSON.stringify(jsonObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edited_tree.json";
  a.click();
  URL.revokeObjectURL(url);
});

window.addEventListener("resize", () => {
  if (currentTreeData) {
    drawTree(currentTreeData);
  }
});
