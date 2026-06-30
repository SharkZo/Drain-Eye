from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from datetime import datetime
import uuid
import os
import json

from app.models.schemas import UploadResponse
from app.services.yolo_service import detect_blockage
from app.utils.image_preprocess import preprocess_image

router = APIRouter()

UPLOAD_DIR = "uploads"
DB_FILE    = "detections.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def read_db():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        return json.load(f)

def write_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.post("/upload", response_model=UploadResponse)
async def upload_drainage_photo(
    file:          UploadFile       = File(...),
    latitude:      float            = Form(...),
    longitude:     float            = Form(...),
    kelurahan:     str              = Form(...),
    kecamatan:     str              = Form(...),
    reporter_note: Optional[str]    = Form(None),
    user_id:       Optional[str]    = Form(None),
    user_email:    Optional[str]    = Form(None)
):
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Gunakan JPG atau PNG.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file terlalu besar. Maksimal 5MB.")

    detection_id = str(uuid.uuid4())[:8].upper()
    file_ext     = file.filename.split(".")[-1]
    file_path    = os.path.join(UPLOAD_DIR, f"{detection_id}.{file_ext}")
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        processed = preprocess_image(file_path)
        result    = detect_blockage(processed)

        blockage_pct = result["blockage_percentage"]
        if blockage_pct < 25:
            risk_level = "low"
        elif blockage_pct < 50:
            risk_level = "moderate"
        elif blockage_pct < 75:
            risk_level = "high"
        else:
            risk_level = "critical"

        record = {
            "id":                   detection_id,
            "user_id":              user_id,
            "user_email":           user_email,
            "kelurahan":            kelurahan,
            "kecamatan":            kecamatan,
            "latitude":             latitude,
            "longitude":            longitude,
            "blockage_percentage":  blockage_pct,
            "severity_class":       result["severity_class"],
            "waste_type":           result.get("waste_type"),
            "confidence_score":     result.get("confidence_score"),
            "risk_level":           risk_level,
            "reporter_note":        reporter_note,
            "status":               "pending",
            "timestamp":            datetime.now().isoformat(),
        }

        db = read_db()
        db.insert(0, record)
        write_db(db)

        return UploadResponse(
            success=True,
            message=f"Foto berhasil diproses. Tingkat sumbatan: {blockage_pct:.1f}%",
            detection_id=detection_id,
            blockage_percentage=blockage_pct,
            severity_class=result["severity_class"],
            risk_level=risk_level
        )

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Gagal memproses gambar: {str(e)}")


@router.get("/history")
def get_history(limit: int = 50, user_id: Optional[str] = None):
    """
    Ambil riwayat deteksi.
    Kalau user_id diisi → hanya laporan milik user itu (untuk warga).
    Kalau kosong → semua laporan (untuk DLH).
    """
    db = read_db()
    if user_id:
        db = [r for r in db if r.get("user_id") == user_id]
    return {
        "total": len(db),
        "data":  db[:limit]
    }


@router.get("/history/{kelurahan}")
def get_history_by_kelurahan(kelurahan: str, limit: int = 20):
    db      = read_db()
    filtered = [r for r in db if r["kelurahan"].lower() == kelurahan.lower()]
    return {
        "kelurahan": kelurahan,
        "total":     len(filtered),
        "data":      filtered[:limit]
    }


@router.get("/stats")
def get_stats():
    db = read_db()
    return {
        "total_detections_today": len(db),
        "severely_blocked": len([r for r in db if r["severity_class"] == "severely_blocked"]),
        "blocked":          len([r for r in db if r["severity_class"] == "blocked"]),
        "partial":          len([r for r in db if r["severity_class"] == "partial"]),
        "clear":            len([r for r in db if r["severity_class"] == "clear"]),
        "last_updated":     datetime.now().isoformat()
    }


@router.patch("/history/{detection_id}/handled")
def mark_as_handled(detection_id: str):
    db = read_db()
    for record in db:
        if record["id"] == detection_id:
            record["status"] = "handled"
            write_db(db)
            return {"success": True, "message": f"Laporan {detection_id} ditandai sebagai ditangani"}
    raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")