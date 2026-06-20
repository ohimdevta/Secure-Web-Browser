import urllib.request
import os

url = "https://upload.wikimedia.org/wikipedia/commons/e/e4/India_map_en.svg"
save_path = r"c:\Users\admin\OneDrive\Desktop\web browser\india-map.svg"

try:
    urllib.request.urlretrieve(url, save_path)
    print("Map downloaded successfully")
except Exception as e:
    print(f"Error: {e}")
