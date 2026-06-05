"""
Train Random Forest model for Fan Control in YoloHome.

Input features:
  - temperature (C): room air temperature
  - humidity (%): room relative humidity

Target:
  - fan_on (0/1): whether the fan should be ON

The default dataset is derived from ASHRAE Global Thermal Comfort Database II.
See prepare_ashrae_dataset.py for the thermal-sensation mapping.
"""

import warnings
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

from prepare_ashrae_dataset import prepare_ashrae_dataset


warnings.filterwarnings("ignore")


def load_and_preprocess_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    df = df[["temperature", "humidity", "fan_on"]].dropna()
    df["fan_on"] = df["fan_on"].astype(int)

    print(f"Processed rows: {df.shape[0]}")
    print(
        "  Temperature range: "
        f"{df['temperature'].min():.1f} - {df['temperature'].max():.1f} C"
    )
    print(f"  Humidity range:    {df['humidity'].min():.1f} - {df['humidity'].max():.1f} %")
    print(f"  Fan ON ratio:      {df['fan_on'].mean() * 100:.1f}%")
    return df


def train_model(df: pd.DataFrame):
    X = df[["temperature", "humidity"]]
    y = df["fan_on"]
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

    return model, scaler, column_order


def save_model(model, scaler, column_order):
    script_dir = Path(__file__).resolve().parent
    models_dir = script_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, models_dir / "model_rf.pkl")
    joblib.dump(scaler, models_dir / "scaler.pkl")
    joblib.dump(column_order, models_dir / "column_order.pkl")
    print(f"\nModels saved to: {models_dir}")


if __name__ == "__main__":
    print("=" * 50)
    print("Training Fan Control Model for YoloHome")
    print("=" * 50)

    script_dir = Path(__file__).resolve().parent
    data_dir = script_dir / "data"
    data_path = data_dir / "ashrae_fan_control_dataset.csv"

    if not data_path.exists():
        prepare_ashrae_dataset(
            raw_path=data_dir / "ashrae_db_measurements_v2.1.0.csv.gz",
            output_path=data_path,
        )

    df = load_and_preprocess_data(data_path)
    model, scaler, column_order = train_model(df)
    save_model(model, scaler, column_order)
    print("\nDone!")
