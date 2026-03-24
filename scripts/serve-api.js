/**
 * Production API server (no external dependencies).
 * Uses Node.js built-in http module.
 */
import { createServer } from 'node:http'
import { URL } from 'node:url'
import handler from '../api/prenom.js'

const PORT = process.env.PORT || 3001

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname === '/api/prenom') {
    req.query = Object.fromEntries(url.searchParams)
    handler(req, res)
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
