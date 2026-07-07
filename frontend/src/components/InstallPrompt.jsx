import { useState, useEffect } from 'react'
import './InstallPrompt.css'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // sudah pernah ditutup sebelumnya di sesi browser ini? jangan muncul lagi
    if (sessionStorage.getItem('installPromptDismissed') === '1') {
      setDismissed(true)
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true

    // Deteksi iOS Safari — beforeinstallprompt TIDAK ADA di iOS, jadi harus
    // dikasih instruksi manual (tombol Share -> Add to Home Screen), bukan tombol install.
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOSDevice && !isStandalone) {
      setIsIOS(true)
      setVisible(true)
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

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
        {isIOS ? (
          <div className="install-prompt-sub">
            Tap tombol Share <span className="ios-share-icon">⎋</span> lalu pilih "Add to Home Screen"
          </div>
        ) : (
          <div className="install-prompt-sub">Akses lebih cepat, bisa dipakai walau sinyal lemah</div>
        )}
      </div>
      <div className="install-prompt-actions">
        {!isIOS && <button className="btn-install" onClick={handleInstall}>Install</button>}
        <button className="btn-dismiss" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  )
}
