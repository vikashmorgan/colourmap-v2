export type MapLayer = 'military' | 'commercial' | 'energy';

export type Chokepoint = {
  slug: string;
  name: string;
  x: number;
  y: number;
  /** Real WGS84 lat/lng — used by the Leaflet map. */
  lat: number;
  lng: number;
  status: 'OPEN' | 'OPEN-THROTTLED' | 'DEGRADED' | 'CLOSED';
  pageSlug: string;
};

export type GeoPoint = { x: number; y: number; lat: number; lng: number; name: string };

export type Movement = {
  id: string;
  layer: MapLayer;
  label: string;
  from: GeoPoint;
  to: GeoPoint;
  pageSlug: string;
  weekIso: string;
  recency: 'this-week' | 'last-week' | 'older';
};

export type RegionPath = {
  id: string;
  name: string;
  d: string;
};

export const MAP_VIEWBOX = { width: 1000, height: 700 };

// Stylized Middle East / Indian Ocean region paths. Hand-drawn shapes, not
// topographically faithful — readable parchment cartography. Coordinates are
// in viewBox units (0..1000 horizontal, 0..700 vertical).
export const REGIONS: RegionPath[] = [
  {
    id: 'arabian-peninsula',
    name: 'Arabian Peninsula',
    d: 'M 380 220 L 470 200 L 530 220 L 580 280 L 600 360 L 590 430 L 540 490 L 460 520 L 400 500 L 360 440 L 340 360 L 350 290 Z',
  },
  {
    id: 'iran',
    name: 'Iran',
    d: 'M 520 130 L 640 120 L 730 150 L 760 220 L 720 280 L 640 310 L 570 290 L 520 250 L 510 190 Z',
  },
  {
    id: 'iraq-syria',
    name: 'Iraq · Syria',
    d: 'M 380 130 L 510 130 L 520 230 L 460 240 L 410 220 L 380 180 Z',
  },
  {
    id: 'turkey',
    name: 'Türkiye',
    d: 'M 280 80 L 450 70 L 510 110 L 470 150 L 380 140 L 300 130 Z',
  },
  {
    id: 'horn-of-africa',
    name: 'Horn of Africa',
    d: 'M 300 380 L 360 390 L 380 470 L 330 540 L 280 540 L 250 480 L 250 420 Z',
  },
  {
    id: 'india',
    name: 'India',
    d: 'M 800 220 L 880 240 L 920 320 L 880 420 L 820 460 L 770 410 L 760 320 Z',
  },
  {
    id: 'pakistan',
    name: 'Pakistan',
    d: 'M 740 200 L 800 210 L 810 280 L 760 290 L 720 250 Z',
  },
  {
    id: 'egypt',
    name: 'Egypt',
    d: 'M 240 280 L 330 290 L 350 360 L 320 410 L 250 410 L 220 350 Z',
  },
];

export const CHOKEPOINTS: Chokepoint[] = [
  {
    slug: 'hormuz',
    name: 'Strait of Hormuz',
    x: 645,
    y: 295,
    lat: 26.5,
    lng: 56.25,
    status: 'OPEN-THROTTLED',
    pageSlug: 'hormuz-geography',
  },
  {
    slug: 'bab-el-mandeb',
    name: 'Bab el-Mandeb',
    x: 330,
    y: 425,
    lat: 12.58,
    lng: 43.35,
    status: 'DEGRADED',
    pageSlug: 'hormuz-vs-redsea',
  },
  {
    slug: 'suez',
    name: 'Suez Canal',
    x: 280,
    y: 250,
    lat: 30.05,
    lng: 32.55,
    status: 'DEGRADED',
    pageSlug: 'hormuz-vs-redsea',
  },
  {
    slug: 'fujairah',
    name: 'Fujairah (Hormuz bypass)',
    x: 615,
    y: 330,
    lat: 25.12,
    lng: 56.33,
    status: 'OPEN',
    pageSlug: 'iran-leverage',
  },
  {
    slug: 'malacca',
    name: 'Strait of Malacca',
    x: 870,
    y: 540,
    lat: 1.43,
    lng: 102.89,
    status: 'OPEN',
    pageSlug: 'top-3',
  },
  {
    slug: 'panama',
    name: 'Panama Canal',
    x: 60,
    y: 420,
    lat: 9.08,
    lng: -79.68,
    status: 'OPEN',
    pageSlug: 'top-3',
  },
];

export const MOVEMENTS: Movement[] = [
  // Military
  {
    id: 'us-carrier-into-gulf-of-oman',
    layer: 'military',
    label: 'US carrier group → Gulf of Oman',
    from: { x: 760, y: 540, lat: 18, lng: 67, name: 'Indian Ocean station' },
    to: { x: 700, y: 360, lat: 24, lng: 58, name: 'Gulf of Oman' },
    pageSlug: 'epic-fury',
    weekIso: '2026-W23',
    recency: 'this-week',
  },
  {
    id: 'irgc-fast-boats',
    layer: 'military',
    label: 'IRGC fast-attack boats throttling Hormuz',
    from: { x: 720, y: 250, lat: 27.18, lng: 56.27, name: 'Bandar Abbas' },
    to: { x: 645, y: 295, lat: 26.5, lng: 56.25, name: 'Strait of Hormuz' },
    pageSlug: 'iran-leverage',
    weekIso: '2026-W23',
    recency: 'this-week',
  },
  {
    id: 'houthi-launches',
    layer: 'military',
    label: 'Houthi anti-ship launches into Bab el-Mandeb',
    from: { x: 380, y: 480, lat: 14.5, lng: 44.1, name: 'Yemen coast' },
    to: { x: 330, y: 425, lat: 12.58, lng: 43.35, name: 'Bab el-Mandeb' },
    pageSlug: 'twelve-day-war',
    weekIso: '2026-W23',
    recency: 'this-week',
  },

  // Commercial
  {
    id: 'container-reroute-cape',
    layer: 'commercial',
    label: 'Container reroute via Cape of Good Hope',
    from: { x: 760, y: 360, lat: 8, lng: 80, name: 'Asia-Europe lane' },
    to: { x: 220, y: 660, lat: -34.36, lng: 18.47, name: 'Cape of Good Hope' },
    pageSlug: 'hormuz-vs-redsea',
    weekIso: '2026-W23',
    recency: 'this-week',
  },
  {
    id: 'cma-cgm-watch-routes',
    layer: 'commercial',
    label: 'CMA CGM Asia → Europe routings (Ocean Alliance)',
    from: { x: 900, y: 480, lat: 31, lng: 121.5, name: 'Shanghai' },
    to: { x: 180, y: 220, lat: 43.3, lng: 5.37, name: 'Marseille' },
    pageSlug: 'alliances',
    weekIso: '2026-W23',
    recency: 'this-week',
  },

  // Energy
  {
    id: 'crude-out-of-hormuz',
    layer: 'energy',
    label: 'Crude exports out of Hormuz (~20 mb/d)',
    from: { x: 580, y: 320, lat: 26, lng: 52, name: 'Gulf producers' },
    to: { x: 880, y: 380, lat: 19, lng: 75, name: 'India / Asia demand' },
    pageSlug: 'hormuz-oil-share',
    weekIso: '2026-W23',
    recency: 'this-week',
  },
  {
    id: 'east-west-pipeline',
    layer: 'energy',
    label: 'Saudi East-West pipeline (Hormuz bypass)',
    from: { x: 500, y: 320, lat: 25.93, lng: 49.68, name: 'Abqaiq' },
    to: { x: 380, y: 380, lat: 24.08, lng: 38.06, name: 'Yanbu' },
    pageSlug: 'iran-leverage',
    weekIso: '2026-W23',
    recency: 'last-week',
  },
];

export const AVAILABLE_WEEKS = ['2026-W23'];
