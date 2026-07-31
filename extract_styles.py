import os
import re
import hashlib
from bs4 import BeautifulSoup

directory = r'c:\Users\asus\OneDrive\Desktop\Edit'
html_files = [f for f in os.listdir(directory) if f.endswith('.html')]

css_rules = {}

def get_class_name(style_content):
    # Create a hash of the style content to make unique class names
    hash_obj = hashlib.md5(style_content.strip().encode())
    return "inline-style-" + hash_obj.hexdigest()[:8]

for file in html_files:
    filepath = os.path.join(directory, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    modified = False

    for tag in soup.find_all(style=True):
        style_val = tag['style']
        cls_name = get_class_name(style_val)
        
        if cls_name not in css_rules:
            css_rules[cls_name] = style_val
        
        # Add class
        classes = tag.get('class', [])
        if isinstance(classes, str):
            classes = [classes]
        if cls_name not in classes:
            classes.append(cls_name)
            tag['class'] = classes
        
        del tag['style']
        modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(str(soup))

if css_rules:
    css_path = os.path.join(directory, 'extracted-styles.css')
    with open(css_path, 'w', encoding='utf-8') as f:
        for cls, rule in css_rules.items():
            f.write(f".{cls} {{\n    {rule}\n}}\n")
    print(f"Extracted {len(css_rules)} styles to extracted-styles.css")
else:
    print("No styles extracted")

# We also need to add <link rel="stylesheet" href="extracted-styles.css" /> to all html files
for file in html_files:
    filepath = os.path.join(directory, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'extracted-styles.css' not in content:
        content = content.replace('</head>', '  <link rel="stylesheet" href="extracted-styles.css" />\n</head>')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
