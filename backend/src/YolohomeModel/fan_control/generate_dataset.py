"""
Generate synthetic Smart Home Fan Control dataset for Yolohome.
Context: Vietnamese indoor home environment.

Features:
  - temperature (°C): 22-42°C (Vietnamese indoor)
  - humidity (%): 45-98%

Target:
  - fan_on (0/1): Whether the fan should be turned ON

Logic:
  - ON if temperature > 30°C (nóng)
  - ON if temperature > 27°C AND humidity > 75%
  - ON if temperature > 28°C during night (22h-5h)
  - Add ~10% noise to make the model learn soft boundaries
"""

import pandas as pd
import numpy as np
import os

def generate_fan_dataset(n_samples=20000, seed=42):
    np.random.seed(seed)

    # Simulate 24h cycle
    hours = np.random.randint(0, 24, n_samples)
    months = np.random.randint(1, 13, n_samples)

    # Temperature: Vietnamese indoor (22-42°C)
    # Peak at ~14h (2PM), cooler at night
    base_temp = 28 + 4 * np.sin(2 * np.pi * (hours - 14) / 24)
    # Seasonal variation: hotter in summer (May-Aug)
    seasonal = 3 * np.sin(2 * np.pi * (months - 6) / 12)
    temperature = base_temp + seasonal + np.random.normal(0, 2, n_samples)
    temperature = np.clip(temperature, 22, 42)

    # Humidity: Vietnamese indoor (45-98%)
    # Higher in early morning, lower in afternoon
    humidity = 75 + 10 * np.sin(2 * np.pi * (hours - 6) / 24) + np.random.normal(0, 8, n_samples)
    humidity = np.clip(humidity, 45, 98)

    # Fan ON/OFF logic (realistic Vietnamese home)
    fan_on = (
        (temperature > 30) |                                      
        ((temperature > 27) & (humidity > 75)) |                    
        ((temperature > 28) & ((hours >= 22) | (hours <= 5)))      
    ).astype(int)

    # Add ~10% noise (flip some labels) to make boundaries softer
    noise_mask = np.random.random(n_samples) < 0.08
    fan_on[noise_mask] = 1 - fan_on[noise_mask]

    df = pd.DataFrame({
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'fan_on': fan_on
    })

    return df


if __name__ == "__main__":
    print("=" * 50)
    print("Generating Smart Home Fan Dataset for Yolohome")
    print("=" * 50)

    df = generate_fan_dataset()

    # Statistics
    print(f"\nDataset shape: {df.shape}")
    print(f"\nFeature ranges:")
    print(f"  Temperature: {df['temperature'].min():.1f} - {df['temperature'].max():.1f} °C")
    print(f"  Humidity:    {df['humidity'].min():.1f} - {df['humidity'].max():.1f} %")
    print(f"\nTarget distribution:")
    print(f"  Fan OFF (0): {(df['fan_on'] == 0).sum()} ({(df['fan_on'] == 0).mean()*100:.1f}%)")
    print(f"  Fan ON  (1): {(df['fan_on'] == 1).sum()} ({(df['fan_on'] == 1).mean()*100:.1f}%)")

    # Save
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "smart_home_fan_dataset.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved to: {output_path}")
    print("Done!")
