import os
import json
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageStat

RAW_DIR = "raw_photos"
OUT_DIR = "watermarked_photos"
JSON_FILE = "photos.json"

TEXT = "@KIERANN CHONG\n@kiwi.shoots"
MAX_SIZE = (1920, 1920)

# Check if old photos structure exists and rename it
if os.path.exists("photos") and not os.path.exists(RAW_DIR):
    print("Renaming 'photos' to 'raw_photos' for the new workflow...")
    os.rename("photos", RAW_DIR)

if not os.path.exists(OUT_DIR):
    os.makedirs(OUT_DIR)

# Ensure raw_photos exists now
if not os.path.exists(RAW_DIR):
    os.makedirs(RAW_DIR)

with open(JSON_FILE, "r") as f:
    photo_data = json.load(f)

# Flatten the nested structure for easier lookup in the watermarking loop
photos_list = []
if isinstance(photo_data, dict):
    for orientation in ['landscape', 'portrait']:
        if orientation in photo_data:
            for pid, pdata in photo_data[orientation].items():
                photos_list.append(pdata)
else:
    # Fallback for old flat list structure
    photos_list = photo_data

photo_map = { p["filename"]: p for p in photos_list }

# Setup a large font. Provide fallback paths for WSL/Ubuntu vs Windows.
font_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/mnt/c/Windows/Fonts/arialbd.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf"
]
font = None
for fp in font_paths:
    if os.path.exists(fp):
        font = ImageFont.truetype(fp, 40)
        break

if not font:
    # Use default font but scale text up natively in PIL 9.2+ if possible
    try:
        font = ImageFont.load_default(size=40)
    except TypeError:
        font = ImageFont.load_default()

for filename in os.listdir(RAW_DIR):
    if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue
    
    raw_path = os.path.join(RAW_DIR, filename)
    out_path = os.path.join(OUT_DIR, filename)
    
    config = photo_map.get(filename, {})
    position = config.get("widgetPosition", {"corner": "bottom-left", "x": 180, "y": 180})
    location = position.get("corner", "bottom-left")
    
    need_update = True
    if os.path.exists(out_path):
        raw_mtime = os.path.getmtime(raw_path)
        json_mtime = os.path.getmtime(JSON_FILE)
        out_mtime = os.path.getmtime(out_path)
        if out_mtime >= raw_mtime and out_mtime >= json_mtime:
            need_update = False
            
    if need_update:
        print(f"Applying watermark and resizing: {filename}...")
        img = Image.open(raw_path)
        img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        
        draw = ImageDraw.Draw(img)
        
        try:
            bbox = draw.multiline_textbbox((0, 0), TEXT, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        except AttributeError:
            text_width, text_height = draw.multiline_textsize(TEXT, font=font)
        
        # Using explicit margins from JSON configuration
        margin_x = position.get("x", 180)
        margin_y = position.get("y", 180)
            
        img_w, img_h = img.size
        
        if "left" in location:
            x = margin_x
        else: # right
            x = img_w - text_width - margin_x
            
        if "top" in location:
            y = margin_y
        else: # bottom
            y = img_h - text_height - margin_y
            
        # Calculate local brightness for dynamic contrast color
        crop_box = (max(0, x), max(0, y), min(img_w, x + text_width), min(img_h, y + text_height))
        region = img.crop(crop_box)
        stat = ImageStat.Stat(region)
        avg_r, avg_g, avg_b = stat.mean[:3]
        brightness = (avg_r * 299 + avg_g * 587 + avg_b * 114) / 1000
        
        if brightness > 127:
            fill_color = (15, 20, 26, 255) # Very dark text for bright bg
        else:
            fill_color = (240, 245, 250, 255) # White/light text for dark bg
            
        try:
            draw.multiline_text((x, y), TEXT, font=font, fill=fill_color, align="center")
        except AttributeError:
            draw.text((x, y), TEXT, font=font, fill=fill_color)
        
        img.save(out_path, quality=85)

print("Image processing complete!")
