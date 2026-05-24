import paho.mqtt.client as mqtt
import os
import time
from dotenv import load_dotenv

# Path fixed
dotenv_path = r"c:\University\HK252\DADN\DADN-Yolohome\Face-recognition\.env"
load_dotenv(dotenv_path=dotenv_path)

USERNAME = os.getenv("ADAFRUIT_AIO_USERNAME")
KEY = os.getenv("ADAFRUIT_AIO_KEY")
FEED_PIR = f"{USERNAME}/feeds/pir"

print(f"DEBUG: USERNAME={USERNAME}, FEED_PIR={FEED_PIR}")

def on_connect(client, userdata, flags, rc, properties=None):
    print("Connected to Adafruit IO!")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(USERNAME, KEY)
client.on_connect = on_connect

client.connect("io.adafruit.com", 1883, 60)
client.loop_start()

try:
    while True:
        val = input("Value (1/0): ").strip()
        if val in ['0', '1']:
            print(f"Publishing {val} to {FEED_PIR}...")
            client.publish(FEED_PIR, val)
        else:
            break
        time.sleep(1)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
    client.disconnect()

