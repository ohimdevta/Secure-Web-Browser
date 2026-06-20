import os
import re

directory = r"c:\Users\admin\OneDrive\Desktop\web browser"

# Replacements to make in order
replacements = [
    # Full titles
    (r"NovaBrowser — Next-Gen Web Browser", r"Search Bharat - India ready 2 Search"),
    (r"NovaBrowser — Next-generation web browser", r"Search Bharat - India ready 2 Search"),
    (r"NovaBrowser —", r"Search Bharat -"),
    (r"NovaBrowser", r"Search Bharat"),
    (r"Nova Browser", r"Search Bharat"),
    
    # CSS prefixes and IDs
    (r"nova-", r"bharat-"),
    (r"novaApp", r"bharatApp"),
    (r"NovaBrowserApp", r"SearchBharatApp"),
    (r"nova://", r"bharat://"),
    (r"novaBrowser", r"bharatBrowser"),
    (r"NovaPuzzle", r"BharatPuzzle"),
    (r"Nova Puzzle", r"Bharat Puzzle"),
    (r"Nova AI", r"Bharat AI"),
    (r"persist:nova", r"persist:bharat"),
]

def process_file(filepath):
    # Skip binary files or specific folders
    if ".git" in filepath or "node_modules" in filepath or "rename.py" in filepath:
        return
    
    # Only process text files
    if not filepath.endswith(('.html', '.css', '.js', '.json', '.md')):
        return

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Skipping {filepath}: {e}")
        return

    original_content = content
    for old, new in replacements:
        content = re.sub(old, new, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        process_file(os.path.join(root, file))

print("Rename complete!")
