/**
 * Production API server (no external dependencies).
 * Uses Node.js built-in http module with Express-compatible shims
 * so the Vercel handler works unchanged.
 */
import { createServer } from 'node:http'
import { URL } from 'node:url'
import handler from '../api/prenom.js'

const PORT = process.env.PORT || 3001

/**
 * Add Express-like .status(), .json(), .setHeader() to native res.
 */
function shimResponse(res) {
  const _setHeader = res.setHeader.bind(res)

  res.status = (code) => {
    res.statusCode = code
    return res
  }

  res.json = (data) => {
    const body = JSON.stringify(data)
    if (!res.headersSent) {
      _setHeader('Content-Type', 'application/json')
    }
    res.end(body)
    return res
  }

  return res
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname === '/api/prenom') {
    req.query = Object.fromEntries(url.searchParams)
    shimResponse(res)
    try {
      handler(req, res)
    } catch (err) {
      console.error('Handler error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal error', message: err.message })
      }
    }
  } else if (url.pathname === '/health') {
    res.writeHead(200)
    res.end('ok')
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})
