"""
Training script untuk klasifikasi jenis sampah (organic / plastic / debris).
Dirancang untuk dijalankan di Google Colab (gratis, ada GPU) - training YOLOv8-cls
lokal di laptop tanpa GPU akan sangat lambat.

=== Cara pakai di Google Colab ===

1. Buat notebook baru di https://colab.research.google.com, aktifkan GPU:
   Runtime > Change runtime type > T4 GPU

2. Install ultralytics:
   !pip install ultralytics

3. Download dataset publik. Rekomendasi: Kaggle "Garbage Classification"
   (mostafaabla/garbage-classification, 12 kelas termasuk biological & plastic).
   Di Colab:
       !pip install kaggle
       # upload kaggle.json (API key dari https://www.kaggle.com/settings > Create New Token)
       from google.colab import files
       files.upload()  # pilih kaggle.json
       !mkdir -p ~/.kaggle && cp kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json
       !kaggle datasets download -d mostafaabla/garbage-classification
       !unzip -q garbage-classification.zip -d raw_dataset

4. Susun ulang jadi 3 kelas target (organic/plastic/debris) memakai mapping di bawah,
   lalu split train/val. Jalankan fungsi `prepare_dataset()` di bawah ini.

5. Jalankan training dengan `train()` di bawah.

6. Setelah selesai, ambil file `runs/classify/train/weights/best.pt`,
   rename jadi `waste_classifier.pt`, taruh di `model/waste/waste_classifier.pt`
   di repo ini (commit & push).

7. WAJIB: tambahkan lagi `ultralytics` ke backend/requirements.txt supaya
   backend bisa load model ini saat deploy (dihapus sebelumnya karena belum dipakai).
"""

import os
import shutil
import random

# Mapping dari kelas dataset publik ke 3 kelas target drain-eye.
# Sesuaikan kalau nama folder di dataset yang kamu download beda.
CLASS_MAPPING = {
    "biological": "organic",
    "plastic": "plastic",
    "trash": "debris",
    # kelas dataset lain (cardboard, glass, metal, paper, battery, shoes, clothes)
    # sengaja tidak dipakai karena tidak relevan dengan konteks sampah saluran air
}

TARGET_CLASSES = ["organic", "plastic", "debris"]


def prepare_dataset(raw_dir: str, output_dir: str, val_split: float = 0.2, seed: int = 42):
    """
    Susun ulang dataset mentah (folder per kelas asli) menjadi struktur
    yang dipakai Ultralytics YOLOv8-cls:

        output_dir/train/<class>/*.jpg
        output_dir/val/<class>/*.jpg
    """
    random.seed(seed)

    for split in ["train", "val"]:
        for cls in TARGET_CLASSES:
            os.makedirs(os.path.join(output_dir, split, cls), exist_ok=True)

    for raw_class, target_class in CLASS_MAPPING.items():
        src_dir = os.path.join(raw_dir, raw_class)
        if not os.path.isdir(src_dir):
            print(f"⚠️  Folder '{raw_class}' tidak ditemukan di {raw_dir}, dilewati")
            continue

        files = [f for f in os.listdir(src_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        random.shuffle(files)
        split_idx = int(len(files) * (1 - val_split))

        for i, fname in enumerate(files):
            split = "train" if i < split_idx else "val"
            shutil.copy(
                os.path.join(src_dir, fname),
                os.path.join(output_dir, split, target_class, fname),
            )

        print(f"{raw_class} -> {target_class}: {len(files)} gambar")

    print(f"\nDataset siap di: {output_dir}")


def train(dataset_dir: str, epochs: int = 30, imgsz: int = 224):
    """Fine-tune YOLOv8n-cls (paling kecil/cepat, cukup untuk 3 kelas)."""
    from ultralytics import YOLO

    model = YOLO("yolov8n-cls.pt")  # pretrained di ImageNet, auto-download
    model.train(data=dataset_dir, epochs=epochs, imgsz=imgsz)

    print("\nTraining selesai. Cek hasil di runs/classify/train/:")
    print("  - results.png       -> kurva loss/accuracy")
    print("  - confusion_matrix.png")
    print("  - weights/best.pt   -> model terbaik, ini yang di-deploy")


if __name__ == "__main__":
    # Contoh pemakaian (sesuaikan path):
    # prepare_dataset("raw_dataset/garbage_classification", "dataset")
    # train("dataset", epochs=30)
    pass
