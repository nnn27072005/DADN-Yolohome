"""Quick test script for fan and LED inference."""
import subprocess
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
fan_dir = os.path.join(script_dir, "fan_control")
led_dir = os.path.join(script_dir, "led_control")

python = sys.executable

tests = [
    # Fan tests
    ("Fan ON (hot+humid)", fan_dir, "infer_fan_control.py", '{"temperature": 32, "humidity": 80}'),
    ("Fan OFF (cool+dry)", fan_dir, "infer_fan_control.py", '{"temperature": 24, "humidity": 50}'),
    ("Fan ON (very hot)", fan_dir, "infer_fan_control.py", '{"temperature": 35, "humidity": 60}'),
    ("Fan OFF (mild)", fan_dir, "infer_fan_control.py", '{"temperature": 26, "humidity": 55}'),
    # LED tests
    ("LED ON (dark occupied)", led_dir, "infer_led_control.py", '{"Light_Intensity": 50, "Temperature": 25, "PIR": 1, "Minute_Of_Day": 720}'),
    ("LED OFF (bright occupied)", led_dir, "infer_led_control.py", '{"Light_Intensity": 180, "Temperature": 25, "PIR": 1, "Minute_Of_Day": 720}'),
    ("LED ON (evening dark)", led_dir, "infer_led_control.py", '{"Light_Intensity": 20, "Temperature": 25, "PIR": 1, "Minute_Of_Day": 1200}'),
    ("LED OFF (deep night)", led_dir, "infer_led_control.py", '{"Light_Intensity": 5, "Temperature": 25, "PIR": 1, "Minute_Of_Day": 120}'),
]

print("=" * 60)
print("Testing Yolohome AI Models")
print("=" * 60)

for name, cwd, script, input_json in tests:
    result = subprocess.run(
        [python, script, input_json],
        capture_output=True, text=True, cwd=cwd,
        env={**os.environ, "PYTHONUTF8": "1"}
    )
    output = result.stdout.strip()
    status = "PASS" if result.returncode == 0 else "FAIL"
    print(f"  [{status}] {name:30s} => {output}")
    if result.returncode != 0:
        print(f"         ERROR: {result.stderr.strip()[:200]}")

print("\nDone!")
