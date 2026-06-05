"""
Prepare UCI Appliances Energy Prediction for YoloHome LED control.

Source:
  https://archive.ics.uci.edu/dataset/374/appliances+energy+prediction

The raw dataset contains real household light energy usage in the `lights`
column. This script maps it to a binary LED target:
  - lights > 0: LED_On = 1
  - lights == 0: LED_On = 0

Because the original data still has more OFF than ON rows, the processed
training CSV is balanced by undersampling OFF rows. No synthetic rows are
generated.
"""

from pathlib import Path
from urllib.request import urlretrieve
import zipfile

import pandas as pd


RAW_URL = "https://archive.ics.uci.edu/static/public/374/appliances+energy+prediction.zip"


def prepare_uci_appliances_led_dataset(
    zip_path: Path,
    raw_csv_path: Path,
    output_path: Path,
    balanced_output_path: Path,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if not zip_path.exists():
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading UCI Appliances Energy Prediction from: {RAW_URL}")
        urlretrieve(RAW_URL, zip_path)

    if not raw_csv_path.exists():
        with zipfile.ZipFile(zip_path) as archive:
            with archive.open("energydata_complete.csv") as source:
                raw = pd.read_csv(source)
        raw.to_csv(raw_csv_path, index=False)
    else:
        raw = pd.read_csv(raw_csv_path)

    raw["date"] = pd.to_datetime(raw["date"], errors="coerce")
    prepared = pd.DataFrame(
        {
            "Temperature": raw["T1"],
            "Humidity": raw["RH_1"],
            "Minute_Of_Day": raw["date"].dt.hour * 60 + raw["date"].dt.minute,
            "LED_Energy_Wh": raw["lights"],
        }
    )
    prepared["LED_On"] = (prepared["LED_Energy_Wh"] > 0).astype(int)
    prepared = prepared.dropna()
    prepared = prepared[
        prepared["Temperature"].between(0, 50)
        & prepared["Humidity"].between(0, 100)
        & prepared["Minute_Of_Day"].between(0, 1439)
    ]

    off_rows = prepared[prepared["LED_On"] == 0]
    on_rows = prepared[prepared["LED_On"] == 1]
    off_sample = off_rows.sample(n=len(on_rows), random_state=seed)
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
    full_df, balanced_df = prepare_uci_appliances_led_dataset(
        zip_path=data_dir / "uci_appliances_energy_prediction.zip",
        raw_csv_path=data_dir / "uci_appliances_energy_complete.csv",
        output_path=data_dir / "uci_appliances_led_control_dataset.csv",
        balanced_output_path=data_dir / "uci_appliances_led_control_balanced.csv",
    )

    print("Full processed dataset")
    print(f"  Rows: {len(full_df)}")
    print(f"  LED ON ratio: {full_df['LED_On'].mean() * 100:.1f}%")
    print("Balanced training dataset")
    print(f"  Rows: {len(balanced_df)}")
    print(f"  LED ON ratio: {balanced_df['LED_On'].mean() * 100:.1f}%")
