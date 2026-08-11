import numpy as np
import os
import random
import json

from app.services import waste_service

# path model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SEVERITY_MODEL_PATH = os.path.join(BASE_DIR, "model", "severity", "severity_classifier.onnx")
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "model", "severity", "class_names.json")
INPUT_SIZE = 224

MODEL_AVAILABLE = False
session = None
class_names = {}

try:
    import onnxruntime as ort

    if os.path.exists(SEVERITY_MODEL_PATH) and os.path.exists(CLASS_NAMES_PATH):
        session = ort.InferenceSession(SEVERITY_MODEL_PATH, providers=["CPUExecutionProvider"])
        with open(CLASS_NAMES_PATH) as f:
            class_names = {int(k): v for k, v in json.load(f).items()}
        MODEL_AVAILABLE = True
        print(f"✅ Severity classifier (ONNX) loaded: {SEVERITY_MODEL_PATH}")
    else:
        print(f"⚠️  Severity classifier belum ada di {SEVERITY_MODEL_PATH} — pakai mode simulasi")
except ImportError:
    print("⚠️  onnxruntime belum terinstall — severity pakai mode simulasi")
except Exception as e:
    print(f"⚠️  Severity classifier load error: {e} — pakai mode simulasi")

SEVERITY_CLASSES_ORDER = ["clear", "partial", "blocked", "severely_blocked"]

# titik tengah rentang persentase tiap kelas — dipakai untuk hitung blockage_percentage
# sebagai expected value dari distribusi confidence model (bukan cuma kelas top-1)
CLASS_MIDPOINT = {
    "clear":            10.0,
    "partial":          35.0,
    "blocked":          62.5,
    "severely_blocked": 87.5,
}


def detect_blockage(image: np.ndarray) -> dict:
    """
    Deteksi tingkat sumbatan drainase dari gambar.

    Kalau model sudah ada -> pakai severity classifier (ONNX) yang sudah di-fine-tune.
    Kalau belum -> pakai simulasi untuk development/testing.

    Returns:
        dict dengan blockage_percentage, severity_class,
        waste_type, dan confidence_score
    """
    if MODEL_AVAILABLE:
        return _detect_with_model(image)
    else:
        return _detect_simulation(image)


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


def _softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def _detect_with_model(image: np.ndarray) -> dict:
    """Deteksi menggunakan severity classifier yang sudah ditraining."""
    try:
        input_tensor = _preprocess(image)
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_tensor})
        probs = outputs[0][0]
        if not np.isclose(probs.sum(), 1.0, atol=0.05):
            probs = _softmax(probs)

        top_idx = int(np.argmax(probs))
        confidence = float(probs[top_idx])
        severity = class_names.get(top_idx, "clear")

        # blockage % = expected value (confidence tiap kelas x titik tengah rentangnya)
        blockage_pct = sum(
            float(probs[idx]) * CLASS_MIDPOINT.get(class_names.get(idx, "clear"), 0.0)
            for idx in range(len(probs))
        )
        blockage_pct = min(100.0, max(0.0, blockage_pct))

        return {
            "blockage_percentage": round(blockage_pct, 1),
            "severity_class": severity,
            "waste_type": waste_service.predict_waste_type(image),
            "confidence_score": round(confidence, 3),
        }
    except Exception as e:
        print(f"Severity classification error: {e}")
        return _detect_simulation(image)


def _detect_simulation(image: np.ndarray) -> dict:
    """
    Mode simulasi — dipakai saat model belum ditraining.
    Menghasilkan hasil deteksi acak yang realistis untuk testing.
    """
    weights = [0.15, 0.35, 0.35, 0.15]
    severity_idx = random.choices(range(4), weights=weights)[0]
    severity = SEVERITY_CLASSES_ORDER[severity_idx]

    blockage_ranges = {
        "clear": (0, 20),
        "partial": (20, 50),
        "blocked": (50, 75),
        "severely_blocked": (75, 100)
    }

    low, high = blockage_ranges[severity]
    blockage_pct = round(random.uniform(low, high), 1)
    confidence = round(random.uniform(0.72, 0.97), 3)

    return {
        "blockage_percentage": blockage_pct,
        "severity_class": severity,
        "waste_type": waste_service.predict_waste_type(image),
        "confidence_score": confidence
    }
