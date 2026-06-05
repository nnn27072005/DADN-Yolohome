"""
Prepare UCI Room Occupancy Estimation for YoloHome LED control.

Source:
  https://archive.ics.uci.edu/dataset/864/room+occupancy+estimation

The dataset contains real room sensor values:
  - S1_Light..S4_Light in lux
  - S1_Temp..S4_Temp in Celsius
  - S6_PIR, S7_PIR as binary motion signals
  - Room_Occupancy_Count as ground truth

It does not contain an explicit LED state, so this script derives a control
target from practical lighting automation logic:
  LED_On = occupied and dark enough and not deep-night.
"""

from pathlib import Path
from urllib.request import urlretrieve
import zipfile

import pandas as pd


RAW_URL = "https://archive.ics.uci.edu/static/public/864/room+occupancy+estimation.zip"
LIGHT_THRESHOLD_LUX = 100
DEEP_NIGHT_START = 0
DEEP_NIGHT_END = 5 * 60


def prepare_room_occupancy_led_dataset(
    zip_path: Path,
    raw_csv_path: Path,
    output_path: Path,
    balanced_output_path: Path,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if not zip_path.exists():
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading UCI Room Occupancy Estimation from: {RAW_URL}")
        urlretrieve(RAW_URL, zip_path)

    if not raw_csv_path.exists():
        with zipfile.ZipFile(zip_path) as archive:
            with archive.open("Occupancy_Estimation.csv") as source:
                raw = pd.read_csv(source)
        raw.to_csv(raw_csv_path, index=False)
    else:
        raw = pd.read_csv(raw_csv_path)

    timestamp = pd.to_datetime(
        raw["Date"].astype(str) + " " + raw["Time"].astype(str),
        errors="coerce",
    )

    prepared = pd.DataFrame(
        {
            "Light_Intensity": raw[["S1_Light", "S2_Light", "S3_Light", "S4_Light"]].mean(axis=1),
            "Temperature": raw[["S1_Temp", "S2_Temp", "S3_Temp", "S4_Temp"]].mean(axis=1),
            "PIR": raw[["S6_PIR", "S7_PIR"]].max(axis=1),
            "Minute_Of_Day": timestamp.dt.hour * 60 + timestamp.dt.minute,
            "Room_Occupancy_Count": raw["Room_Occupancy_Count"],
        }
    )

    occupied = prepared["Room_Occupancy_Count"] > 0
    dark_enough = prepared["Light_Intensity"] < LIGHT_THRESHOLD_LUX
    active_hours = ~prepared["Minute_Of_Day"].between(
        DEEP_NIGHT_START,
        DEEP_NIGHT_END - 1,
    )
    prepared["LED_On"] = (occupied & dark_enough & active_hours).astype(int)

    prepared = prepared.dropna()
    prepared = prepared[
        prepared["Light_Intensity"].between(0, 2000)
        & prepared["Temperature"].between(0, 50)
        & prepared["PIR"].isin([0, 1])
        & prepared["Minute_Of_Day"].between(0, 1439)
    ]

    on_rows = prepared[prepared["LED_On"] == 1]
    off_rows = prepared[prepared["LED_On"] == 0]
    if len(on_rows) == 0:
        raise ValueError("Prepared dataset has no LED_On=1 rows; adjust label thresholds.")

    off_sample = off_rows.sample(n=min(len(off_rows), len(on_rows)), random_state=seed)
    balanced = (
        pd.concat([on_rows, off_sample], ignore_index=True)
        .sample(frac=1, random_state=seed)
        .reset_index(drop=True)
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_csv(output_path, index=False)
    balanced.to_csv(balanced_output_path, index=False)
    return prepared, balanced


if __name__ == "__main__":
    script_dir = Path(__file__).resolve().parent
    data_dir = script_dir / "data"
    full_df, balanced_df = prepare_room_occupancy_led_dataset(
        zip_path=data_dir / "room_occupancy_estimation.zip",
        raw_csv_path=data_dir / "room_occupancy_estimation.csv",
        output_path=data_dir / "room_occupancy_led_control_dataset.csv",
        balanced_output_path=data_dir / "room_occupancy_led_control_balanced.csv",
    )

    print("Full processed dataset")
    print(f"  Rows: {len(full_df)}")
    print(f"  LED ON ratio: {full_df['LED_On'].mean() * 100:.1f}%")
    print("Balanced training dataset")
    print(f"  Rows: {len(balanced_df)}")
    print(f"  LED ON ratio: {balanced_df['LED_On'].mean() * 100:.1f}%")
