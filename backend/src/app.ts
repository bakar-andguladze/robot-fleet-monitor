import express from 'express'
import type { ErrorRequestHandler } from 'express'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not found' })
  })

  // Express identifies error middleware by its four parameters.
  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    let status = 500

    if (
      error instanceof Error &&
      'status' in error &&
      typeof error.status === 'number' &&
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status <= 599
    ) {
      status = error.status
    }

    if (status >= 500) {
      console.error(error)
    }

    const message = status >= 500
      ? 'Internal server error'
      : status === 400
        ? 'Bad request'
        : status === 413
          ? 'Request body too large'
          : 'Request rejected'

    response.status(status).json({ error: message })
  }

  app.use(errorHandler)

  return app
}
