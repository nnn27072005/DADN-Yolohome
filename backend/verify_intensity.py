import psycopg2
import subprocess
import json
import os

print("="*50)
print("🔍 VERIFYING SMART INTENSITY LOGIC")
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
        SELECT name, status, mode, intensity 
        FROM device_configurations 
        WHERE name IN ('fan', 'led');
    """)
    devices = {row[0]: {"status": row[1], "mode": row[2], "intensity": row[3]} for row in cursor.fetchall()}
    print(f"🔌 Current Device Status in DB: {devices}")

    # Tính toán intensity mong đợi dựa trên rule mới
    def get_expected_fan_intensity(temp):
        if temp >= 35: return 100
        elif temp >= 32: return 80
        elif temp >= 29: return 60
        else: return 40

    def get_expected_led_intensity(light):
        if light <= 30: return 100
        elif light <= 70: return 70
        elif light <= 110: return 40
        else: return 20

    # Kiểm tra FAN
    if 'thermal' in sensors:
        temp = sensors['thermal']
        expected_intensity = get_expected_fan_intensity(temp)
        actual_intensity = devices.get('fan', {}).get('intensity')
        status = devices.get('fan', {}).get('status')
        
        print(f"\n🌀 FAN INTENSITY CHECK (Temp={temp}°C):")
        print(f"  - Status: {'ON' if status else 'OFF'}")
        print(f"  - Expected Intensity: {expected_intensity}%")
        print(f"  - Actual Intensity: {actual_intensity}%")
        if status:
            print(f"  - Match: {'✅ ĐÚNG' if expected_intensity == actual_intensity else '❌ SAI'}")
        else:
            print(f"  - (Fan is OFF, intensity check skipped)")

    # Kiểm tra LED
    if 'light' in sensors:
        light = sensors['light']
        expected_intensity = get_expected_led_intensity(light)
        actual_intensity = devices.get('led', {}).get('intensity')
        status = devices.get('led', {}).get('status')
        
        print(f"\n💡 LED INTENSITY CHECK (Light={light} lux):")
        print(f"  - Status: {'ON' if status else 'OFF'}")
        print(f"  - Expected Intensity: {expected_intensity}%")
        print(f"  - Actual Intensity: {actual_intensity}%")
        if status:
            print(f"  - Match: {'✅ ĐÚNG' if expected_intensity == actual_intensity else '❌ SAI'}")
        else:
            print(f"  - (LED is OFF, intensity check skipped)")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        cursor.close()
        conn.close()
