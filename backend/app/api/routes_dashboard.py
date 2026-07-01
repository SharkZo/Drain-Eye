from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import json
import os

from app.models.schemas import (
    DashboardSummary,
    FloodRiskScore,
    AlertNotification,
    MaintenanceTask,
)
from app.services.lstm_service import predict_all_kelurahan

router = APIRouter()
WIB = timezone(timedelta(hours=7))

# File ini sama persis dengan yang dipakai routes_detection.py
DETECTION_DB_FILE = "detections.json"

# lstm_service.py tidak menyimpan kecamatan, jadi dipetakan manual di sini
KELURAHAN_KECAMATAN = {
    "Pluit":         "Penjaringan",
    "Koja":          "Koja",
    "Tambora":       "Tambora",
    "Cilincing":     "Cilincing",
    "Palmerah":      "Palmerah",
    "Penjaringan":   "Penjaringan",
    "Mampang":       "Mampang Prapatan",
    "Senen":         "Senen",
    "Tebet":         "Tebet",
    "Pasar Minggu":  "Pasar Minggu",
}


def read_detections():
    if not os.path.exists(DETECTION_DB_FILE):
        return []
    with open(DETECTION_DB_FILE, "r") as f:
        return json.load(f)


def detection_stats_per_kelurahan(detections, kelurahan):
    matches = [d for d in detections if d.get("kelurahan") == kelurahan]
    total_points = len([d for d in matches if d.get("status") != "handled"])
    avg_pct = (
        sum(d.get("blockage_percentage", 0) for d in matches) / len(matches)
        if matches else 0.0
    )
    return total_points, round(avg_pct, 1)


@router.get("/")
def dashboard_root():
    return {"module": "dashboard", "status": "ready"}


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary():
    detections = read_detections()
    now = datetime.now(WIB)
    today_str = now.strftime("%Y-%m-%d")

    # ── Metric cards ─────────────────────────────────────────
    total_active_blockages = len(
        [d for d in detections if d.get("status") != "handled"]
    )
    total_completed_today = len(
        [
            d for d in detections
            if d.get("status") == "handled"
            and str(d.get("timestamp", "")).startswith(today_str)
        ]
    )
    total_citizen_reports = len(detections)

    # ── Risk score per kelurahan (dari LSTM service) ────────
    # Kirim rata-rata blockage asli per kelurahan supaya prediksi tidak pakai angka random
    blockage_input = {}
    for k in KELURAHAN_KECAMATAN:
        _, avg = detection_stats_per_kelurahan(detections, k)
        if avg > 0:
            blockage_input[k] = avg

    raw_risk = predict_all_kelurahan(blockage_input)
    risk_scores = []
    for r in raw_risk:
        kelurahan = r.get("kelurahan", "-")
        total_points, avg_pct = detection_stats_per_kelurahan(detections, kelurahan)
        risk_scores.append(
            FloodRiskScore(
                kelurahan=kelurahan,
                kecamatan=KELURAHAN_KECAMATAN.get(kelurahan, "-"),
                risk_score=r.get("risk_score", 0),
                risk_level=r.get("risk_level", "low"),
                total_blockage_points=total_points,
                avg_blockage_percentage=avg_pct,
                rainfall_forecast_mm=r.get("rainfall_mm", 0),
                last_updated=now,
            )
        )

    total_high_risk_areas = len(
        [r for r in risk_scores if r.risk_level in ("high", "critical")]
    )

    # ── Alert otomatis — diturunkan dari risk score tinggi/kritis ──
    active_alerts = [
        AlertNotification(
            alert_id=f"ALERT-{r.kelurahan.upper().replace(' ', '-')}",
            kelurahan=r.kelurahan,
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            message=f"Risiko {r.risk_level} — skor {r.risk_score:.0f}/100",
            triggered_at=now,
            is_acknowledged=False,
        )
        for r in risk_scores
        if r.risk_level in ("high", "critical")
    ]

    # ── Antrian maintenance — diturunkan dari laporan warga yang belum ditangani ──
    pending_high_priority = [
        d for d in detections
        if d.get("status") == "pending" and d.get("risk_level") in ("high", "critical")
    ]
    maintenance_queue = [
        MaintenanceTask(
            task_id=d["id"],
            priority=1 if d.get("risk_level") == "critical" else 2,
            kelurahan=d.get("kelurahan", "-"),
            location_detail=d.get("reporter_note") or f"Titik laporan warga — {d.get('kelurahan', '-')}",
            latitude=d.get("latitude", 0.0),
            longitude=d.get("longitude", 0.0),
            blockage_percentage=d.get("blockage_percentage", 0.0),
            assigned_team=None,
            status="pending",
            created_at=d.get("timestamp", now.isoformat()),
        )
        for d in pending_high_priority[:10]
    ]

    return DashboardSummary(
        total_active_blockages=total_active_blockages,
        total_high_risk_areas=total_high_risk_areas,
        total_completed_today=total_completed_today,
        total_citizen_reports=total_citizen_reports,
        risk_scores=risk_scores,
        active_alerts=active_alerts,
        maintenance_queue=maintenance_queue,
        last_updated=now,
    )