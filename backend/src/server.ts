import { createApp } from './app.js'
import { loadFleetData } from './data/loadFleetData.js'

const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

const fleet = await loadFleetData()
const app = createApp(fleet)
const server = app.listen(port, () => {
  console.log('API listening on http://localhost:' + port)
})

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
