import psycopg2
import subprocess
import json
import os

print("="*50)
print("🔍 VERIFYING AI AUTOMATION LOGIC")
print("="*50)

try:
    # Kết nối DB
    conn = psycopg2.connect(
        dbname="DADN",
        user="postgres",
        password="ngocngu27072005",
        host="localhost",
        port="5432"
    )
    cursor = conn.cursor()

    # Lấy dữ liệu sensor mới nhất
    cursor.execute("""
        SELECT DISTINCT ON (feed_name) feed_name, value 
        FROM sensors 
        ORDER BY feed_name, timestamp DESC;
    """)
    sensors = {row[0]: float(row[1]) for row in cursor.fetchall()}
    print(f"📊 Latest Sensor Data: {sensors}")

    # Lấy trạng thái thiết bị hiện tại
    cursor.execute("""
        SELECT name, status, mode 
        FROM device_configurations 
        WHERE name IN ('fan', 'led');
    """)
    devices = {row[0]: {"status": row[1], "mode": row[2]} for row in cursor.fetchall()}
    print(f"🔌 Current Device Status in DB: {devices}")

    # Kiểm tra FAN
    if 'thermal' in sensors and 'humid' in sensors:
        fan_input = json.dumps({"temperature": sensors['thermal'], "humidity": sensors['humid']})
        fan_script = os.path.join("src", "YolohomeModel", "fan_control", "infer_fan_control.py")
        result = subprocess.run(["python", "-X", "utf8", fan_script, fan_input], capture_output=True, text=True, cwd="c:/University/HK252/DADN/DADN-Yolohome/backend", env={**os.environ, "PYTHONUTF8": "1"})
        ai_fan_pred = result.stdout.strip() == "BẬT"
        db_fan_status = devices.get('fan', {}).get('status', False)
        
        print(f"\n🌀 FAN CONTROL CHECK:")
        print(f"  - Input to AI: {fan_input}")
        print(f"  - AI Prediction: {'BẬT (ON)' if ai_fan_pred else 'TẮT (OFF)'}")
        print(f"  - Actual DB Status: {'BẬT (ON)' if db_fan_status else 'TẮT (OFF)'}")
        print(f"  - Match: {'✅ ĐÚNG' if ai_fan_pred == db_fan_status else '❌ SAI'}")

    # Kiểm tra LED
    if 'light' in sensors and 'thermal' in sensors and 'humid' in sensors:
        # Cần tính minute_of_day theo giờ local
        from datetime import datetime
        now = datetime.now()
        minute_of_day = now.hour * 60 + now.minute
        
        led_input = json.dumps({
            "Light_Intensity": sensors['light'],
            "Temperature": sensors['thermal'],
            "Humidity": sensors['humid'],
            "Minute_Of_Day": minute_of_day
        })
        led_script = os.path.join("src", "YolohomeModel", "led_control", "infer_led_control.py")
        result = subprocess.run(["python", "-X", "utf8", led_script, led_input], capture_output=True, text=True, cwd="c:/University/HK252/DADN/DADN-Yolohome/backend", env={**os.environ, "PYTHONUTF8": "1"})
        ai_led_pred = result.stdout.strip() == "1"
        db_led_status = devices.get('led', {}).get('status', False)
        
        print(f"\n💡 LED CONTROL CHECK:")
        print(f"  - Input to AI: {led_input}")
        print(f"  - AI Prediction: {'BẬT (ON)' if ai_led_pred else 'TẮT (OFF)'}")
        print(f"  - Actual DB Status: {'BẬT (ON)' if db_led_status else 'TẮT (OFF)'}")
        print(f"  - Match: {'✅ ĐÚNG' if ai_led_pred == db_led_status else '❌ SAI'}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        cursor.close()
        conn.close()
