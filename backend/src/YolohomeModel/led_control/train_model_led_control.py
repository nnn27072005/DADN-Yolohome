"""
Train Random Forest model for LED Control in Yolohome Smart Home.

Input features:
  - Light_Intensity (lux): Room light level
  - Temperature (°C): Room temperature
  - Humidity (%): Room humidity
  - Minute_Of_Day (0-1439): Current time as minutes since midnight

Target:
  - LED_On (0/1): Whether the LED should be ON

Output models saved to ./models/:
  - model_rf.pkl: Trained Random Forest classifier
  - scaler.pkl: StandardScaler fitted on training data
  - column_order.pkl: Feature column order
  - column_means.pkl: Feature means for handling missing values
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import warnings
warnings.filterwarnings("ignore")

def load_and_preprocess_data(path: str):
    df = pd.read_csv(path, low_memory=False)

    # Remove unnamed columns
    df = df.loc[:, ~df.columns.str.contains("Unnamed", case=False)]

    # Expected columns
    feature_cols = ['Light_Intensity', 'Temperature', 'Humidity', 'Minute_Of_Day']
    target_col = 'LED_On'

    # Ensure all columns exist
    for col in feature_cols + [target_col]:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # Convert to numeric
    for col in feature_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df.dropna()
    df[target_col] = df[target_col].astype(int)

    print(f"Dữ liệu sau xử lý: {df.shape[0]} dòng")
    print(f"  Light_Intensity range: {df['Light_Intensity'].min():.1f} - {df['Light_Intensity'].max():.1f} lux")
    print(f"  Temperature range:     {df['Temperature'].min():.1f} - {df['Temperature'].max():.1f} °C")
    print(f"  Humidity range:        {df['Humidity'].min():.1f} - {df['Humidity'].max():.1f} %")
    print(f"  Minute_Of_Day range:   {df['Minute_Of_Day'].min()} - {df['Minute_Of_Day'].max()}")
    print(f"  LED ON ratio:          {df[target_col].mean()*100:.1f}%")

    return df

def train_model(df: pd.DataFrame):
    feature_cols = ['Light_Intensity', 'Temperature', 'Humidity', 'Minute_Of_Day']
    X = df[feature_cols]
    y = df['LED_On']
    column_order = X.columns.tolist()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)

    print("\n--- Đánh giá mô hình trên tập test ---")
    y_pred = model.predict(X_test_scaled)
    print(classification_report(y_test, y_pred))

    train_acc = accuracy_score(y_train, model.predict(X_train_scaled))
    test_acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy trên tập train: {train_acc:.4f}")
    print(f"Accuracy trên tập test:  {test_acc:.4f}")

    scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
    print(f"Cross-validation accuracy: {scores.mean():.4f} (+/- {scores.std()*2:.4f})")

    # Feature importance
    print(f"\nFeature importance:")
    for feat, imp in zip(column_order, model.feature_importances_):
        print(f"  {feat}: {imp:.4f}")

    return model, scaler, column_order, X_train

def save_model(model, scaler, column_order, column_means):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    joblib.dump(model, os.path.join(models_dir, "model_rf.pkl"))
    joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))
    joblib.dump(column_order, os.path.join(models_dir, "column_order.pkl"))
    joblib.dump(column_means, os.path.join(models_dir, "column_means.pkl"))
    print(f"\nModels saved to: {models_dir}")


if __name__ == "__main__":
    print("=" * 50)
    print("Training LED Control Model for Yolohome")
    print("=" * 50)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "data", "smart_home_led_dataset.csv")

    df = load_and_preprocess_data(data_path)
    model, scaler, column_order, X_train = train_model(df)
    column_means = X_train.mean()
    save_model(model, scaler, column_order, column_means)
    print("\nDone!")
