"""
Inference script for Fan Control in YoloHome.

Usage:
  python infer_fan_control.py '{"temperature": 32, "humidity": 80}'

PowerShell:
  $json = '{\"temperature\": 32, \"humidity\": 80}'
  python infer_fan_control.py $json

Input JSON:
  - temperature (C): room air temperature
  - humidity (%): room relative humidity

Output:
  Prints "BẬT" (ON) or "TẮT" (OFF) to stdout.
"""

import json
import os
import sys
import traceback

import joblib
import pandas as pd


sys.stdout.reconfigure(encoding="utf-8")

script_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(script_dir, "models")

try:
    model_path = os.path.join(models_dir, "model_rf.pkl")
    scaler_path = os.path.join(models_dir, "scaler.pkl")
    column_order_path = os.path.join(models_dir, "column_order.pkl")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
    if not os.path.exists(column_order_path):
        raise FileNotFoundError(f"Column order file not found: {column_order_path}")

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    column_order = joblib.load(column_order_path)

    if len(sys.argv) < 2:
        print("Error: Missing input JSON argument.", file=sys.stderr)
        sys.exit(1)

    input_dict = json.loads(sys.argv[1])
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
                f"Error: Could not convert column '{col}' value "
                f"'{input_df[col].iloc[0]}' to numeric.",
                file=sys.stderr,
            )
            sys.exit(1)

    input_df = input_df[column_order]
    input_scaled = scaler.transform(input_df)
    prediction_result = model.predict(input_scaled)[0]

    output_result = "BẬT" if int(prediction_result) == 1 else "TẮT"
    print(output_result)

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
