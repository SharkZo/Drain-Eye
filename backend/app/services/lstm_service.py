import numpy as np
import os
import pickle
import random

# path model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODEL_PATH   = os.path.join(BASE_DIR, "model", "lstm", "lstm_flood_risk_model.h5")
SCALER_X_PATH = os.path.join(BASE_DIR, "model", "lstm", "scaler_X.pkl")
SCALER_Y_PATH = os.path.join(BASE_DIR, "model", "lstm", "scaler_y.pkl")

MODEL_AVAILABLE = False
model = None
scaler_X = None
scaler_y = None

try:
    import tensorflow as tf
    import pickle

    if os.path.exists(MODEL_PATH):
        model    = tf.keras.models.load_model(MODEL_PATH, compile=False)
        with open(SCALER_X_PATH, 'rb') as f:
            scaler_X = pickle.load(f)
        with open(SCALER_Y_PATH, 'rb') as f:
            scaler_y = pickle.load(f)
        MODEL_AVAILABLE = True
        print(f"✅ LSTM model loaded: {MODEL_PATH}")
    else:
        print(f"⚠️  LSTM model belum ada — pakai mode simulasi")
except Exception as e:
    print(f"⚠️  LSTM load error: {e} — pakai mode simulasi")

KELURAHAN_LIST = [
    'Pluit', 'Koja', 'Tambora', 'Cilincing', 'Palmerah',
    'Penjaringan', 'Mampang', 'Senen', 'Tebet', 'Pasar Minggu'
]

def get_risk_level(score: float) -> str:
    if score >= 75: return "critical"
    if score >= 50: return "high"
    if score >= 25: return "moderate"
    return "low"


def predict_flood_risk(
    kelurahan: str,
    blockage_score: float,
    rainfall_mm: float = 10.0,
    is_rainy_season: int = 1,
    is_event_day: int = 0
) -> dict:
    """
    Prediksi flood risk score untuk satu kelurahan.
    Kalau model tersedia → pakai LSTM.
    Kalau tidak → pakai simulasi realistis.
    """
    if MODEL_AVAILABLE:
        return _predict_with_lstm(kelurahan, blockage_score, rainfall_mm, is_rainy_season, is_event_day)
    else:
        return _predict_simulation(kelurahan, blockage_score, rainfall_mm)


def _predict_with_lstm(kelurahan, blockage_score, rainfall_mm, is_rainy_season, is_event_day):
    """Prediksi menggunakan model LSTM."""
    try:
        kelurahan_id = KELURAHAN_LIST.index(kelurahan) if kelurahan in KELURAHAN_LIST else 0

        # buat sequence 7 hari (simplified — pakai nilai yang sama untuk semua hari)
        single_input = [rainfall_mm, blockage_score, is_rainy_season, is_event_day, kelurahan_id]
        sequence = np.array([single_input] * 7).reshape(1, 7, 5)

        # normalisasi
        sequence_flat = sequence.reshape(-1, 5)
        sequence_scaled = scaler_X.transform(sequence_flat).reshape(1, 7, 5)

        # prediksi
        pred_scaled = model.predict(sequence_scaled, verbose=0)
        pred_actual = scaler_y.inverse_transform(pred_scaled)[0][0]
        risk_score  = float(np.clip(pred_actual, 0, 100))

        return {
            "kelurahan":    kelurahan,
            "risk_score":   round(risk_score, 1),
            "risk_level":   get_risk_level(risk_score),
            "rainfall_mm":  rainfall_mm,
            "blockage_score": blockage_score,
            "model":        "lstm"
        }
    except Exception as e:
        print(f"LSTM prediction error: {e}")
        return _predict_simulation(kelurahan, blockage_score, rainfall_mm)


def _predict_simulation(kelurahan, blockage_score, rainfall_mm):
    """Simulasi prediksi flood risk."""
    risk_score = min(100, max(0,
        0.4 * blockage_score +
        0.3 * min(rainfall_mm * 1.2, 40) +
        0.2 * 15 +
        random.uniform(-5, 5)
    ))

    return {
        "kelurahan":    kelurahan,
        "risk_score":   round(risk_score, 1),
        "risk_level":   get_risk_level(risk_score),
        "rainfall_mm":  rainfall_mm,
        "blockage_score": blockage_score,
        "model":        "simulation"
    }


def predict_all_kelurahan(blockage_data: dict) -> list:
    """
    Prediksi risk score untuk semua kelurahan.
    blockage_data: dict {kelurahan: blockage_score}
    """
    results = []
    for kelurahan in KELURAHAN_LIST:
        blockage = blockage_data.get(kelurahan, random.uniform(20, 60))
        result   = predict_flood_risk(kelurahan, blockage)
        results.append(result)

    # sort by risk score descending
    results.sort(key=lambda x: x['risk_score'], reverse=True)
    return results
