# %%
import subprocess
import yt_dlp as youtube_dl
import os

def run():
    # 輸入 YouTube 影片網址
    video_url = input("Please enter the YouTube Video URL: ")

    # 選擇儲存路徑
    path_to_save = input("Enter the folder path to save the file (leave empty for current folder): ")
    where_to_save = path_to_save if path_to_save else os.getcwd()

    # yt-dlp 設定
    options = {
        'quiet': True,
        'noplaylist': True,
        'format': 'bestaudio/best',
        'keepvideo': False,
        'outtmpl': os.path.join(where_to_save, '%(title)s.%(ext)s'),  # 自動產生安全檔名
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    }

    # 下載
    with youtube_dl.YoutubeDL(options) as ydl:
        info = ydl.extract_info(video_url, download=True)   # 直接下載
        output_path = ydl.prepare_filename(info)            # 原始檔名
        output_path = os.path.splitext(output_path)[0] + ".mp3"  # 改成 mp3

    # 檢查檔案是否存在
    if os.path.exists(output_path):
        print(f"✅ Download complete: {output_path}")
        coding_env = os.name
        if coding_env == 'nt':  # Windows
            os.startfile(output_path)
        elif coding_env == 'posix':  # macOS / Linux
            subprocess.call(["open", output_path]) if sys.platform == "darwin" else subprocess.call(["xdg-open", output_path])
    else:
        print("❌ File not found. Please check if ffmpeg is installed properly.")

if __name__ == '__main__':
    run()
