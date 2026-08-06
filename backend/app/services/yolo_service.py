import numpy as np
import random
import os


# ── Cek apakah model YOLOv8 tersedia ──
# Saat model belum ditraining, sistem pakai mode simulasi
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "model", "yolov8", "drain_eye_model.pt")
MODEL_AVAILABLE = False

try:
    from ultralytics import YOLO
    if os.path.exists(YOLO_MODEL_PATH):
        model = YOLO(YOLO_MODEL_PATH)
        MODEL_AVAILABLE = True
        print(f"✅ YOLOv8 model loaded: {YOLO_MODEL_PATH}")
    else:
        print(f"⚠️  Model belum ada di {YOLO_MODEL_PATH} — pakai mode simulasi")
except ImportError:
    print("⚠️  Ultralytics belum terinstall — pakai mode simulasi")


# mapping class index ke label
SEVERITY_CLASSES = {
    0: "clear",
    1: "partial",
    2: "blocked",
    3: "severely_blocked"
}

WASTE_TYPES = ["organic", "plastic", "debris", "mixed"]


def detect_blockage(image: np.ndarray) -> dict:
    """
    Deteksi tingkat sumbatan drainase dari gambar.

    Kalau model sudah ada → pakai YOLOv8 sungguhan.
    Kalau belum → pakai simulasi untuk development/testing.

    Returns:
        dict dengan blockage_percentage, severity_class,
        waste_type, dan confidence_score
    """

    if MODEL_AVAILABLE:
        return _detect_with_yolo(image)
    else:
        return _detect_simulation(image)


def _detect_with_yolo(image: np.ndarray) -> dict:
    """Deteksi menggunakan model YOLOv8 yang sudah ditraining."""
    results = model(image)

    if len(results) == 0 or len(results[0].boxes) == 0:
        return {
            "blockage_percentage": 0.0,
            "severity_class": "clear",
            "waste_type": None,
            "confidence_score": 1.0
        }

    # ambil deteksi dengan confidence tertinggi -> label kelas severity
    boxes = results[0].boxes
    best_idx = boxes.conf.argmax().item()
    best_class = int(boxes.cls[best_idx].item())
    confidence = float(boxes.conf[best_idx].item())
    severity = SEVERITY_CLASSES.get(best_class, "clear")

    # blockage % = rasio luas seluruh box terdeteksi terhadap luas foto
    # (proxy seberapa besar area saluran yang tertutup sumbatan/sampah)
    img_h, img_w = image.shape[:2]
    image_area = img_h * img_w
    xyxy = boxes.xyxy.cpu().numpy()
    box_areas = (xyxy[:, 2] - xyxy[:, 0]) * (xyxy[:, 3] - xyxy[:, 1])
    coverage_pct = min(100.0, float(box_areas.sum()) / image_area * 100)

    return {
        "blockage_percentage": round(coverage_pct, 1),
        "severity_class": severity,
        "waste_type": random.choice(WASTE_TYPES),
        "confidence_score": round(confidence, 3)
    }


def _detect_simulation(image: np.ndarray) -> dict:
    """
    Mode simulasi — dipakai saat model belum ditraining.
    Menghasilkan hasil deteksi acak yang realistis untuk testing.
    """
    # simulasi distribusi yang realistis
    # mayoritas partial/blocked, sedikit clear/severely
    weights = [0.15, 0.35, 0.35, 0.15]
    severity_idx = random.choices(range(4), weights=weights)[0]
    severity = SEVERITY_CLASSES[severity_idx]

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
        "waste_type": random.choice(WASTE_TYPES),
        "confidence_score": confidence
    }
