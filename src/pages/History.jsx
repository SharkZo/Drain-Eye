import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './History.css'

const API = 'https://drain-eye-production.up.railway.app'

const SEVERITY_LABELS = {
  clear:            { label: 'Bersih',           color: '#1dd1a1', bg: 'rgba(29, 209, 161, 0.15)', icon: '✅' },
  partial:          { label: 'Sebagian',         color: '#feca57', bg: 'rgba(254, 202, 87, 0.15)', icon: '⚠️' },
  blocked:          { label: 'Tersumbat',        color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.15)', icon: '🔴' },
  severely_blocked: { label: 'Sangat Tersumbat', color: '#ff4d4d', bg: 'rgba(255, 77, 77, 0.15)',  icon: '🚨' },
}

const RISK_LABELS = {
  low:      { label: 'Rendah', color: '#1dd1a1', bg: 'rgba(29, 209, 161, 0.15)' },
  moderate: { label: 'Sedang', color: '#feca57', bg: 'rgba(254, 202, 87, 0.15)' },
  high:     { label: 'Tinggi', color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.15)' },
  critical: { label: 'Kritis', color: '#ff4d4d', bg: 'rgba(255, 77, 77, 0.15)' },
}

export default function History() {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  // 1. Fetch data dari API saat komponen dimuat
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/detection/history`)
      setHistory(res.data.data || [])
    } catch (err) {
      console.error('Gagal fetch riwayat:', err)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const markAsHandled = async (id) => {
    try {
      await axios.patch(`${API}/api/detection/history/${id}/handled`)
      fetchHistory() 
    } catch (err) {
      console.error('Gagal update status:', err)
    }
  }

  // 2. Mengolah data tren mingguan/harian (useMemo harus di dalam komponen)
  // Mengolah data tren bulanan berdasarkan kategori status & risiko
const trendData = useMemo(() => {
  const monthlyGroups = {};

  history.forEach(h => {
    if (!h.timestamp) return;
    
    // Ambil format "Jan 2026", "Feb 2026", dst.
    const dateObj = new Date(h.timestamp);
    const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

    if (!monthlyGroups[monthYear]) {
      monthlyGroups[monthYear] = {
        month: monthYear,
        kritis: 0,
        tinggi: 0,
        selesai: 0,
        pending: 0,
        rawDate: dateObj // Untuk keperluan sorting kronologis
      };
    }

    // Hitung berdasarkan Risk Level
    if (h.risk_level === 'critical') monthlyGroups[monthYear].kritis++;
    if (h.risk_level === 'high') monthlyGroups[monthYear].tinggi++;
    
    // Hitung berdasarkan Status Penanganan
    if (h.status === 'handled') monthlyGroups[monthYear].selesai++;
    if (h.status === 'pending') monthlyGroups[monthYear].pending++;
  });

  // Urutkan data berdasarkan waktu (dari bulan terlama ke terbaru)
  return Object.values(monthlyGroups).sort((a, b) => a.rawDate - b.rawDate);
}, [history]);

  // 3. Filter data berdasarkan input search dan tab filter
  const filtered = history.filter(h => {
    const matchFilter = filter === 'all' || h.risk_level === filter || h.status === filter
    const matchSearch = h.kelurahan?.toLowerCase().includes(search.toLowerCase()) ||
                        h.kecamatan?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // 4. Helper Formatter Waktu & Tanggal
  const fmtTime = (ts) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
  }

  const fmtDate = (ts) => {
    if (!ts) return '-'
    const d    = new Date(ts)
    const now  = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Hari ini'
    if (diff === 1) return 'Kemarin'
    return `${diff} hari lalu`
  }

  return (
    <div className="dash-wrap">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="btn-back-link">← Kembali</a>
          <span className="topbar-title" style={{ marginLeft: '10px' }}>🕐 Riwayat Laporan Terdeteksi</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-time">📋 Total Log: {history.length} Laporan</span>
        </div>
      </header>

      <div className="dash-body">
        {/* ── SIDEBAR ── */}
        <nav className="sidebar">
          <a href="/"        className="nav-item">📊 Dashboard</a>
          <a href="/upload"  className="nav-item">📷 Upload Foto</a>
          <div className="nav-item active">🕐 Riwayat</div>
          <a href="/alert"   className="nav-item">🔔 Alert</a>
          <div className="nav-item">📈 Analitik</div>
          <div className="nav-item">📄 Laporan</div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content">
          
          {/* ── METRIC CARDS SUMMARY ── */}
          <div className="metrics-row">
            <div className="metric-card glass-card card-red">
              <div className="metric-val">{history.filter(h => h.risk_level === 'critical').length}</div>
              <div className="metric-lbl">Status Kritis</div>
              <div className="metric-tag">Sumbatan Akut</div>
            </div>
            <div className="metric-card glass-card card-amber">
              <div className="metric-val">{history.filter(h => h.risk_level === 'high').length}</div>
              <div className="metric-lbl">Risiko Tinggi</div>
              <div className="metric-tag">Butuh Pengerukan</div>
            </div>
            <div className="metric-card glass-card card-green">
              <div className="metric-val">{history.filter(h => h.status === 'handled').length}</div>
              <div className="metric-lbl">Telah Ditangani</div>
              <div className="metric-tag">Clear / Selesai</div>
            </div>
            <div className="metric-card glass-card card-cyan">
              <div className="metric-val">{history.filter(h => h.status === 'pending').length}</div>
              <div className="metric-lbl">Menunggu</div>
              <div className="metric-tag">Status Pending</div>
            </div>
          </div>

          {/* ── CHART TREN LAPORAN ── */}
          {!loading && history.length > 0 && (
            <div className="card glass-card chart-container">
              <div className="card-title" style={{ marginBottom: '15px' }}>📈 Tren Log Masuk Laporan</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0b132b', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#00d2ff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#00d2ff" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── SEARCH & CONTROLS BOX ── */}
          <div className="card glass-card control-panel-box">
            <div className="search-input-wrapper">
              <input
                className="history-search-bar"
                placeholder="🔍 Cari lokasi kelurahan atau kecamatan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-scroll-row">
              {['all','critical','high','moderate','low','handled','pending'].map(f => (
                <button
                  key={f}
                  className={`filter-tab-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'      ? '📋 Semua'       :
                   f === 'critical' ? '🚨 Kritis'    :
                   f === 'high'     ? '🔴 Tinggi'    :
                   f === 'moderate' ? '🟠 Sedang'    :
                   f === 'low'      ? '🟢 Rendah'    :
                   f === 'handled'  ? '✅ Ditangani' : '⏳ Pending'}
                </button>
              ))}
            </div>
          </div>

          {/* ── LIST RIWAYAT LAPORAN ── */}
          <div className="history-list-container">
            {loading && (
              <div className="card glass-card text-center-status">⏳ Menyelaraskan berkas riwayat dari cloud server...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="card glass-card text-center-status">
                {history.length === 0
                  ? '📭 Belum ada rekaman log. Silakan buat laporan pertamamu di menu Upload!'
                  : '🔍 Tidak ditemukan rekaman yang cocok dengan kriteria filter.'}
              </div>
            )}
            
            {!loading && filtered.map(h => {
              const isItemOpen = selected?.id === h.id;
              return (
                <div
                  key={h.id}
                  className={`history-row-card glass-card ${isItemOpen ? 'is-expanded' : ''}`}
                  onClick={() => setSelected(isItemOpen ? null : h)}
                >
                  <div className="history-main-row">
                    <div className="history-left-meta">
                      <div className="severity-round-icon" style={{ background: SEVERITY_LABELS[h.severity_class]?.bg }}>
                        {SEVERITY_LABELS[h.severity_class]?.icon || '📍'}
                      </div>
                      <div>
                        <div className="history-location-text">{h.kelurahan}, <span className="sub-kec-text">Kec. {h.kecamatan}</span></div>
                        <div className="history-date-subtext">📆 {fmtDate(h.timestamp)} • ⏱ {fmtTime(h.timestamp)}</div>
                      </div>
                    </div>

                    <div className="history-right-meta">
                      <span className="risk-level-badge" style={{
                        background: RISK_LABELS[h.risk_level]?.bg,
                        color: RISK_LABELS[h.risk_level]?.color
                      }}>
                        {RISK_LABELS[h.risk_level]?.label}
                      </span>
                      <span className="percentage-display-text">{h.blockage_percentage}%</span>
                      <span className={`status-pill-badge ${h.status}`}>
                        {h.status === 'handled' ? 'Selesai' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* PANEL DETAIL (COLLAPSIBLE) */}
                  {isItemOpen && (
                    <div className="history-expanded-detail" onClick={(e) => e.stopPropagation()}>
                      <div className="detail-grid-specs">
                        <div className="spec-tile">
                          <label>ID Laporan</label>
                          <span>#{h.id}</span>
                        </div>
                        <div className="spec-tile">
                          <label>Tingkat Sumbatan</label>
                          <span style={{ color: SEVERITY_LABELS[h.severity_class]?.color }}>
                            {SEVERITY_LABELS[h.severity_class]?.label}
                          </span>
                        </div>
                        <div className="spec-tile">
                          <label>Volume Obstruksi</label>
                          <span style={{ color: '#00d2ff', fontWeight: 700 }}>{h.blockage_percentage}%</span>
                        </div>
                        <div className="spec-tile">
                          <label>Klasifikasi Sampah</label>
                          <span>{h.waste_type || 'Tidak Teridentifikasi'}</span>
                        </div>
                        <div className="spec-tile">
                          <label>Akurasi Model (Confidence)</label>
                          <span>{h.confidence_score ? `${(h.confidence_score * 100).toFixed(1)}%` : '-'}</span>
                        </div>
                        <div className="spec-tile">
                          <label>Status Penanganan</label>
                          <span className={h.status === 'handled' ? 'txt-green' : 'txt-amber'}>
                            {h.status === 'handled' ? '✓ Sudah Dibersihkan' : '⏳ Menunggu Giliran'}
                          </span>
                        </div>
                      </div>

                      <div className="spec-note-full">
                        <label>Catatan Pengawas Lapangan</label>
                        <p>{h.reporter_note || 'Tidak ada catatan tambahan untuk laporan ini.'}</p>
                      </div>

                      {h.status === 'pending' && (
                        <div className="action-button-panel">
                          <button
                            className="btn-mark-resolved"
                            onClick={() => markAsHandled(h.id)}
                          >
                            Tandai Penanganan Selesai ✓
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="footer-action-center">
            <a href="/upload" className="btn-upload" style={{ textDecoration: 'none', display: 'inline-block' }}>
              + Buat Laporan Baru
            </a>
          </div>

        </main>
      </div>
    </div>
  )
}