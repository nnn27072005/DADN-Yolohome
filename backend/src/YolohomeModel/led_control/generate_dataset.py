"""
Generate synthetic Smart Home LED Control dataset for Yolohome.
Context: Vietnamese indoor home environment.

Features:
  - Light_Intensity (lux): 0-800 lux (indoor)
  - Temperature (°C): 22-42°C
  - Humidity (%): 45-98%
  - Minute_Of_Day: 0-1439 (0:00 to 23:59)

Target:
  - LED_On (0/1): Whether the LED should be turned ON

Logic:
  - ON if light < 150 lux during daytime (6h-22h)
  - ON if light < 50 lux during evening (18h-23h)
  - OFF during deep night (0h-5h) regardless of light (sleeping)
  - OFF if natural light is sufficient (> 300 lux)
  - Add ~8% noise for softer boundaries
"""

import pandas as pd
import numpy as np
import os

def generate_led_dataset(n_samples=20000, seed=42):
    np.random.seed(seed)

    # Time simulation
    hours = np.random.randint(0, 24, n_samples)
    minutes = np.random.randint(0, 60, n_samples)
    minute_of_day = hours * 60 + minutes

    # Light Intensity (lux) - indoor Vietnamese home
    # Natural light follows a bell curve peaking around noon
    # Nighttime: near 0 lux
    light_base = np.where(
        (hours >= 6) & (hours <= 18),
        400 * np.sin(np.pi * (hours - 6) / 12),  # Daytime: 0-400 lux base
        np.random.uniform(0, 10, n_samples)        # Night: 0-10 lux
    )

    # Weather variation: cloudy/rainy days reduce light
    cloudy = np.random.choice([0, 1], n_samples, p=[0.55, 0.45])  # 45% cloudy (VN rainy season)
    light = light_base * (1 - 0.6 * cloudy) + np.random.normal(0, 30, n_samples)
    light = np.clip(light, 0, 800)

    # Temperature: Vietnamese indoor (22-42°C)
    base_temp = 28 + 4 * np.sin(2 * np.pi * (hours - 14) / 24)
    temperature = base_temp + np.random.normal(0, 2, n_samples)
    temperature = np.clip(temperature, 22, 42)

    # Humidity: Vietnamese indoor (45-98%)
    humidity = 75 + 10 * np.sin(2 * np.pi * (hours - 6) / 24) + np.random.normal(0, 8, n_samples)
    humidity = np.clip(humidity, 45, 98)

    # LED ON/OFF logic (realistic smart home)
    is_daytime = (hours >= 6) & (hours <= 22)
    is_evening = (hours >= 18) & (hours <= 23)
    is_deep_night = (hours >= 0) & (hours < 5)

    led_on = np.zeros(n_samples, dtype=int)

    # ON: Tối ban ngày (thiếu sáng tự nhiên) → bật đèn
    led_on[(light < 150) & is_daytime] = 1

    # ON: Buổi tối → bật đèn trừ khi ánh sáng tự nhiên còn đủ
    led_on[(light < 80) & is_evening] = 1

    # OFF: Đêm khuya (ngủ) → tắt đèn
    led_on[is_deep_night] = 0

    # OFF: Ánh sáng tự nhiên đủ → tắt đèn
    led_on[light > 300] = 0

    # Add ~8% noise
    noise_mask = np.random.random(n_samples) < 0.08
    led_on[noise_mask] = 1 - led_on[noise_mask]

    df = pd.DataFrame({
        'Light_Intensity': np.round(light, 1),
        'Temperature': np.round(temperature, 1),
        'Humidity': np.round(humidity, 1),
        'Minute_Of_Day': minute_of_day,
        'LED_On': led_on
    })

    return df


if __name__ == "__main__":
    print("=" * 50)
    print("Generating Smart Home LED Dataset for Yolohome")
    print("=" * 50)

    df = generate_led_dataset()

    # Statistics
    print(f"\nDataset shape: {df.shape}")
    print(f"\nFeature ranges:")
    print(f"  Light_Intensity: {df['Light_Intensity'].min():.1f} - {df['Light_Intensity'].max():.1f} lux")
    print(f"  Temperature:     {df['Temperature'].min():.1f} - {df['Temperature'].max():.1f} °C")
    print(f"  Humidity:        {df['Humidity'].min():.1f} - {df['Humidity'].max():.1f} %")
    print(f"  Minute_Of_Day:   {df['Minute_Of_Day'].min()} - {df['Minute_Of_Day'].max()}")
    print(f"\nTarget distribution:")
    print(f"  LED OFF (0): {(df['LED_On'] == 0).sum()} ({(df['LED_On'] == 0).mean()*100:.1f}%)")
    print(f"  LED ON  (1): {(df['LED_On'] == 1).sum()} ({(df['LED_On'] == 1).mean()*100:.1f}%)")

    # Save
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "smart_home_led_dataset.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved to: {output_path}")
    print("Done!")
