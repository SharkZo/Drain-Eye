import { useState, useEffect } from 'react'
import './InstallPrompt.css'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // sudah pernah ditutup sebelumnya di sesi browser ini? jangan muncul lagi
    if (sessionStorage.getItem('installPromptDismissed') === '1') {
      setDismissed(true)
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // kalau app sudah ke-install (running standalone), jangan tampilkan banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    if (isStandalone) setVisible(false)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('installPromptDismissed', '1')
  }

  if (!visible || dismissed) return null

  return (
    <div className="install-prompt">
      <div className="install-prompt-icon">💧</div>
      <div className="install-prompt-text">
        <div className="install-prompt-title">Install DRAIN-EYE</div>
        <div className="install-prompt-sub">Akses lebih cepat, bisa dipakai walau sinyal lemah</div>
      </div>
      <div className="install-prompt-actions">
        <button className="btn-install" onClick={handleInstall}>Install</button>
        <button className="btn-dismiss" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  )
}
