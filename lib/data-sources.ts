// Canonical data sources surfaced at /education/world/sources.
// Aim: a literate citizen / researcher should be able to reach a primary source
// for almost any question about the world through this list alone.

export type Domain =
  | 'climate'
  | 'energy'
  | 'economy'
  | 'demography'
  | 'security'
  | 'food'
  | 'health'
  | 'biodiversity'
  | 'ai'
  | 'democracy'
  | 'shipping'
  | 'minerals';

export type DataSource = {
  slug: string;
  name: string;
  url: string;
  org: string;
  domain: Domain[];
  cadence: string;
  license: string;
  blurb: string;
};

export const DATA_SOURCES: DataSource[] = [
  // META
  {
    slug: 'our-world-in-data',
    name: 'Our World in Data',
    url: 'https://ourworldindata.org/',
    org: 'University of Oxford / Global Change Data Lab',
    domain: ['climate', 'economy', 'demography', 'food', 'health', 'energy'],
    cadence: 'continuous',
    license: 'CC-BY',
    blurb:
      "The meta-source. Newsroom-grade synthesis of underlying primary data with full transparency about provenance. Start here when you don't know where to start.",
  },

  // CLIMATE
  {
    slug: 'gcp',
    name: 'Global Carbon Project',
    url: 'https://globalcarbonbudget.org/',
    org: 'GCP / Future Earth',
    domain: ['climate'],
    cadence: 'annual (November)',
    license: 'CC-BY-4.0',
    blurb:
      'The annual Global Carbon Budget — atmospheric CO₂, emissions by sector / country, remaining carbon budget.',
  },
  {
    slug: 'c3s',
    name: 'Copernicus Climate Data Store',
    url: 'https://cds.climate.copernicus.eu/',
    org: 'ECMWF / European Commission',
    domain: ['climate'],
    cadence: 'continuous; monthly C3S bulletins',
    license: 'Copernicus Licence (free, open)',
    blurb:
      'ERA5 reanalysis lives here. 140+ datasets, 3.8 PB. The home of the 2024-was-the-first-1.5°C-year headline.',
  },
  {
    slug: 'noaa-mauna-loa',
    name: 'NOAA Mauna Loa CO₂ record',
    url: 'https://gml.noaa.gov/ccgg/trends/',
    org: 'NOAA Global Monitoring Lab',
    domain: ['climate'],
    cadence: 'continuous',
    license: 'Public domain (US Federal)',
    blurb:
      'The longest direct atmospheric CO₂ time series. The bar chart that defined the climate conversation.',
  },
  {
    slug: 'ipcc',
    name: 'IPCC AR6 (and forthcoming AR7)',
    url: 'https://www.ipcc.ch/',
    org: 'IPCC',
    domain: ['climate'],
    cadence: 'multi-year cycles; SPMs and special reports between',
    license: 'IPCC (free for non-commercial)',
    blurb:
      'The consensus document. Use the WG1 Physical Science Basis for hard numbers, WG2 for impacts, WG3 for mitigation.',
  },
  {
    slug: 'nsidc',
    name: 'NSIDC sea ice',
    url: 'https://nsidc.org/',
    org: 'National Snow and Ice Data Center / U. Colorado',
    domain: ['climate'],
    cadence: 'daily',
    license: 'Open',
    blurb:
      'Daily Arctic and Antarctic sea-ice extent. The September Arctic minimum is the headline metric.',
  },
  {
    slug: 'global-forest-watch',
    name: 'Global Forest Watch',
    url: 'https://www.globalforestwatch.org/',
    org: 'World Resources Institute',
    domain: ['climate', 'biodiversity'],
    cadence: 'annual + near-real-time alerts',
    license: 'Open',
    blurb:
      'Tropical primary forest loss. Tree-cover loss by country. Near-real-time fire alerts. The 6.7-Mha-in-2024 number lives here.',
  },

  // ECONOMY
  {
    slug: 'world-bank-wdi',
    name: 'World Bank Open Data — WDI',
    url: 'https://data.worldbank.org/',
    org: 'World Bank',
    domain: ['economy', 'demography', 'health', 'food', 'energy'],
    cadence: 'continuous (most series annual)',
    license: 'CC-BY-4.0',
    blurb:
      '~1,400 indicators across 217 economies, pulling UN/OECD/IMF feeds. The economic baseline.',
  },
  {
    slug: 'imf-weo',
    name: 'IMF World Economic Outlook',
    url: 'https://www.imf.org/en/Publications/WEO',
    org: 'IMF',
    domain: ['economy'],
    cadence: 'twice yearly (April, October) + updates',
    license: 'IMF (limited reuse rights)',
    blurb:
      'Forecast database. GDP, inflation, current account, government finance for ~190 countries.',
  },
  {
    slug: 'oecd-stat',
    name: 'OECD.Stat',
    url: 'https://stats.oecd.org/',
    org: 'OECD',
    domain: ['economy', 'demography'],
    cadence: 'continuous',
    license: 'OECD terms',
    blurb: 'Deep OECD-country data. Trade in value added, AEO, productivity, wellbeing dashboards.',
  },
  {
    slug: 'unctad',
    name: 'UNCTAD Stat',
    url: 'https://unctadstat.unctad.org/',
    org: 'UNCTAD',
    domain: ['economy', 'shipping'],
    cadence: 'continuous',
    license: 'Open',
    blurb:
      'Global trade flows, FDI, maritime statistics, e-commerce indicators. Essential for shipping work.',
  },

  // ENERGY
  {
    slug: 'iea',
    name: 'IEA — World Energy Outlook',
    url: 'https://www.iea.org/',
    org: 'IEA',
    domain: ['energy', 'climate'],
    cadence: 'annual + monthly Oil Market Report',
    license: 'IEA (limited; many free)',
    blurb:
      'WEO scenarios (STEPS / APS / NZE). Critical Minerals Outlook. Oil Market Report. The reference shop.',
  },
  {
    slug: 'eia',
    name: 'US EIA',
    url: 'https://www.eia.gov/',
    org: 'US Energy Information Administration',
    domain: ['energy'],
    cadence: 'continuous',
    license: 'Public domain (US Federal)',
    blurb:
      'US-centric but globally indispensable. Chokepoint pages (incl. Hormuz fact sheet) live here.',
  },
  {
    slug: 'energy-institute',
    name: 'Energy Institute Statistical Review (ex-BP)',
    url: 'https://www.energyinst.org/statistical-review',
    org: 'Energy Institute',
    domain: ['energy'],
    cadence: 'annual (June)',
    license: 'Free PDF',
    blurb:
      'The successor to the BP Statistical Review. Headline global energy production / consumption tables.',
  },

  // FOOD / AGRI
  {
    slug: 'faostat',
    name: 'FAOSTAT',
    url: 'https://www.fao.org/faostat/en/',
    org: 'FAO',
    domain: ['food'],
    cadence: 'continuous',
    license: 'CC-BY-4.0',
    blurb:
      'Production, trade, food balances, prices, land use. Machine-readable. The global agri reference.',
  },

  // DEMOGRAPHY
  {
    slug: 'un-wpp',
    name: 'UN World Population Prospects 2024',
    url: 'https://population.un.org/wpp/',
    org: 'UN DESA',
    domain: ['demography'],
    cadence: 'biennial',
    license: 'Open',
    blurb:
      'The reference projections. Peak ~10.3 B around 2084. Compare to IHME for the contested cases.',
  },

  // HEALTH
  {
    slug: 'who-gho',
    name: 'WHO Global Health Observatory',
    url: 'https://www.who.int/data/gho',
    org: 'WHO',
    domain: ['health'],
    cadence: 'continuous',
    license: 'WHO terms',
    blurb: 'Global health metrics, mortality, disease burden, system capacity.',
  },

  // SECURITY
  {
    slug: 'sipri',
    name: 'SIPRI Military Expenditure',
    url: 'https://www.sipri.org/databases/milex',
    org: 'SIPRI',
    domain: ['security'],
    cadence: 'annual (April)',
    license: 'Open',
    blurb:
      'Military spending since 1949. Local currency + constant USD + share of GDP. The reference.',
  },
  {
    slug: 'ucdp',
    name: 'Uppsala UCDP',
    url: 'https://ucdp.uu.se/',
    org: 'Uppsala University',
    domain: ['security'],
    cadence: 'annual + Georeferenced Events near-real-time',
    license: 'Open',
    blurb: 'Battle-deaths, organised violence events. The academic standard for conflict data.',
  },

  // BIODIVERSITY
  {
    slug: 'iucn',
    name: 'IUCN Red List',
    url: 'https://www.iucnredlist.org/',
    org: 'IUCN',
    domain: ['biodiversity'],
    cadence: 'continuous',
    license: 'IUCN terms',
    blurb:
      'The species extinction-risk reference. ~157k assessed, ~44k threatened (~28% of assessed) as of 2024.',
  },
  {
    slug: 'wwf-lpi',
    name: 'WWF Living Planet Index',
    url: 'https://livingplanet.panda.org/',
    org: 'WWF / ZSL',
    domain: ['biodiversity'],
    cadence: 'biennial',
    license: 'Open',
    blurb:
      '2024 report: 73% average decline in monitored vertebrate populations since 1970. Contested methodology, but directional.',
  },

  // AI
  {
    slug: 'stanford-ai-index',
    name: 'Stanford AI Index',
    url: 'https://aiindex.stanford.edu/report/',
    org: 'Stanford HAI',
    domain: ['ai'],
    cadence: 'annual',
    license: 'CC-BY-ND',
    blurb:
      'The closest thing to a state-of-AI annual report. Compute, capability, capital, regulation.',
  },
  {
    slug: 'epoch-ai',
    name: 'Epoch AI',
    url: 'https://epochai.org/',
    org: 'Epoch AI',
    domain: ['ai'],
    cadence: 'continuous',
    license: 'CC-BY',
    blurb:
      'Compute trends. Frontier-model training data. The numbers behind the AI scaling debates.',
  },

  // DEMOCRACY
  {
    slug: 'v-dem',
    name: 'V-Dem Institute',
    url: 'https://www.v-dem.net/',
    org: 'University of Gothenburg',
    domain: ['democracy'],
    cadence: 'annual (March)',
    license: 'Open',
    blurb:
      'The serious democracy-measurement dataset. Liberal democracy, electoral autocracy, polyarchy indices.',
  },

  // MINERALS
  {
    slug: 'usgs-critical-minerals',
    name: 'USGS Critical Minerals Program',
    url: 'https://www.usgs.gov/programs/mineral-resources-program',
    org: 'USGS',
    domain: ['minerals'],
    cadence: 'continuous; major list updates every 3 years',
    license: 'Public domain (US Federal)',
    blurb:
      '2025 list: 60 critical minerals. Per-commodity supply-disruption modelling. The reference.',
  },

  // SHIPPING (also covered in shipping research)
  {
    slug: 'alphaliner',
    name: 'Alphaliner Top 100',
    url: 'https://alphaliner.axsmarine.com/PublicTop100/',
    org: 'Alphaliner / AXSMarine',
    domain: ['shipping'],
    cadence: 'monthly',
    license: 'Public summary (paid full)',
    blurb: 'Container carrier fleet ranking. The single most-cited source on liner capacity.',
  },
];

export function dataSourcesByDomain(domain: Domain): DataSource[] {
  return DATA_SOURCES.filter((s) => s.domain.includes(domain));
}

export const ALL_DOMAINS: Domain[] = [
  'climate',
  'energy',
  'economy',
  'demography',
  'security',
  'food',
  'health',
  'biodiversity',
  'ai',
  'democracy',
  'shipping',
  'minerals',
];
