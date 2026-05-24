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
PIR_TRIGGER_CHANCE = 0.3 # 30% cơ hội kích hoạt PIR mỗi vòng lặp

# Đường dẫn file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(SCRIPT_DIR, ".env")
DATASET_PATH = os.path.join(SCRIPT_DIR, "src", "YolohomeModel", "led_control", "data", "smart_home_led_dataset.csv")

# ==========================================
# 1. ĐỌC ADAFRUIT KEYS TỪ .ENV
# ==========================================
adafruit_user = None
adafruit_key = None

print("Dang doc cau hinh tu .env...")
try:
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ADAFRUIT_IO_USERNAME="):
                adafruit_user = line.split("=")[1].strip()
            elif line.startswith("ADAFRUIT_IO_KEY="):
                adafruit_key = line.split("=")[1].strip()
except Exception as e:
    print(f"Loi doc file .env: {e}")
    exit(1)

if not adafruit_user or not adafruit_key:
    print("Khong tim thay ADAFRUIT_IO_USERNAME hoac ADAFRUIT_IO_KEY trong file .env!")
    exit(1)

print(f"Da tai Adafruit IO cho user: {adafruit_user}")

# ==========================================
# 2. ĐỌC DATASET
# ==========================================
print(f"Dang tai dataset tu: {DATASET_PATH}...")
try:
    df = pd.read_csv(DATASET_PATH)
    print(f"Da tai {len(df)} dong du lieu.")
except Exception as e:
    print(f"Loi tai dataset: {e}")
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
            print(f"  -> [Adafruit] Da gui {value} len feed '{feed_key}'")
        else:
            print(f"  Loi gui feed '{feed_key}': {response.status_code} - {response.text}")
    except Exception as e:
        print(f"  Loi ket noi: {e}")

# ==========================================
# 4. CHẠY VÒNG LẶP DEMO
# ==========================================
print("\n" + "="*50)
print("BAT DAU CHAY SENSOR SIMULATOR DEMO")
print("Bam Ctrl+C de dung.")
print("="*50 + "\n")

current_row = START_ROW

try:
    while True:
        if current_row >= len(df):
            print("Da chay het data, vong lap lai tu dau...")
            current_row = 0
            
        row = df.iloc[current_row]
        
        temp = round(row["Temperature"], 1)
        humid = round(row["Humidity"], 1)
        light = round(row["Light_Intensity"], 1)
        
        # In ra man hinh de theo doi
        print(f"Dang mo phong Dong {current_row}: Nhiet do={temp}C, Do am={humid}%, Anh sang={light} lux", flush=True)
        
        # Gửi dữ liệu cảm biến chính
        send_to_adafruit("thermal", temp)
        send_to_adafruit("humid", humid)
        send_to_adafruit("light", light)
        
        # --- SIMULATE PIR ---
        if random.random() < PIR_TRIGGER_CHANCE:
            print(f"  [Simulator] MOTION DETECTED! Sending PIR=1...", flush=True)
            send_to_adafruit("pir", "1")
            # Doi mot chut roi reset PIR ve 0
            time.sleep(2)
            send_to_adafruit("pir", "0")
            print(f"  [Simulator] Reset PIR=0", flush=True)
        
        # Tùy chọn gửi thêm pump/earth-humid nếu muốn cho UI đẹp
        # send_to_adafruit("earth-humid", random.randint(40, 80))
        
        print(f"Cho {DELAY_SECONDS} giay...\n", flush=True)
        time.sleep(DELAY_SECONDS)
        current_row += 1

except KeyboardInterrupt:
    print("\nDa dung Simulator.")
