"""
Training ulang model prediksi risiko banjir (LSTM).

LATAR BELAKANG: model produksi sebelumnya (artefak lama, tidak ada riwayat
training) terbukti melalui pengujian sensitivitas tidak merespons rainfall_mm
dan blockage_score dengan wajar (lihat laporan teknis, bagian 5.4 & 8).

DATASET: karena data historis riil (curah hujan BMKG + catatan genangan/
sumbatan per kelurahan) tidak tersedia untuk diakses dalam waktu pengembangan
(BMKG Data Online butuh registrasi & approval, API publik BMKG hanya
prakiraan ke depan bukan arsip historis), model ini dilatih pada DATASET
SINTETIS yang dibangun dari formula eksplisit merepresentasikan hubungan
domain yang wajar: curah hujan & skor sumbatan naik -> risiko naik.

Ini adalah keterbatasan yang diungkap secara terbuka, bukan disembunyikan
(lihat laporan teknis, bagian 8) -- tujuannya supaya model minimal
BERPERILAKU BENAR (sensitif terhadap fitur kunci), bukan mengklaim akurasi
prediktif terhadap kondisi riil di lapangan.
"""

import numpy as np
import pickle
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

KELURAHAN_LIST = [
    'Pluit', 'Koja', 'Tambora', 'Cilincing', 'Palmerah',
    'Penjaringan', 'Mampang', 'Senen', 'Tebet', 'Pasar Minggu'
]

# risiko dasar per kelurahan (0-100) -- kelurahan pesisir utara Jakarta
# (Pluit, Penjaringan, Koja, Cilincing) diberi baseline lebih tinggi karena
# fenomena penurunan tanah & banjir rob yang terdokumentasi luas secara
# publik untuk wilayah tersebut. Ini asumsi pemodelan yang eksplisit,
# bukan dari data terukur.
BASELINE_RISK = {
    'Pluit': 15, 'Penjaringan': 15, 'Koja': 12, 'Cilincing': 12,
    'Tambora': 8, 'Palmerah': 5, 'Senen': 5,
    'Mampang': 3, 'Tebet': 3, 'Pasar Minggu': 2,
}


def generate_synthetic_dataset(n_samples: int = 6000, seed: int = 42):
    """Bangun dataset sintetis: fitur acak + target dari formula domain eksplisit."""
    rng = np.random.default_rng(seed)

    X = []
    y = []
    for _ in range(n_samples):
        kelurahan_idx = rng.integers(0, len(KELURAHAN_LIST))
        kelurahan = KELURAHAN_LIST[kelurahan_idx]

        rainfall_mm = rng.uniform(0, 150)
        blockage_score = rng.uniform(0, 100)
        is_rainy_season = rng.integers(0, 2)
        is_event_day = rng.choice([0, 1], p=[0.9, 0.1])

        risk = (
            BASELINE_RISK[kelurahan]
            + 0.27 * min(rainfall_mm, 150)     # kontribusi hujan, maks ~40 poin
            + 0.35 * blockage_score            # kontribusi sumbatan, maks 35 poin
            + 8 * is_rainy_season
            + 4 * is_event_day
            + rng.normal(0, 4)                 # noise realistis
        )
        risk = float(np.clip(risk, 0, 100))

        # sequence 7 hari -- direplikasi dari nilai hari ini, konsisten dengan
        # cara lstm_service.py memanggil model saat inferensi produksi
        # (keterbatasan ini didokumentasikan terpisah di laporan teknis)
        single_input = [rainfall_mm, blockage_score, is_rainy_season, is_event_day, kelurahan_idx]
        sequence = [single_input] * 7

        X.append(sequence)
        y.append(risk)

    return np.array(X), np.array(y).reshape(-1, 1)


def train():
    from sklearn.preprocessing import MinMaxScaler
    from tensorflow import keras
    from tensorflow.keras import layers

    X, y = generate_synthetic_dataset()
    print(f"Dataset sintetis: {len(X)} sample")

    n_train = int(len(X) * 0.85)
    X_train, X_val = X[:n_train], X[n_train:]
    y_train, y_val = y[:n_train], y[n_train:]

    scaler_X = MinMaxScaler()
    scaler_X.fit(X_train.reshape(-1, 5))
    X_train_scaled = scaler_X.transform(X_train.reshape(-1, 5)).reshape(X_train.shape)
    X_val_scaled = scaler_X.transform(X_val.reshape(-1, 5)).reshape(X_val.shape)

    scaler_y = MinMaxScaler()
    y_train_scaled = scaler_y.fit_transform(y_train)
    y_val_scaled = scaler_y.transform(y_val)

    # arsitektur identik dengan model produksi sebelumnya, supaya perbandingan
    # "sebelum vs sesudah" murni soal data, bukan soal arsitektur
    model = keras.Sequential([
        layers.LSTM(64, return_sequences=True, input_shape=(7, 5)),
        layers.Dropout(0.2),
        layers.LSTM(32),
        layers.Dropout(0.2),
        layers.BatchNormalization(),
        layers.Dense(16, activation='relu'),
        layers.Dense(1),
    ])
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    model.summary()

    early_stop = keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    history = model.fit(
        X_train_scaled, y_train_scaled,
        validation_data=(X_val_scaled, y_val_scaled),
        epochs=100,
        batch_size=32,
        callbacks=[early_stop],
        verbose=2,
    )

    val_mae_scaled = min(history.history['val_mae'])
    print(f"\nBest val_mae (scaled 0-1): {val_mae_scaled:.4f}")

    model.save(os.path.join(BASE_DIR, "lstm_flood_risk_model.h5"))
    with open(os.path.join(BASE_DIR, "scaler_X.pkl"), "wb") as f:
        pickle.dump(scaler_X, f)
    with open(os.path.join(BASE_DIR, "scaler_y.pkl"), "wb") as f:
        pickle.dump(scaler_y, f)

    print("\nModel & scaler tersimpan di", BASE_DIR)

    # sanity check cepat -- pastikan model sekarang sensitif terhadap rainfall/blockage
    print("\n=== Sanity check sensitivitas ===")
    for r in [0, 30, 60, 90, 120]:
        seq = np.array([[[r, r, 1, 0, 0]] * 7])
        seq_scaled = scaler_X.transform(seq.reshape(-1, 5)).reshape(seq.shape)
        pred_scaled = model.predict(seq_scaled, verbose=0)
        pred = scaler_y.inverse_transform(pred_scaled)[0][0]
        print(f"rainfall=blockage={r:>3} -> risk_score={pred:.1f}")


if __name__ == "__main__":
    train()
