/**
 * Local dev server for the API.
 * Run: node scripts/dev-api.js
 * Then Vite proxies /api/* to this server.
 */
import express from 'express'
import handler from '../api/prenom.js'

const app = express()
const PORT = 3001

app.get('/api/prenom', (req, res) => {
  handler(req, res)
})

app.listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`)
})
