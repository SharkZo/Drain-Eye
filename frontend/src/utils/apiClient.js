import axios from 'axios'

/**
 * GET request dengan auto-retry (exponential backoff).
 * Berguna khusus untuk Railway free tier yang bisa "tidur" dan
 * butuh 10-30 detik untuk bangun saat cold start.
 *
 * @param {string} url
 * @param {object} options
 * @param {number} options.retries    - jumlah percobaan ulang (default 3, total 4x request)
 * @param {number} options.baseDelay  - delay awal dalam ms sebelum retry pertama (default 2000)
 * @param {number} options.timeout    - timeout per request dalam ms (default 10000)
 * @param {(attempt: number, maxRetries: number) => void} options.onRetry - callback tiap kali mau retry
 */
export async function fetchWithRetry(url, {
  retries = 3,
  baseDelay = 2000,
  timeout = 10000,
  onRetry,
} = {}) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, { timeout })
    } catch (err) {
      lastError = err
      if (attempt === retries) break
      onRetry?.(attempt + 1, retries)
      const delay = baseDelay * Math.pow(1.8, attempt) // 2s, 3.6s, 6.5s...
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
