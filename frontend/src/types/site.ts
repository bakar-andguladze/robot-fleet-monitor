export type SiteZoneType = 'storage' | 'loading' | 'charging'

export type SiteZone = {
  id: string
  type: SiteZoneType
  x: number
  y: number
  width: number
  height: number
}

export type Site = {
  id: string
  name: string
  width: number
  height: number
  zones: readonly SiteZone[]
}
