"""
Prepare ASHRAE Global Thermal Comfort Database II for YoloHome fan control.

Source:
  https://github.com/CenterForTheBuiltEnvironment/ashrae-db-II

The ASHRAE dataset has a direct fan state column for a subset of rows:
  - fan = 0: fan is off
  - fan = 1: fan is on

Rows without a fan state are excluded so the trained model learns from a direct
fan label instead of a pseudo-label.
"""

from pathlib import Path
from urllib.request import urlretrieve

import pandas as pd


ASHRAE_URL = (
    "https://raw.githubusercontent.com/CenterForTheBuiltEnvironment/"
    "ashrae-db-II/master/v2.1.0/db_measurements_v2.1.0.csv.gz"
)


def prepare_ashrae_dataset(
    raw_path: Path,
    output_path: Path,
) -> pd.DataFrame:
    if not raw_path.exists():
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading ASHRAE DB II from: {ASHRAE_URL}")
        urlretrieve(ASHRAE_URL, raw_path)

    df = pd.read_csv(raw_path, compression="gzip", low_memory=False)

    prepared = df[["ta", "rh", "fan"]].copy()
    prepared = prepared.rename(
        columns={"ta": "temperature", "rh": "humidity", "fan": "fan_on"}
    )
    prepared = prepared.dropna()
    prepared = prepared[
        prepared["temperature"].between(10, 45)
        & prepared["humidity"].between(0, 100)
        & prepared["fan_on"].isin([0, 1])
    ]

    prepared["fan_on"] = prepared["fan_on"].astype(int)
    prepared = prepared[["temperature", "humidity", "fan_on"]]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prepared.to_csv(output_path, index=False)
    return prepared


if __name__ == "__main__":
    script_dir = Path(__file__).resolve().parent
    raw_path = script_dir / "data" / "ashrae_db_measurements_v2.1.0.csv.gz"
    output_path = script_dir / "data" / "ashrae_fan_control_dataset.csv"

    df = prepare_ashrae_dataset(raw_path, output_path)

    print(f"Saved to: {output_path}")
    print(f"Rows: {len(df)}")
    print(
        "Temperature range: "
        f"{df['temperature'].min():.1f} - {df['temperature'].max():.1f} C"
    )
    print(f"Humidity range: {df['humidity'].min():.1f} - {df['humidity'].max():.1f} %")
    print(f"Fan ON ratio: {df['fan_on'].mean() * 100:.1f}%")
