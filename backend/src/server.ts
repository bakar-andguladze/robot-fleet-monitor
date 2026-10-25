import { createApp } from './app.js'
import { loadFleetData } from './data/loadFleetData.js'
import { startRobotSimulation } from './simulation/startRobotSimulation.js'

const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

const fleet = await loadFleetData()
const stopSimulation = startRobotSimulation(fleet)
const app = createApp(fleet)
const server = app.listen(port, () => {
  console.log('API listening on http://localhost:' + port)
})

server.once('close', stopSimulation)

function shutdown() {
  stopSimulation()
  server.close((error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
