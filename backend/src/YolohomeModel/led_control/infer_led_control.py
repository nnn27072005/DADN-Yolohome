"""
Inference script for LED Control in Yolohome Smart Home.

Usage:
  python infer_led_control.py '{"Light_Intensity": 50, "Temperature": 28, "Humidity": 75, "Minute_Of_Day": 720}'

Input (JSON):
  - Light_Intensity (lux): Room light level
  - Temperature (°C): Room temperature
  - Humidity (%): Room humidity
  - Minute_Of_Day (0-1439): Current time as minutes since midnight

Output:
  Prints 1 (ON) or 0 (OFF) to stdout
"""

import sys
import json
import joblib
import pandas as pd
import os
import traceback

sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(script_dir, "models")

try:
    model_path = os.path.join(models_dir, "model_rf.pkl")
    scaler_path = os.path.join(models_dir, "scaler.pkl")
    columns_path = os.path.join(models_dir, "column_order.pkl")
    means_path = os.path.join(models_dir, "column_means.pkl")

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    column_order = joblib.load(columns_path)

    if len(sys.argv) < 2:
        print("Error: Missing input JSON argument.", file=sys.stderr)
        sys.exit(1)

    input_json = sys.argv[1]
    input_dict = json.loads(input_json)

    input_df = pd.DataFrame([input_dict])

    for col in column_order:
        if col not in input_df.columns:
            print(f"Error: Missing required input column '{col}'.", file=sys.stderr)
            sys.exit(1)
        try:
            if pd.api.types.is_string_dtype(input_df[col]):
                input_df[col] = pd.to_numeric(input_df[col])
        except ValueError:
            print(
                f"Error: Could not convert column '{col}' value '{input_df[col].iloc[0]}' to numeric.",
                file=sys.stderr,
            )
            sys.exit(1)

    input_df = input_df[column_order]

    input_scaled = scaler.transform(input_df)

    prediction = model.predict(input_scaled)
    prediction_result = prediction[0]

    # LED model predicts 0 or 1
    print(prediction_result)

except FileNotFoundError as e:
    print(f"Error: File not found - {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input - {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
except KeyError as e:
    print(f"Error: Missing key in input data during processing - {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
except ValueError as e:
    print(f"Error: Data type/value error during processing - {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"An unexpected error occurred in Python script: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
