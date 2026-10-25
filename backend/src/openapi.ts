import { z } from 'zod'
import { robotSchema, siteSchema } from './data/fleetSchema.js'

function errorResponse(description: string, message: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { error: message },
      },
    },
  }
}

export const openApiDocument = {
  openapi: '3.1.1',
  info: {
    title: 'Robot Fleet Monitor API',
    version: '1.0.0',
    description: 'Read-only warehouse layouts and current simulated robot snapshots. '
      + 'Coordinates use local schematic units. '
      + 'The backend updates robot positions approximately once per second. These endpoints return snapshots rather than streaming telemetry.',
  },
  servers: [{ url: '/', description: 'Current API server' }],
  tags: [
    { name: 'Health', description: 'Service availability' },
    { name: 'Sites', description: 'Warehouse layouts and functional areas' },
    { name: 'Robots', description: 'Current simulated robot state across warehouses' },
  ],
  paths: {
    '/health': {
      get: {
        operationId: 'getHealth',
        tags: ['Health'],
        summary: 'Check service health',
        responses: {
          '200': {
            description: 'The API is running.',
            content: {
              'application/json': {
                schema: z.toJSONSchema(z.object({ status: z.literal('ok') })),
                example: { status: 'ok' },
              },
            },
          },
        },
      },
    },
    '/api/sites': {
      get: {
        operationId: 'listSites',
        tags: ['Sites'],
        summary: 'List warehouse layouts',
        description: 'Returns every warehouse, including dimensions and zones. '
          + 'Storage, loading, and charging zones are functional areas that robots can enter.',
        responses: {
          '200': {
            description: 'All warehouses; an empty array when no warehouses are configured.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Site' } },
              },
            },
          },
        },
      },
    },
    '/api/robots': {
      get: {
        operationId: 'listRobots',
        tags: ['Robots'],
        summary: 'List robots, optionally filtered by warehouse',
        description: 'Returns the latest simulated state. Omit siteId to return all robots. A known warehouse with no robots returns an empty array.',
        parameters: [{
          name: 'siteId',
          in: 'query',
          required: false,
          description: 'Exact warehouse ID. Supply a single, non-blank value; repeated values are rejected.',
          schema: { type: 'string', minLength: 1, pattern: /\S/.source },
          example: 'site-north',
        }],
        responses: {
          '200': {
            description: 'Robots matching the optional warehouse filter.',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Robot' } },
              },
            },
          },
          '400': errorResponse('The warehouse filter is empty, blank, or repeated.',
            'siteId must be a single, non-empty string'),
          '404': errorResponse('No warehouse exists with the requested ID.', 'Warehouse not found'),
          '500': errorResponse('An unexpected server error occurred.', 'Internal server error'),
        },
      },
    },
  },
  components: {
    schemas: {
      Site: z.toJSONSchema(siteSchema),
      Robot: z.toJSONSchema(robotSchema),
      Error: z.toJSONSchema(z.object({ error: z.string() })),
    },
  },
}
