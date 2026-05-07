"""
Train Random Forest model for Fan Control in Yolohome Smart Home.

Input features:
  - temperature (°C): Room temperature
  - humidity (%): Room humidity

Target:
  - fan_on (0/1): Whether the fan should be ON

Output models saved to ./models/:
  - model_rf.pkl: Trained Random Forest classifier
  - scaler.pkl: StandardScaler fitted on training data
  - column_order.pkl: Feature column order
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
    df = df[['temperature', 'humidity', 'fan_on']].dropna()
    df['fan_on'] = df['fan_on'].astype(int)
    print(f"Dữ liệu sau xử lý: {df.shape[0]} dòng")
    print(f"  Temperature range: {df['temperature'].min():.1f} - {df['temperature'].max():.1f} °C")
    print(f"  Humidity range:    {df['humidity'].min():.1f} - {df['humidity'].max():.1f} %")
    print(f"  Fan ON ratio:      {df['fan_on'].mean()*100:.1f}%")
    return df

def train_model(df: pd.DataFrame):
    X = df[['temperature', 'humidity']]
    y = df['fan_on']
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

    return model, scaler, column_order

def save_model(model, scaler, column_order):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    joblib.dump(model, os.path.join(models_dir, "model_rf.pkl"))
    joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))
    joblib.dump(column_order, os.path.join(models_dir, "column_order.pkl"))
    print(f"\nModels saved to: {models_dir}")


if __name__ == "__main__":
    print("=" * 50)
    print("Training Fan Control Model for Yolohome")
    print("=" * 50)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "data", "smart_home_fan_dataset.csv")

    df = load_and_preprocess_data(data_path)
    model, scaler, column_order = train_model(df)
    save_model(model, scaler, column_order)
    print("\nDone!")
