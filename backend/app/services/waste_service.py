import numpy as np
import os
import random

# path model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WASTE_MODEL_PATH = os.path.join(BASE_DIR, "model", "waste", "waste_classifier.pt")
MODEL_AVAILABLE = False
model = None

try:
    from ultralytics import YOLO
    if os.path.exists(WASTE_MODEL_PATH):
        model = YOLO(WASTE_MODEL_PATH)
        MODEL_AVAILABLE = True
        print(f"✅ Waste classifier loaded: {WASTE_MODEL_PATH}")
    else:
        print(f"⚠️  Waste classifier belum ada di {WASTE_MODEL_PATH} — pakai mode simulasi")
except ImportError:
    print("⚠️  Ultralytics belum terinstall — waste_type pakai mode simulasi")
except Exception as e:
    print(f"⚠️  Waste classifier load error: {e} — pakai mode simulasi")

WASTE_TYPES = ["organic", "plastic", "debris"]

# kalau confidence prediksi rendah, dianggap campuran/tidak jelas dominasinya
MIXED_CONFIDENCE_THRESHOLD = 0.5


def predict_waste_type(image: np.ndarray) -> str:
    """
    Klasifikasi jenis sampah dominan dari gambar (atau crop area sumbatan).

    Kalau model sudah ada -> pakai YOLOv8-cls yang sudah di-fine-tune.
    Kalau belum -> pakai simulasi acak untuk development/testing.
    """
    if MODEL_AVAILABLE:
        return _predict_with_model(image)
    else:
        return random.choice(WASTE_TYPES + ["mixed"])


def _predict_with_model(image: np.ndarray) -> str:
    try:
        results = model(image)
        probs = results[0].probs
        confidence = float(probs.top1conf.item())

        if confidence < MIXED_CONFIDENCE_THRESHOLD:
            return "mixed"

        class_name = results[0].names[probs.top1]
        return class_name if class_name in WASTE_TYPES else "mixed"
    except Exception as e:
        print(f"Waste classification error: {e}")
        return random.choice(WASTE_TYPES + ["mixed"])
