import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

const zoneSchema = z.object({
  id: nonEmptyString,
  type: z.enum(['storage', 'loading', 'charging']),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
})

const siteSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  width: z.number().positive(),
  height: z.number().positive(),
  zones: z.array(zoneSchema),
})

const robotSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  siteId: nonEmptyString,
  status: z.enum(['moving', 'idle', 'charging', 'error']),
  batteryPercent: z.number().min(0).max(100),
  position: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
  }),
})

export const fleetSchema = z.object({
  sites: z.array(siteSchema),
  robots: z.array(robotSchema),
}).superRefine((fleet, context) => {
  const sitesById = new Map<string, z.infer<typeof siteSchema>>()

  fleet.sites.forEach((site, siteIndex) => {
    if (sitesById.has(site.id)) {
      context.addIssue({
        code: 'custom',
        path: ['sites', siteIndex, 'id'],
        message: 'Site IDs must be unique.',
      })
    }
    sitesById.set(site.id, site)

    const zoneIds = new Set<string>()
    site.zones.forEach((zone, zoneIndex) => {
      if (zoneIds.has(zone.id)) {
        context.addIssue({
          code: 'custom',
          path: ['sites', siteIndex, 'zones', zoneIndex, 'id'],
          message: 'Zone IDs must be unique within a site.',
        })
      }
      zoneIds.add(zone.id)

      if (zone.x + zone.width > site.width || zone.y + zone.height > site.height) {
        context.addIssue({
          code: 'custom',
          path: ['sites', siteIndex, 'zones', zoneIndex],
          message: 'Zone must fit within its site.',
        })
      }
    })
  })

  const robotIds = new Set<string>()
  fleet.robots.forEach((robot, robotIndex) => {
    if (robotIds.has(robot.id)) {
      context.addIssue({
        code: 'custom',
        path: ['robots', robotIndex, 'id'],
        message: 'Robot IDs must be unique.',
      })
    }
    robotIds.add(robot.id)

    const site = sitesById.get(robot.siteId)
    if (!site) {
      context.addIssue({
        code: 'custom',
        path: ['robots', robotIndex, 'siteId'],
        message: 'Robot must reference an existing site.',
      })
    } else if (robot.position.x > site.width || robot.position.y > site.height) {
      context.addIssue({
        code: 'custom',
        path: ['robots', robotIndex, 'position'],
        message: 'Robot position must be within its site.',
      })
    }
  })
})

export type FleetData = z.infer<typeof fleetSchema>
