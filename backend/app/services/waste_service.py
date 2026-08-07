import numpy as np
import os
import random
import json

# path model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WASTE_MODEL_PATH = os.path.join(BASE_DIR, "model", "waste", "waste_classifier.onnx")
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "model", "waste", "class_names.json")
INPUT_SIZE = 224

MODEL_AVAILABLE = False
session = None
class_names = {}

try:
    import onnxruntime as ort

    if os.path.exists(WASTE_MODEL_PATH) and os.path.exists(CLASS_NAMES_PATH):
        session = ort.InferenceSession(WASTE_MODEL_PATH, providers=["CPUExecutionProvider"])
        with open(CLASS_NAMES_PATH) as f:
            class_names = {int(k): v for k, v in json.load(f).items()}
        MODEL_AVAILABLE = True
        print(f"✅ Waste classifier (ONNX) loaded: {WASTE_MODEL_PATH}")
    else:
        print(f"⚠️  Waste classifier belum ada di {WASTE_MODEL_PATH} — pakai mode simulasi")
except ImportError:
    print("⚠️  onnxruntime belum terinstall — waste_type pakai mode simulasi")
except Exception as e:
    print(f"⚠️  Waste classifier load error: {e} — pakai mode simulasi")

WASTE_TYPES = ["organic", "plastic", "debris"]

# kalau confidence prediksi rendah, dianggap campuran/tidak jelas dominasinya
MIXED_CONFIDENCE_THRESHOLD = 0.5


def predict_waste_type(image: np.ndarray) -> str:
    """
    Klasifikasi jenis sampah dominan dari gambar (atau crop area sumbatan).

    Kalau model sudah ada -> pakai YOLOv8-cls (ONNX) yang sudah di-fine-tune.
    Kalau belum -> pakai simulasi acak untuk development/testing.
    """
    if MODEL_AVAILABLE:
        return _predict_with_model(image)
    else:
        return random.choice(WASTE_TYPES + ["mixed"])


def _preprocess(image: np.ndarray) -> np.ndarray:
    """image sudah RGB ternormalisasi 0-1 (lihat image_preprocess.py) -> resize ke
    input size model, HWC -> CHW, tambah batch dimension."""
    from PIL import Image as PILImage

    img_uint8 = (image * 255).astype(np.uint8)
    img = PILImage.fromarray(img_uint8).resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.array(img).astype(np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)
    arr = np.expand_dims(arr, axis=0)
    return arr


def _predict_with_model(image: np.ndarray) -> str:
    try:
        input_tensor = _preprocess(image)
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_tensor})
        probs = outputs[0][0]

        top_idx = int(np.argmax(probs))
        confidence = float(probs[top_idx])

        if confidence < MIXED_CONFIDENCE_THRESHOLD:
            return "mixed"

        class_name = class_names.get(top_idx, "mixed")
        return class_name if class_name in WASTE_TYPES else "mixed"
    except Exception as e:
        print(f"Waste classification error: {e}")
        return random.choice(WASTE_TYPES + ["mixed"])
