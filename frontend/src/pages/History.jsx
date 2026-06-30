import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../AuthContext'
import Navbar from '../components/Navbar'
import './History.css'

const API = 'https://drain-eye-production.up.railway.app'

const SEVERITY_LABELS = {
  clear:            { label: 'Bersih',          color: '#27500A', bg: '#EAF3DE', icon: '✅' },
  partial:          { label: 'Sebagian',         color: '#633806', bg: '#FAEEDA', icon: '⚠️' },
  blocked:          { label: 'Tersumbat',        color: '#A32D2D', bg: '#FCEBEB', icon: '🔴' },
  severely_blocked: { label: 'Sangat Tersumbat', color: '#7B1D1D', bg: '#FEE2E2', icon: '🚨' },
}

const RISK_LABELS = {
  low:      { label: 'Rendah',  color: '#27500A', bg: '#EAF3DE' },
  moderate: { label: 'Sedang',  color: '#633806', bg: '#FAEEDA' },
  high:     { label: 'Tinggi',  color: '#A32D2D', bg: '#FCEBEB' },
  critical: { label: 'Kritis',  color: '#7B1D1D', bg: '#FEE2E2' },
}

function SkeletonItem() {
  return (
    <div className="hist-item skeleton-hist">
      <div className="skel-circle"></div>
      <div style={{ flex: 1 }}>
        <div className="skel-line w50" style={{ height: 13, marginBottom: 6 }}></div>
        <div className="skel-line w30" style={{ height: 10 }}></div>
      </div>
    </div>
  )
}

export default function History() {
  const { user, isDLH } = useAuth()

  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const url = isDLH
        ? `${API}/api/detection/history`
        : `${API}/api/detection/history?user_id=${user.id}`
      const res = await axios.get(url)
      setHistory(res.data.data || [])
    } catch (err) {
      setLoadError(true)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const markAsHandled = async (id) => {
    setActionLoadingId(id)
    try {
      await axios.patch(`${API}/api/detection/history/${id}/handled`)
      await fetchHistory()
    } catch (err) {
      alert('Gagal update status. Coba lagi.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const filtered = history.filter(h => {
    const matchFilter = filter === 'all' || h.risk_level === filter || h.status === filter
    const matchSearch = h.kelurahan?.toLowerCase().includes(search.toLowerCase()) ||
                        h.kecamatan?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

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
    <div className="hist-wrap">
      <Navbar title={isDLH ? "Semua Laporan Warga" : "Riwayat Laporan Saya"} backHref={isDLH ? "/" : "/upload"} />

      <div className="hist-body">

        <div className="hist-stats">
          <div className="hstat critical">
            <div className="hstat-val">{history.filter(h => h.risk_level === 'critical').length}</div>
            <div className="hstat-lbl">Kritis</div>
          </div>
          <div className="hstat high">
            <div className="hstat-val">{history.filter(h => h.risk_level === 'high').length}</div>
            <div className="hstat-lbl">Tinggi</div>
          </div>
          <div className="hstat moderate">
            <div className="hstat-val">{history.filter(h => h.risk_level === 'moderate').length}</div>
            <div className="hstat-lbl">Sedang</div>
          </div>
          <div className="hstat low">
            <div className="hstat-val">{history.filter(h => h.risk_level === 'low').length}</div>
            <div className="hstat-lbl">Rendah</div>
          </div>
          <div className="hstat handled">
            <div className="hstat-val">{history.filter(h => h.status === 'handled').length}</div>
            <div className="hstat-lbl">Ditangani</div>
          </div>
        </div>

        <div className="hist-controls">
          <input
            className="hist-search"
            placeholder="🔍 Cari kelurahan atau kecamatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loading}
          />
          <div className="filter-row">
            {['all','critical','high','moderate','low','handled','pending'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all'      ? 'Semua'       :
                 f === 'critical' ? '🚨 Kritis'   :
                 f === 'high'     ? '🔴 Tinggi'   :
                 f === 'moderate' ? '🟠 Sedang'   :
                 f === 'low'      ? '🟢 Rendah'   :
                 f === 'handled'  ? '✅ Ditangani' : '⏳ Pending'}
              </button>
            ))}
          </div>
        </div>

        <div className="hist-list">
          {loading && (
            <>
              <SkeletonItem /><SkeletonItem /><SkeletonItem />
            </>
          )}

          {!loading && loadError && (
            <div className="hist-error">
              <span style={{ fontSize: 28 }}>⚠️</span>
              <span>Gagal memuat riwayat. Periksa koneksi internet kamu.</span>
              <button className="btn-retry-sm" onClick={fetchHistory}>🔄 Coba Lagi</button>
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="hist-empty">
              {history.length === 0
                ? (isDLH ? '📭 Belum ada laporan masuk dari warga.' : '📭 Belum ada laporan. Upload foto drainase pertamamu!')
                : 'Tidak ada laporan yang sesuai filter pencarian.'}
            </div>
          )}

          {!loading && !loadError && filtered.map(h => (
            <div
              key={h.id}
              className={`hist-item ${selected?.id === h.id ? 'selected' : ''}`}
              onClick={() => setSelected(selected?.id === h.id ? null : h)}
            >
              <div className="hist-item-left">
                <div className="hist-severity-icon">
                  {SEVERITY_LABELS[h.severity_class]?.icon || '📍'}
                </div>
                <div className="hist-item-info">
                  <div className="hist-item-loc">
                    {h.kelurahan}, {h.kecamatan}
                    {isDLH && h.user_email && <span className="reporter-tag">oleh {h.user_email}</span>}
                  </div>
                  <div className="hist-item-time">{fmtDate(h.timestamp)} • {fmtTime(h.timestamp)}</div>
                </div>
              </div>
              <div className="hist-item-right">
                <span className="hist-badge" style={{
                  background: RISK_LABELS[h.risk_level]?.bg,
                  color: RISK_LABELS[h.risk_level]?.color
                }}>
                  {RISK_LABELS[h.risk_level]?.label}
                </span>
                <div className="hist-pct">{h.blockage_percentage}%</div>
                <div className={`hist-status ${h.status}`}>
                  {h.status === 'handled' ? '✅ Ditangani' : '⏳ Pending'}
                </div>
              </div>

              {selected?.id === h.id && (
                <div className="hist-detail">
                  <div className="detail-row">
                    <span>ID Laporan</span><span>#{h.id}</span>
                  </div>
                  {isDLH && (
                    <div className="detail-row">
                      <span>Dilaporkan oleh</span><span>{h.user_email || 'Anonim'}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>Tingkat Sumbatan</span>
                    <span style={{ background: SEVERITY_LABELS[h.severity_class]?.bg, color: SEVERITY_LABELS[h.severity_class]?.color, padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                      {SEVERITY_LABELS[h.severity_class]?.label}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Persentase</span><span>{h.blockage_percentage}%</span>
                  </div>
                  <div className="detail-row">
                    <span>Jenis Sampah</span><span>{h.waste_type || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Confidence AI</span><span>{h.confidence_score ? `${(h.confidence_score * 100).toFixed(1)}%` : '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Catatan</span><span>{h.reporter_note || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Status</span>
                    <span>{h.status === 'handled' ? '✅ Sudah ditangani' : '⏳ Menunggu penanganan'}</span>
                  </div>
                  {isDLH && h.status === 'pending' && (
                    <button
                      className="btn-handled"
                      onClick={(e) => { e.stopPropagation(); markAsHandled(h.id); }}
                      disabled={actionLoadingId === h.id}
                    >
                      {actionLoadingId === h.id ? '⏳ Memproses...' : '✅ Tandai Sudah Ditangani'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!isDLH && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <a href="/upload" className="btn-new-report">+ Buat Laporan Baru</a>
          </div>
        )}

      </div>
    </div>
  )
}
