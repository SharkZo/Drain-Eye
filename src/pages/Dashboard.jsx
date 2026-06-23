import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './Dashboard.css'

const API = 'https://drain-eye-production.up.railway.app'

const KELURAHAN_DATA = [
  { name: 'Pluit',        risk: 91, level: 'critical' },
  { name: 'Koja',         risk: 84, level: 'critical' },
  { name: 'Tambora',      risk: 72, level: 'high'     },
  { name: 'Cilincing',    risk: 65, level: 'high'     },
  { name: 'Palmerah',     risk: 58, level: 'high'     },
  { name: 'Penjaringan',  risk: 53, level: 'high'     },
  { name: 'Mampang',      risk: 44, level: 'moderate' },
  { name: 'Senen',        risk: 38, level: 'moderate' },
  { name: 'Tebet',        risk: 28, level: 'low'      },
  { name: 'Pasar Minggu', risk: 21, level: 'low'      },
]

const ALERTS = [
  { id: 1, kelurahan: 'Pluit',    risk: 91, level: 'critical', message: 'Risiko banjir kritis — 3 titik tersumbat parah', time: '10:28 WIB' },
  { id: 2, kelurahan: 'Koja',     risk: 84, level: 'critical', message: 'Drainase 89% tersumbat — laporan warga x4',       time: '10:15 WIB' },
  { id: 3, kelurahan: 'Tambora',  risk: 72, level: 'high',     message: 'Hujan 48 jam diprediksi lebat — risiko meningkat', time: 'BMKG'      },
]

const QUEUE = [
  { id: 1, priority: 'P1', location: 'Jl. Pluit Raya — drainase utama',    team: 'Tim A', hours: 2,   status: 'assigned'   },
  { id: 2, priority: 'P1', location: 'Jl. Koja Utara — gorong-gorong',     team: 'Tim B', hours: 3,   status: 'in_progress' },
  { id: 3, priority: 'P2', location: 'Gg. Tambora 3 — saluran kecil',      team: 'Tim C', hours: 1,   status: 'pending'    },
  { id: 4, priority: 'P2', location: 'Cilincing — drainase pasar',         team: 'Tim D', hours: 2.5, status: 'pending'    },
  { id: 5, priority: 'P3', location: 'Mampang — saluran sekunder',         team: 'Tim E', hours: 1.5, status: 'pending'    },
]

const riskColor = (level) => ({
  critical: '#ff4d4d',
  high:     '#ff9f43',
  moderate: '#feca57',
  low:      '#1dd1a1',
}[level] || '#64748b')

export default function Dashboard() {
  // Pindahkan seluruh state & fungsi chatbot ke dalam fungsi komponen ini:
  const [summary, setSummary] = useState(null)
  const [stats, setStats]     = useState(null)
  const [time, setTime]       = useState(new Date())
  const [currentSlide, setCurrentSlide] = useState(0)

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Halo Warga DKI Jakarta! Ada saran, masukan, atau laporan seputar kondisi drainase hari ini?' }
  ])

  const handleSendMessage = () => {
    if (!chatInput.trim()) return

    const userMsg = { sender: 'user', text: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')

    // Simulasi respons AI pintar setelah 1 detik
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Terima kasih atas masukannya. Saran Anda telah direkam oleh sistem DRAIN-EYE untuk diteruskan ke posko dinas terkait.'
      }])
    }, 1000)
  }

  useEffect(() => {
    axios.get(`${API}/api/dashboard/summary`).then(r => setSummary(r.data)).catch(() => {})
    axios.get(`${API}/api/detection/stats`).then(r => setStats(r.data)).catch(() => {})

    const timer = setInterval(() => setTime(new Date()), 1000)
    
    // Auto-play slider setiap 4 detik
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % ALERTS.length)
    }, 4000)

    return () => {
      clearInterval(timer)
      clearInterval(slideTimer)
    }
  }, [])

  const fmtTime = t => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="dash-wrap">
      
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo-pulse">💧</div>
          <span className="topbar-title">DRAIN-EYE</span>
          <span className="topbar-sub">DLH DKI Jakarta Platform</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-time">🕐 {fmtTime(time)} WIB</span>
          <a href="/upload" className="btn-upload">+ Laporan Baru</a>
        </div>
      </header>

      <div className="dash-body">
        
        {/* ── SIDEBAR ── */}
        <nav className="sidebar">
          <a href="/"        className="nav-item active">📊 Dashboard</a>
          <a href="/upload"  className="nav-item">📷 Upload Foto</a>
          <a href="/history" className="nav-item">🕐 Riwayat</a>
          <a href="/alert" className="nav-item">🔔 Alert <span className="nav-badge">3</span></a>
          <div className="nav-item">📈 Analitik</div>
          <div className="nav-item">📄 Laporan</div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content">

          {/* ── MODERN BANNER SLIDER ── */}
          <div className="modern-slider">
            {ALERTS.map((slide, idx) => (
              <div 
                key={slide.id} 
                className={`slide-item ${idx === currentSlide ? 'active' : ''}`}
                style={{ '--accent-color': riskColor(slide.level) }}
              >
                <div className="slide-content">
                  <span className="slide-tag">CRITICAL HOTSPOT</span>
                  <h2>Wilayah {slide.kelurahan} Butuh Evakuasi Pembersihan</h2>
                  <p>{slide.message}</p>
                  <div className="slide-meta">
                    <span>Skor Risiko: <strong>{slide.risk}/100</strong></span>
                    <span>•</span>
                    <span>Waktu Laporan: {slide.time}</span>
                  </div>
                </div>
                <div className="slide-visual">
                  <div className="radar-pulse"></div>
                </div>
              </div>
            ))}
            <div className="slider-dots">
              {ALERTS.map((_, idx) => (
                <button 
                  key={idx} 
                  className={`dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                />
              ))}
            </div>
          </div>

          {/* ── METRIC CARDS ── */}
          <div className="metrics-row">
            <div className="metric-card glass-card card-red">
              <div className="metric-val">{summary?.total_active_blockages ?? 87}</div>
              <div className="metric-lbl">Titik Tersumbat Aktif</div>
              <div className="metric-tag">+12 Hari Ini</div>
            </div>
            <div className="metric-card glass-card card-amber">
              <div className="metric-val">{summary?.total_high_risk_areas ?? 23}</div>
              <div className="metric-lbl">Wilayah Risiko Tinggi</div>
              <div className="metric-tag">Perlu Tindakan</div>
            </div>
            <div className="metric-card glass-card card-green">
              <div className="metric-val">{summary?.total_completed_today ?? 41}</div>
              <div className="metric-lbl">Selesai Ditangani</div>
              <div className="metric-tag">Minggu Ini</div>
            </div>
            <div className="metric-card glass-card card-cyan">
              <div className="metric-val">{summary?.total_citizen_reports ?? 1200}</div>
              <div className="metric-lbl">Total Laporan Warga</div>
              <div className="metric-tag">Basis Data</div>
            </div>
          </div>

          <div className="grid-2">
            {/* ── CHART RISIKO ── */}
            <div className="card glass-card">
              <div className="card-title">📊 Risk Score per Kelurahan</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={KELURAHAN_DATA} layout="vertical" margin={{ left: 10, right: 20, top: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={85} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#0b132b',
                      borderColor: '#00d2ff',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#00d2ff', fontWeight: '600', fontSize: '13px' }}
                    labelStyle={{ color: '#fff', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}
                    formatter={(v) => [`${v}/100`, 'Risk Score']} 
                  />
                  <Bar dataKey="risk" radius={[0, 6, 6, 0]} barSize={12}>
                    {KELURAHAN_DATA.map((d, i) => (
                      <Cell key={i} fill={riskColor(d.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="legend-row">
                <span className="legend-item"><span className="legend-dot" style={{ background: '#ff4d4d' }} />Kritis</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#ff9f43' }} />Tinggi</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#feca57' }} />Sedang</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#1dd1a1' }} />Aman</span>
              </div>
            </div>

            {/* ── ALERT PANEL & STATS ── */}
            <div className="card glass-card flex-col">
              <div className="card-title">📷 Status Deteksi Kamera Hari Ini</div>
              <div className="stats-grid">
                <div className="stat-box s-red">
                  <div className="stat-val">{stats?.severely_blocked ?? 12}</div>
                  <div className="stat-lbl">Parah</div>
                </div>
                <div className="stat-box s-amber">
                  <div className="stat-val">{stats?.blocked ?? 23}</div>
                  <div className="stat-lbl">Tersumbat</div>
                </div>
                <div className="stat-box s-yellow">
                  <div className="stat-val">{stats?.partial ?? 31}</div>
                  <div className="stat-lbl">Sebagian</div>
                </div>
                <div className="stat-box s-green">
                  <div className="stat-val">{stats?.clear ?? 21}</div>
                  <div className="stat-lbl">Bersih</div>
                </div>
              </div>

              <div className="card-title" style={{ marginTop: '25px' }}>🔔 Log Pemberitahuan Cepat</div>
              <div className="mini-alert-list">
                {ALERTS.slice(0, 2).map(a => (
                  <div key={a.id} className="mini-alert-item">
                    <span className="alert-badge" style={{ backgroundColor: riskColor(a.level) }} />
                    <div className="mini-alert-text">
                      <h6>{a.kelurahan}</h6>
                      <p>{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MAINTENANCE QUEUE ── */}
          <div className="card glass-card">
            <div className="card-title">🔧 Jadwal Distribusi Tim Lapangan</div>
            <div className="table-responsive">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Prioritas</th>
                    <th>Lokasi Penugasan</th>
                    <th>Tim DLH</th>
                    <th>Estimasi Kerja</th>
                    <th>Status Operasional</th>
                  </tr>
                </thead>
                <tbody>
                  {QUEUE.map(q => (
                    <tr key={q.id}>
                      <td>
                        <span className={`p-badge p-${q.priority.toLowerCase()}`}>
                          {q.priority}
                        </span>
                      </td>
                      <td className="bold-text">{q.location}</td>
                      <td><span className="team-tag">{q.team}</span></td>
                      <td>{q.hours} Jam</td>
                      <td>
                        <span className={`status-pill pill-${q.status}`}>
                          {q.status === 'assigned' ? 'Alokasi' : q.status === 'in_progress' ? 'Eksekusi' : 'Antre'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* ── FLOATING AI CHATBOT ── */}
      <div className={`ai-chat-wrapper ${chatOpen ? 'open' : ''}`}>
        {chatOpen ? (
          <div className="chat-window">
            <div className="chat-header">
              <div className="chat-header-title">
                <span className="bot-status-dot"></span>
                <h6>💧 DRAIN-EYE AI Agent</h6>
              </div>
              <button className="btn-close-chat" onClick={() => setChatOpen(false)}>×</button>
            </div>

            <div className="chat-messages-box">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <input 
                type="text" 
                placeholder="Tulis saran atau masukan warga..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="btn-send-chat" onClick={handleSendMessage}>🚀</button>
            </div>
          </div>
        ) : (
          <button className="chat-trigger-btn" onClick={() => setChatOpen(true)}>
            <span className="chat-icon">💬</span>
            <span className="chat-text">Tanya AI & Saran</span>
          </button>
        )}
      </div>

    </div>
  )
}