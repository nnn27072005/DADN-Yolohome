"""
Train Random Forest model for LED Control in YoloHome.

Default dataset:
  UCI Room Occupancy Estimation, prepared by
  prepare_room_occupancy_led_dataset.py.

Input features used by the trained model:
  - Light_Intensity (lux)
  - Temperature (C)
  - PIR (0/1)
  - Minute_Of_Day (0-1439)

Target:
  - LED_On (0/1): derived from occupancy, lux, and time of day
"""

import warnings
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

from prepare_room_occupancy_led_dataset import prepare_room_occupancy_led_dataset


warnings.filterwarnings("ignore")

FEATURE_COLS = ["Light_Intensity", "Temperature", "PIR", "Minute_Of_Day"]
TARGET_COL = "LED_On"


def load_and_preprocess_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    df = df.loc[:, ~df.columns.str.contains("Unnamed", case=False)]

    for col in FEATURE_COLS + [TARGET_COL]:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    for col in FEATURE_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df[TARGET_COL] = pd.to_numeric(df[TARGET_COL], errors="coerce")
    df = df.dropna(subset=FEATURE_COLS + [TARGET_COL])
    df[TARGET_COL] = df[TARGET_COL].astype(int)

    print(f"Processed rows: {df.shape[0]}")
    print(
        "  Light_Intensity range: "
        f"{df['Light_Intensity'].min():.1f} - {df['Light_Intensity'].max():.1f} lux"
    )
    print(
        "  Temperature range:     "
        f"{df['Temperature'].min():.1f} - {df['Temperature'].max():.1f} C"
    )
    print(f"  PIR ratio:             {df['PIR'].mean() * 100:.1f}%")
    print(f"  Minute_Of_Day range:   {df['Minute_Of_Day'].min()} - {df['Minute_Of_Day'].max()}")
    print(f"  LED ON ratio:          {df[TARGET_COL].mean() * 100:.1f}%")

    return df


def train_model(df: pd.DataFrame):
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    column_order = X.columns.tolist()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train_scaled, y_train)

    print("\n--- Test set evaluation ---")
    y_pred = model.predict(X_test_scaled)
    print(classification_report(y_test, y_pred))

    train_acc = accuracy_score(y_train, model.predict(X_train_scaled))
    test_acc = accuracy_score(y_test, y_pred)
    print(f"Train accuracy: {train_acc:.4f}")
    print(f"Test accuracy:  {test_acc:.4f}")

    scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
    print(f"Cross-validation accuracy: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")

    print("\nFeature importance:")
    for feat, imp in zip(column_order, model.feature_importances_):
        print(f"  {feat}: {imp:.4f}")

    return model, scaler, column_order, X_train


def save_model(model, scaler, column_order, column_means):
    script_dir = Path(__file__).resolve().parent
    models_dir = script_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, models_dir / "model_rf.pkl")
    joblib.dump(scaler, models_dir / "scaler.pkl")
    joblib.dump(column_order, models_dir / "column_order.pkl")
    joblib.dump(column_means, models_dir / "column_means.pkl")
    print(f"\nModels saved to: {models_dir}")


if __name__ == "__main__":
    print("=" * 50)
    print("Training LED Control Model for YoloHome")
    print("=" * 50)

    script_dir = Path(__file__).resolve().parent
    data_dir = script_dir / "data"
    data_path = data_dir / "room_occupancy_led_control_balanced.csv"

    if not data_path.exists():
        prepare_room_occupancy_led_dataset(
            zip_path=data_dir / "room_occupancy_estimation.zip",
            raw_csv_path=data_dir / "room_occupancy_estimation.csv",
            output_path=data_dir / "room_occupancy_led_control_dataset.csv",
            balanced_output_path=data_path,
        )

    df = load_and_preprocess_data(data_path)
    model, scaler, column_order, X_train = train_model(df)
    save_model(model, scaler, column_order, X_train.mean())
    print("\nDone!")
