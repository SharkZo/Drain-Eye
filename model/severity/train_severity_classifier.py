"""
Training script untuk klasifikasi tingkat sumbatan saluran air
(clear / partial / blocked / severely_blocked).
Dirancang untuk Google Colab (gratis, ada GPU).

=== Cara pakai di Google Colab ===

1. Runtime > Change runtime type > T4 GPU
2. !pip install ultralytics
3. Upload raw_dataset.zip (dari model/severity/raw_dataset.zip di repo ini):
       from google.colab import files
       files.upload()  # pilih raw_dataset.zip
       !unzip -q raw_dataset.zip -d raw_dataset_extracted
4. Jalankan prepare_dataset() lalu train() di bawah ini.
5. Ambil runs/classify/train/weights/best.pt, export ke ONNX,
   taruh di model/severity/severity_classifier.onnx + class_names.json
   (sama seperti alur waste classifier).
"""

import os
import shutil
import random

TARGET_CLASSES = ["clear", "partial", "blocked", "severely_blocked"]


def prepare_dataset(raw_dir: str, output_dir: str, val_split: float = 0.2, seed: int = 42):
    """
    raw_dir: folder hasil unzip, isinya langsung folder clear/partial/blocked/severely_blocked
             (raw_dir/raw_dataset/clear/*.jpg dst kalau struktur zip-nya ada folder raw_dataset)
    """
    random.seed(seed)

    for split in ["train", "val"]:
        for cls in TARGET_CLASSES:
            os.makedirs(os.path.join(output_dir, split, cls), exist_ok=True)

    for cls in TARGET_CLASSES:
        src_dir = os.path.join(raw_dir, cls)
        if not os.path.isdir(src_dir):
            print(f"⚠️  Folder '{cls}' tidak ditemukan di {raw_dir}, dilewati")
            continue

        files = [f for f in os.listdir(src_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        random.shuffle(files)
        split_idx = max(1, int(len(files) * (1 - val_split)))

        for i, fname in enumerate(files):
            split = "train" if i < split_idx else "val"
            shutil.copy(
                os.path.join(src_dir, fname),
                os.path.join(output_dir, split, cls, fname),
            )

        print(f"{cls}: {len(files)} gambar")

    print(f"\nDataset siap di: {output_dir}")


def train(dataset_dir: str, epochs: int = 40, imgsz: int = 224):
    """
    Fine-tune YOLOv8n-cls. Dataset kecil (~60-70 gambar) jadi epoch lebih banyak
    + augmentasi default ultralytics untuk membantu generalisasi.
    """
    from ultralytics import YOLO

    model = YOLO("yolov8n-cls.pt")
    model.train(data=dataset_dir, epochs=epochs, imgsz=imgsz, patience=15)

    print("\nTraining selesai. Cek hasil di runs/classify/train/:")
    print("  - results.png       -> kurva loss/accuracy")
    print("  - confusion_matrix.png")
    print("  - weights/best.pt   -> model terbaik")


if __name__ == "__main__":
    # prepare_dataset("raw_dataset_extracted/raw_dataset", "dataset")
    # train("dataset", epochs=40)
    pass
