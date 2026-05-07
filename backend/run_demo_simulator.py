import os
import time
import requests
import pandas as pd
import random

# ==========================================
# CẤU HÌNH SIMULATOR
# ==========================================
DELAY_SECONDS = 15  # Thời gian gửi dữ liệu (giây) - Đừng để quá thấp tránh bị block bởi Adafruit (limit: 30 req/min)
START_ROW = 0       # Dòng bắt đầu đọc trong CSV

# Đường dẫn file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(SCRIPT_DIR, ".env")
DATASET_PATH = os.path.join(SCRIPT_DIR, "src", "YolohomeModel", "led_control", "data", "smart_home_led_dataset.csv")

# ==========================================
# 1. ĐỌC ADAFRUIT KEYS TỪ .ENV
# ==========================================
adafruit_user = None
adafruit_key = None

print("Đang đọc cấu hình từ .env...")
try:
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ADAFRUIT_IO_USERNAME="):
                adafruit_user = line.split("=")[1].strip()
            elif line.startswith("ADAFRUIT_IO_KEY="):
                adafruit_key = line.split("=")[1].strip()
except Exception as e:
    print(f"❌ Lỗi đọc file .env: {e}")
    exit(1)

if not adafruit_user or not adafruit_key:
    print("❌ Không tìm thấy ADAFRUIT_IO_USERNAME hoặc ADAFRUIT_IO_KEY trong file .env!")
    exit(1)

print(f"✅ Đã tải Adafruit IO cho user: {adafruit_user}")

# ==========================================
# 2. ĐỌC DATASET
# ==========================================
print(f"Đang tải dataset từ: {DATASET_PATH}...")
try:
    df = pd.read_csv(DATASET_PATH)
    print(f"✅ Đã tải {len(df)} dòng dữ liệu.")
except Exception as e:
    print(f"❌ Lỗi tải dataset: {e}")
    exit(1)

# ==========================================
# 3. HÀM GỬI DỮ LIỆU LÊN ADAFRUIT (REST API)
# ==========================================
def send_to_adafruit(feed_key, value):
    url = f"https://io.adafruit.com/api/v2/{adafruit_user}/feeds/{feed_key}/data"
    headers = {
        "X-AIO-Key": adafruit_key,
        "Content-Type": "application/json"
    }
    payload = {"datum": {"value": value}}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f"  ➜ [Adafruit] Đã gửi {value} lên feed '{feed_key}'")
        else:
            print(f"  ❌ Lỗi gửi feed '{feed_key}': {response.status_code} - {response.text}")
    except Exception as e:
        print(f"  ❌ Lỗi kết nối: {e}")

# ==========================================
# 4. CHẠY VÒNG LẶP DEMO
# ==========================================
print("\n" + "="*50)
print("🚀 BẮT ĐẦU CHẠY SENSOR SIMULATOR DEMO")
print("Bấm Ctrl+C để dừng.")
print("="*50 + "\n")

current_row = START_ROW

try:
    while True:
        if current_row >= len(df):
            print("🔄 Đã chạy hết data, vòng lặp lại từ đầu...")
            current_row = 0
            
        row = df.iloc[current_row]
        
        temp = round(row["Temperature"], 1)
        humid = round(row["Humidity"], 1)
        light = round(row["Light_Intensity"], 1)
        
        # In ra màn hình để theo dõi
        print(f"🕒 Đang mô phỏng Dòng {current_row}: Nhiệt độ={temp}°C, Độ ẩm={humid}%, Ánh sáng={light} lux")
        
        # Gửi dữ liệu
        send_to_adafruit("thermal", temp)
        send_to_adafruit("humid", humid)
        send_to_adafruit("light", light)
        
        # Tùy chọn gửi thêm pump/earth-humid nếu muốn cho UI đẹp
        # send_to_adafruit("earth-humid", random.randint(40, 80))
        
        print(f"⏳ Chờ {DELAY_SECONDS} giây...\n")
        time.sleep(DELAY_SECONDS)
        current_row += 1

except KeyboardInterrupt:
    print("\n🛑 Đã dừng Simulator.")
