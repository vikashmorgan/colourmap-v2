export type Confidence = 'HIGH' | 'MED' | 'LOW';

export type SourceQuality = 'primary' | 'secondary' | 'blog';

export type Source = {
  ref: number;
  title: string;
  url: string;
  date: string;
  quality?: SourceQuality;
};

export type ChangelogEntry = {
  at: string;
  note: string;
};

export type Timeframe = 'now' | 'this-decade' | 'long-arc';

export type Page = {
  slug: string;
  title: string;
  bluf: string;
  body: string;
  confidence: Confidence;
  lastVerified: string;
  dependsOn: string[];
  feedsInto: string[];
  related: string[];
  entities: string[];
  tags?: string[];
  timeframe?: Timeframe;
  sources: Source[];
  changelog?: ChangelogEntry[];
};

export const ALL_TAGS = [
  'chokepoint',
  'tankers',
  'containers',
  'iran-axis',
  'cma-cgm',
  'war-risk',
  'decarbonisation',
  'ai',
  'media',
  'france',
  'energy-transition',
  'climate',
  'alliances',
  'trumpism',
  'biodiversity',
] as const;

export type Tag = (typeof ALL_TAGS)[number];

export function pagesByTag(
  tag: string,
): { categorySlug: string; programSlug: string; chapterSlug: string; page: Page }[] {
  const out: { categorySlug: string; programSlug: string; chapterSlug: string; page: Page }[] = [];
  for (const category of GEOPOLITICS_CATEGORIES) {
    for (const program of category.programs) {
      for (const chapter of program.chapters) {
        for (const page of chapter.pages) {
          if (page.tags?.includes(tag)) {
            out.push({
              categorySlug: category.slug,
              programSlug: program.slug,
              chapterSlug: chapter.slug,
              page,
            });
          }
        }
      }
    }
  }
  return out;
}

export function allUsedTags(): string[] {
  const set = new Set<string>();
  for (const category of GEOPOLITICS_CATEGORIES) {
    for (const program of category.programs) {
      for (const chapter of program.chapters) {
        for (const page of chapter.pages) {
          for (const tag of page.tags ?? []) set.add(tag);
        }
      }
    }
  }
  return Array.from(set).sort();
}

export const CONFIDENCE_DEFINITION: Record<Confidence, string> = {
  HIGH: 'Multiple independent primary sources corroborate this claim. Adversarial verification ≥2/3.',
  MED: 'One primary or several secondary sources. Treat as directional, not final.',
  LOW: 'A single source or contested attribution. Read with explicit doubt.',
};

export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - then) / (1000 * 60 * 60 * 24)));
}

export type Chapter = {
  slug: string;
  title: string;
  number: number;
  pages: Page[];
};

export type Program = {
  slug: string;
  title: string;
  blurb: string;
  durationMinutes: number;
  chapters: Chapter[];
};

export type Tier = 'now' | 'decade' | 'horizon';

export type Category = {
  slug: string;
  title: string;
  blurb: string;
  tier: Tier;
  /** Accent colour (hex). Drives the gradient cover and tinted reader. */
  tint: string;
  /** Optional public image (e.g. /world/hormuz.webp). Procedural cover used if absent. */
  cover?: string;
  programs: Program[];
};

export const TIER_DEFINITION: Record<Tier, { title: string; oneLiner: string }> = {
  now: {
    title: 'Now',
    oneLiner: 'The breaking world. Last 30 days, live status, evolving threads.',
  },
  decade: {
    title: 'Decade',
    oneLiner: 'The world we are in. 2024-2034. Structural forces, named players, current dynamics.',
  },
  horizon: {
    title: 'Horizon',
    oneLiner:
      'The world we are walking into. 2030-2050. Long-arc forecasts, turning points, calibrated bets.',
  },
};

export const TIER_ORDER: Tier[] = ['now', 'decade', 'horizon'];

const SOURCE_EIA: Source = {
  ref: 1,
  title: 'EIA — Strait of Hormuz fact sheet',
  url: 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints',
  date: '2025-12',
  quality: 'primary',
};
const SOURCE_HOWDEN: Source = {
  ref: 2,
  title: 'Howden Re — Strait of Hormuz report, March 2026',
  url: 'https://www.howdenre.com/sites/howdenre.howdenprod.com/files/2026-03/HowdenRe_Strait_of_Hormuz_report_March272026.pdf',
  date: '2026-03',
  quality: 'primary',
};
const SOURCE_BELFER: Source = {
  ref: 3,
  title: "Belfer Center — Degradation of Iran's proxy model",
  url: 'https://www.belfercenter.org/research-analysis/degradation-irans-proxy-model',
  date: '2026',
  quality: 'primary',
};
const SOURCE_CSIS_RU_IR: Source = {
  ref: 4,
  title: 'CSIS — Understanding the growing collaboration between Russia and Iran',
  url: 'https://www.csis.org/analysis/understanding-growing-collaboration-between-russia-and-iran',
  date: '2025',
  quality: 'primary',
};
const SOURCE_ALPHALINER: Source = {
  ref: 5,
  title: 'Alphaliner Top 100, January 2026',
  url: 'https://alphaliner.axsmarine.com/PublicTop100/',
  date: '2026-01',
  quality: 'primary',
};
const SOURCE_CMACGM_2024: Source = {
  ref: 6,
  title: 'CMA CGM Annual Financial Results 2024',
  url: 'https://api.cmacgm-group.com/en/news-media/2024-annual-financial-results',
  date: '2025-03',
  quality: 'primary',
};
const SOURCE_CMACGM_2025: Source = {
  ref: 7,
  title: 'CMA CGM Annual Financial Results 2025',
  url: 'https://www.cmacgm-group.com/en/news-media/annual-financial-results-2025',
  date: '2026-03',
  quality: 'primary',
};
const SOURCE_CSIS_INSTC: Source = {
  ref: 8,
  title: 'CSIS — Resilience through linkage: Russia, Iran and the INSTC',
  url: 'https://www.csis.org/analysis/resilience-through-linkage-russia-iran-and-aspirations-north-south-trade',
  date: '2025',
  quality: 'primary',
};
const SOURCE_IEA: Source = {
  ref: 9,
  title: 'IEA emergency oil stocks releases — record 400M-bbl drawdown',
  url: 'https://www.iea.org/',
  date: '2026-03',
  quality: 'primary',
};
const SOURCE_KYUTAI: Source = {
  ref: 10,
  title: "CMA CGM — launch of Kyutai, Europe's first independent AI open-science lab",
  url: 'https://www.cmacgm-group.com/en/news-media/launch-kyutai-europes-first-independent-research-lab-dedicated-ai-open-science',
  date: '2023-11',
  quality: 'primary',
};
const SOURCE_MISTRAL: Source = {
  ref: 11,
  title: 'CMA CGM × Mistral AI — five-year custom AI partnership',
  url: 'https://www.cmacgm-group.com/en/news-media/cma-cgm-group-adopts-custom-designed-ai-solutions-mistral-ai',
  date: '2025-04',
  quality: 'primary',
};
const SOURCE_GCP_2024: Source = {
  ref: 20,
  title: 'Global Carbon Project — Global Carbon Budget 2024',
  url: 'https://globalcarbonbudget.org/',
  date: '2024-11',
  quality: 'primary',
};
const SOURCE_C3S: Source = {
  ref: 21,
  title: 'Copernicus C3S — 2024 first year over 1.5°C',
  url: 'https://climate.copernicus.eu/',
  date: '2025-01',
  quality: 'primary',
};
const SOURCE_DITLEVSEN: Source = {
  ref: 22,
  title: 'Ditlevsen & Ditlevsen — Warning of forthcoming AMOC collapse, Nature Communications',
  url: 'https://www.nature.com/articles/s41467-023-39810-w',
  date: '2023-07',
  quality: 'primary',
};
const SOURCE_IPCC_AR6: Source = {
  ref: 23,
  title: 'IPCC AR6 WG1 — Sixth Assessment Report, Physical Science Basis',
  url: 'https://www.ipcc.ch/report/ar6/wg1/',
  date: '2021-08',
  quality: 'primary',
};
const SOURCE_UN_WPP: Source = {
  ref: 24,
  title: 'UN DESA — World Population Prospects 2024',
  url: 'https://population.un.org/wpp/',
  date: '2024-07',
  quality: 'primary',
};
const SOURCE_WBANK: Source = {
  ref: 25,
  title: 'World Bank Open Data — WDI portal',
  url: 'https://data.worldbank.org/',
  date: '2025-12',
  quality: 'primary',
};
const SOURCE_FAOSTAT: Source = {
  ref: 26,
  title: 'FAOSTAT (CC-BY 4.0)',
  url: 'https://www.fao.org/faostat/en/',
  date: '2025-12',
  quality: 'primary',
};
const SOURCE_SIPRI: Source = {
  ref: 27,
  title: 'SIPRI Military Expenditure Database',
  url: 'https://www.sipri.org/databases/milex',
  date: '2025-04',
  quality: 'primary',
};
const SOURCE_OWID: Source = {
  ref: 28,
  title: 'Our World in Data',
  url: 'https://ourworldindata.org/',
  date: '2025-12',
  quality: 'primary',
};
const SOURCE_GFW: Source = {
  ref: 29,
  title: 'Global Forest Watch — tropical primary forest loss 2024',
  url: 'https://www.globalforestwatch.org/',
  date: '2025-04',
  quality: 'primary',
};
const SOURCE_LPI_2024: Source = {
  ref: 30,
  title: 'WWF Living Planet Report 2024',
  url: 'https://livingplanet.panda.org/',
  date: '2024-10',
  quality: 'primary',
};
const SOURCE_STANFORD_AI: Source = {
  ref: 31,
  title: 'Stanford AI Index 2025',
  url: 'https://aiindex.stanford.edu/report/',
  date: '2025-04',
  quality: 'primary',
};
const SOURCE_IEA_WEO: Source = {
  ref: 32,
  title: 'IEA World Energy Outlook 2025',
  url: 'https://www.iea.org/reports/world-energy-outlook-2025',
  date: '2025-10',
  quality: 'primary',
};
const SOURCE_ECFR_DEFENCE: Source = {
  ref: 33,
  title: 'ECFR — Making defence European again',
  url: 'https://ecfr.eu/publication/making-defence-european-again/',
  date: '2025-09',
  quality: 'primary',
};
const SOURCE_EU_SAFE: Source = {
  ref: 34,
  title: 'Council of the EU — SAFE €150bn defence loans, in force 29 May 2025',
  url: 'https://www.consilium.europa.eu/en/press/press-releases/',
  date: '2025-05',
  quality: 'primary',
};
const SOURCE_CSIS_NORTHWOOD: Source = {
  ref: 35,
  title: 'CSIS — Northwood Declaration & the future of European deterrence',
  url: 'https://www.csis.org/analysis/northwood-declaration-future-european-deterrence',
  date: '2025-07',
  quality: 'primary',
};
const SOURCE_USGS_CM_2025: Source = {
  ref: 40,
  title: 'USGS Open-File Report 2025-1047 — 2025 Critical Minerals List',
  url: 'https://pubs.usgs.gov/of/2025/1047/ofr20251047.pdf',
  date: '2025-11',
  quality: 'primary',
};
const SOURCE_EU_CRMA: Source = {
  ref: 41,
  title: 'EU Critical Raw Materials Act (in force May 2024)',
  url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en',
  date: '2024-05',
  quality: 'primary',
};
const SOURCE_MOFCOM_46: Source = {
  ref: 42,
  title: 'MOFCOM Announcement 2024 No. 46 — export controls on Ga, Ge, Sb, graphite',
  url: 'https://cset.georgetown.edu/publication/china-rare-earth-export-ban/',
  date: '2024-12',
  quality: 'primary',
};
const SOURCE_WOOD_MAC: Source = {
  ref: 43,
  title: 'Wood Mackenzie — Copper outlook 2035',
  url: 'https://www.woodmac.com/',
  date: '2025-09',
  quality: 'secondary',
};
const SOURCE_IEA_CM_OUTLOOK: Source = {
  ref: 44,
  title: 'IEA Critical Minerals Outlook 2025',
  url: 'https://www.iea.org/reports/global-critical-minerals-outlook-2025',
  date: '2025-05',
  quality: 'primary',
};

// AFRICA sources
const SOURCE_UNECA_DEMOG: Source = {
  ref: 50,
  title: "UNECA — Africa's population crosses 1.5 billion (demographic window)",
  url: 'https://www.uneca.org/stories/(blog)-as-africa%E2%80%99s-population-crosses-1.5-billion,-the-demographic-window-is-opening-getting',
  date: '2025',
  quality: 'primary',
};
const SOURCE_ISS_FUTURES: Source = {
  ref: 51,
  title: 'ISS African Futures — Demographic Dividend thematic guide',
  url: 'https://futures.issafrica.org/thematic/guide.pdf?thematic=03-demographic-dividend',
  date: '2026-03',
  quality: 'primary',
};
const SOURCE_AFRIPOLI_DRC: Source = {
  ref: 52,
  title:
    "AfriPoli — Navigating critical mineral supply chains: EU's partnerships with the DRC and Zambia",
  url: 'https://afripoli.org/navigating-critical-mineral-supply-chains-the-eus-partnerships-with-the-drc-and-zambia',
  date: '2024',
  quality: 'primary',
};
const SOURCE_IPCC_AR6_WG2_AFRICA: Source = {
  ref: 53,
  title: 'IPCC AR6 WG2 Chapter 9 — Africa',
  url: 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-9/',
  date: '2022',
  quality: 'primary',
};
const SOURCE_GCA_ADAPT_2023: Source = {
  ref: 54,
  title: 'Global Center on Adaptation — State and Trends in Climate Adaptation Finance 2023',
  url: 'https://gca.org/wp-content/uploads/2023/12/State-and-Trends-in-Climate-Adaptation-Finance-2023_WEB.pdf',
  date: '2023-12',
  quality: 'primary',
};
const SOURCE_ISS_AES: Source = {
  ref: 55,
  title: 'ISS Africa — Will the AES Unified Force succeed where the G5 Sahel failed?',
  url: 'https://issafrica.org/iss-today/will-the-aes-unified-force-succeed-where-the-g5-sahel-failed',
  date: '2026-02',
  quality: 'primary',
};
const SOURCE_CHATHAM_FOCAC: Source = {
  ref: 56,
  title: 'Chatham House — China-Africa summit: why the continent has more options than ever',
  url: 'https://www.chathamhouse.org/2024/09/china-africa-summit-why-continent-has-more-options-ever',
  date: '2024-09',
  quality: 'primary',
};
const SOURCE_BU_GDP_FOCAC: Source = {
  ref: 57,
  title: 'Boston University GDP Center — Back in action: the Ninth FOCAC',
  url: 'https://www.bu.edu/gdp/2024/10/15/back-in-action-the-ninth-forum-on-china-africa-cooperation-sees-renewed-relations-and-development-prospects/',
  date: '2024-10',
  quality: 'primary',
};

// MIDDLE EAST sources
const SOURCE_CARNEGIE_DIWAN: Source = {
  ref: 60,
  title: 'Carnegie Middle East — The Iran crisis in a new geopolitical moment',
  url: 'https://carnegieendowment.org/middle-east/diwan/2026/02/the-iran-crisis-in-a-new-geopolitical-moment',
  date: '2026-02',
  quality: 'primary',
};
const SOURCE_CARNEGIE_SHOCKWAVES: Source = {
  ref: 61,
  title: 'Carnegie Middle East — Shockwaves across the Gulf',
  url: 'https://carnegieendowment.org/middle-east/diwan/2026/03/shockwaves-across-the-gulf',
  date: '2026-03',
  quality: 'primary',
};
const SOURCE_CRS_IRAN_STRIKES: Source = {
  ref: 62,
  title: 'Congressional Research Service — U.S. Strikes on Nuclear Sites in Iran (IN12571)',
  url: 'https://crsreports.congress.gov/',
  date: '2025-06',
  quality: 'primary',
};
const SOURCE_IISS_QUADRILATERAL: Source = {
  ref: 63,
  title: 'IISS — A new Middle Eastern quadrilateral is taking shape',
  url: 'https://www.iiss.org/',
  date: '2026-05',
  quality: 'primary',
};
const SOURCE_UNSC_SYRIA: Source = {
  ref: 64,
  title: 'UNSC delisting of al-Sharaa & Khattab (14-0, China abstaining)',
  url: 'https://www.un.org/securitycouncil/',
  date: '2025-11',
  quality: 'primary',
};

const HORMUZ_BRIEFING: Program = {
  slug: 'hormuz-briefing',
  title: 'Hormuz Crisis Briefing',
  blurb:
    'Strait of Hormuz: what flows, who controls it, what 2026 did to it, and what it means for shipping.',
  durationMinutes: 75,
  chapters: [
    {
      slug: 'what-is-hormuz',
      title: 'What is the Strait of Hormuz?',
      number: 1,
      pages: [
        {
          slug: 'hormuz-geography',
          title: 'Hormuz is a 21-mile pinch between Iran and Oman',
          bluf: 'Picture the Persian Gulf as a swimming pool. Hormuz is the door. About 21 nautical miles wide at the narrowest — and Iran sits on one side of it.',
          body:
            'The Strait connects the Gulf (where most of the oil is) to the Gulf of Oman, and from there to the open Arabian Sea. Iran owns the north shore. Oman owns the south — a thumb of land called the Musandam peninsula. ' +
            'Tankers transit in one of two lanes about two miles wide each, separated by a two-mile median. Every ship that passes does so within easy missile, drone, and fast-boat range of the Iranian coast. ' +
            'That geographic fact is the source of every other fact in this chapter. The rest is just consequences.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: [],
          feedsInto: ['hormuz-oil-share', 'iran-leverage'],
          related: [],
          entities: ['strait-of-hormuz', 'iran', 'oman'],
          sources: [SOURCE_EIA],
        },
        {
          slug: 'hormuz-oil-share',
          title: '~20% of global oil moves through Hormuz',
          bluf: 'Every fifth barrel of oil the world consumes passes through Hormuz. About 20 million barrels a day.',
          body:
            'The EIA pegs Hormuz throughput at ~20.9 mb/d in the first half of 2025 — roughly 20% of global oil supply, plus a chunky share of LNG. ' +
            'It is overwhelmingly a tanker road, not a container road. Saudi, UAE, Iraqi, Kuwaiti, Qatari and Iranian crude moves out westbound. Qatari LNG moves out toward Europe and Asia. Container ships pass through too, but they are a footnote. ' +
            "So a quick rule: when the news says 'Hormuz', think oil. When it says 'Red Sea' or 'Bab el-Mandeb', think containers. Confusing the two is the most common Hormuz mistake.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['hormuz-geography'],
          feedsInto: ['iran-leverage', 'hormuz-vs-redsea'],
          related: ['hormuz-vs-redsea'],
          entities: ['strait-of-hormuz', 'saudi-arabia', 'uae', 'qatar', 'iran'],
          sources: [SOURCE_EIA, SOURCE_HOWDEN],
        },
        {
          slug: 'iran-leverage',
          title: "Hormuz is Iran's biggest non-nuclear lever",
          bluf: "Iran can't slam Hormuz shut for long. It doesn't have to. Even two weeks of looking dangerous costs the world tens of billions.",
          body:
            'Iran owns the north shore — Bandar Abbas, Larak, Qeshm. Fast boats, missiles, mines, and plenty of coastline to launch from. ' +
            'A determined US-led coalition can keep the Strait open. But "open" and "open within five days" are different things. Minefields take weeks to clear. Insurance markets reprice in hours. ' +
            "And that's the asymmetry. Iran doesn't have to win a war. It just has to make Hormuz look unsafe long enough for underwriters to flinch. Which is exactly what happened in late February 2026.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['hormuz-oil-share'],
          feedsInto: ['war-risk-repricing', 'gulf-naval-presence'],
          related: ['axis-of-resistance-collapse'],
          entities: ['iran', 'irgc-navy', 'strait-of-hormuz', 'us-5th-fleet'],
          sources: [SOURCE_HOWDEN, SOURCE_BELFER],
        },
        {
          slug: 'hormuz-vs-redsea',
          title: 'Hormuz = tankers. Red Sea = containers.',
          bluf: 'Mixing the two up is the most common Hormuz mistake. Different straits, different ships, different consequences.',
          body:
            'Hormuz is mostly tankers — crude and LNG. So when something goes wrong there, what moves is the oil price, hull-insurance premiums, and bunker fuel. Container ships? Barely affected. ' +
            'The Red Sea — Bab el-Mandeb at the bottom, Suez at the top — is the container highway from Asia to Europe. When the Houthis fire from Yemen, container ships divert around the Cape of Good Hope. That adds 10-14 days each way and soaks up roughly 25% of global container capacity. ' +
            "So if you're CMA CGM: the Red Sea is the direct hit. Hormuz is the indirect one — through bunker fuel, through what oil prices do to your customers, through the reinsurance market.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['hormuz-oil-share'],
          feedsInto: ['cma-cgm-exposure'],
          related: ['iran-leverage'],
          entities: ['strait-of-hormuz', 'bab-el-mandeb', 'cma-cgm', 'houthis'],
          sources: [SOURCE_HOWDEN, SOURCE_EIA],
        },
        {
          slug: 'war-risk-repricing',
          title: 'War-risk premiums went 12x in March 2026',
          bluf: 'The cost of insuring a tanker through Hormuz jumped twelvefold in a month — from a sleepy ~0.2% of hull value to a panicked 2-3%. If your flag was American, British, or Israeli, you paid the top of that range.',
          body:
            'Howden Re — the specialty broker everyone in shipping insurance reads — laid it out. Pre-war: roughly 0.10 to 0.25% of hull value per transit. By peak in March 2026: 2-3%. The 3% ceiling was for vessels with US, UK, or Israeli ownership or flag. ' +
            'And it moved fast within the month. Howden Re shows ~2.5% in early March, easing to ~1% by late March as ceasefire signals strengthened. ' +
            'Put numbers on it. A 100,000 dwt tanker insured at $80 million? A $160-200k pre-war premium became $1.6-2.4 million per crossing at peak. This is the input every risk product touching a Gulf chokepoint has to model.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['iran-leverage'],
          feedsInto: ['epic-fury', 'oil-spike'],
          related: ['hormuz-vs-redsea'],
          entities: ['howden-re', 'lloyds-of-london', 'iumi'],
          sources: [SOURCE_HOWDEN],
        },
      ],
    },
    {
      slug: 'escalation-2026',
      title: 'How the 2025-2026 escalation unfolded',
      number: 2,
      pages: [
        {
          slug: 'twelve-day-war',
          title: "June 2025: the 12-day war exposed Iran's proxies as hollow",
          bluf: "When Israel and Iran went at it for 12 days in June 2025, the famous 'Axis of Resistance' essentially didn't show up.",
          body:
            'Four serious shops (Belfer, Clingendael, Washington Institute, Long War Journal) all reached the same conclusion. During the June 2025 war, the network of Iranian proxies — Hezbollah, the Iraqi PMFs (Kataib Hezbollah, Harakat al-Nujaba), and largely the Houthis — took no meaningful action to help Iran. ' +
            'Kataib Hezbollah went on record: not joining. Hezbollah stayed quiet. The Houthis fired one symbolic missile at Jaffa on 15 June, which analysts read as PR more than war. ' +
            "What does that mean going forward? If Iran retaliates against shipping, it'll mostly be Iran itself — IRGC boats, drones, mines around Hormuz. Not distributed proxy harassment. " +
            "One footnote: the Houthi Red Sea campaign is its own thing. They've been hitting container ships since 2023 on their own agenda, not Tehran's.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['iran-leverage'],
          feedsInto: ['epic-fury', 'axis-of-resistance-collapse'],
          related: ['hormuz-vs-redsea'],
          entities: ['iran', 'hezbollah', 'houthis', 'kataib-hezbollah'],
          sources: [SOURCE_BELFER],
        },
        {
          slug: 'epic-fury',
          title: '28 February 2026: Operation Epic Fury killed Khamenei',
          bluf: 'In about twelve hours, the US and Israel ran roughly 900 strikes on Iran. By the end of the day, Supreme Leader Ali Khamenei was dead.',
          body:
            'Operation Epic Fury was a joint US-Israeli operation on 28 February 2026. Around 900 strikes, twelve hours. ' +
            "Khamenei was killed. Nine independent sources — Belfer Center, Howden Re's specialty reinsurance report, Wikipedia, Al Jazeera, Axios, NPR, CNN, Britannica, the Soufan Center, and a US House Republican Policy Committee memo — all confirm both the strike date and the outcome. " +
            "Iran's chain of command shattered. The IRGC kept operating, but the regime's strategic posture entered a contested-leadership phase no one had planned for. " +
            'Everything else in the 2026 arc — Hormuz closure, the oil spike, the Gulf air-defence crisis — flows from this one day.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['twelve-day-war'],
          feedsInto: ['hormuz-closure', 'oil-spike'],
          related: ['war-risk-repricing'],
          entities: ['us-government', 'israel', 'iran', 'khamenei', 'irgc-navy'],
          tags: ['iran-axis', 'chokepoint', 'alliances'],
          timeframe: 'now',
          sources: [SOURCE_BELFER, SOURCE_HOWDEN],
          changelog: [
            {
              at: '2026-06-04',
              note: 'Initial publication. Adversarial verification 3-0 on strike date, vote 3-0 on Khamenei outcome.',
            },
            {
              at: '2026-06-09',
              note: 'Reviewed; no source disputes the headline facts. Specific vessel-attack tally for the same period was refuted 1-2 elsewhere — dropped from this page.',
            },
          ],
        },
        {
          slug: 'hormuz-closure',
          title: '4 March 2026: Iran declared the Strait closed',
          bluf: 'Four days after Khamenei was killed, Iran said out loud what everyone was waiting for: Hormuz is closed.',
          body:
            "On 4 March 2026, Iran formally declared the Strait of Hormuz 'closed'. Wikipedia, Al Jazeera, and Tufts Now all confirm. " +
            "Now — a declaration isn't a physical closure. Tankers kept transiting. They just paid much, much higher insurance, with rising background noise — vessel seizures, contested mine incidents, the sense that any Western-flagged hull was a target. " +
            'What the declaration actually did was give two groups cover. It gave underwriters cover to reprice. It gave traders cover to bid Brent higher. The market did the rest. ' +
            "One housekeeping note: some sources quote a specific tally of 28+ vessels attacked in this window. That number didn't survive adversarial verification. Don't repeat it without primary corroboration.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['epic-fury'],
          feedsInto: ['oil-spike', 'cma-cgm-exposure'],
          related: ['war-risk-repricing'],
          entities: ['iran', 'strait-of-hormuz'],
          sources: [SOURCE_HOWDEN],
        },
        {
          slug: 'oil-spike',
          title: 'Brent peaked at $119 on 19 March 2026 (+46%)',
          bluf: 'Oil went from $71 to $119 in three weeks. The IEA opened the emergency taps — 400 million barrels, the biggest release in its history. That covered about twenty days of Hormuz flow.',
          body:
            "CNBC clocked the $119 peak on 19 March 2026. Brent had briefly hit that level on a Netanyahu signal that Hormuz might reopen. From the $72 pre-war baseline, that's +46% in three weeks. US gas station signs flipped to $3.94 a gallon by 22 March — the first time above ~$4 since August 2022. " +
            'The IEA coordinated its biggest-ever emergency release: 400 million barrels, roughly 20 days of normal Hormuz throughput (~20.9 mb/d). It was directional — buying time, not solving anything. ' +
            'If you run container ships, the absolute oil price matters less than the second-order channels. Bunker fuel tracks Brent. Customer demand softens when oil is high. And hull-insurance rates tighten across the whole fleet, lagging spot by a few weeks.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['hormuz-closure'],
          feedsInto: ['cma-cgm-exposure'],
          related: ['war-risk-repricing'],
          entities: ['iea', 'brent', 'opec'],
          sources: [SOURCE_HOWDEN, SOURCE_IEA],
        },
        {
          slug: 'cma-cgm-exposure',
          title: "CMA CGM's exposure is mostly indirect — but it is large",
          bluf: "CMA CGM doesn't push many boxes through Hormuz. The hit lands sideways — bunker fuel, reinsurance, customers whose budgets get crushed when oil spikes.",
          body:
            'CMA CGM runs ~4.14 M TEU of container capacity (#3 globally) with the most aggressive orderbook in the top 10 (45.5% of fleet). Direct Hormuz container transit is small — Hormuz is a tanker road, not a container road. ' +
            "But the indirect hit is real. Bunker fuel tracks Brent — that +46% spike flows into ship fuel within weeks. Reinsurance pass-through tightens hull rates across the whole fleet. And the group's customers — automakers, retailers, food shippers — go cold on volume when fuel is expensive. " +
            "There's a geographic layer too. CMA Terminals owns big stakes in Sokhna (Red Sea), Jeddah (Red Sea), and Mombasa (East Africa). Hormuz makes the headlines. The Red Sea is where containers actually break.",
          confidence: 'MED',
          lastVerified: '2026-06-04',
          dependsOn: ['oil-spike'],
          feedsInto: ['top-3'],
          related: ['hormuz-vs-redsea', 'war-risk-repricing'],
          entities: ['cma-cgm', 'sokhna-terminal', 'jeddah-terminal', 'mombasa-terminal'],
          sources: [SOURCE_ALPHALINER, SOURCE_HOWDEN],
        },
      ],
    },
    {
      slug: 'alignment',
      title: 'Who is backing whom',
      number: 3,
      pages: [
        {
          slug: 'axis-of-resistance-collapse',
          title: "Iran's proxy network is structurally degraded",
          bluf: "The proxy network used to be Iran's whole deterrence story. It sat out both the 12-day war and the 2026 escalation. The story doesn't work anymore.",
          body:
            'Before 2023, Iran could threaten distributed retaliation through a real bench: Hezbollah, Hamas, Kataib Hezbollah, the Houthis, other Iraqi PMFs. The threat had teeth. ' +
            "By mid-2025, the bench was thinned out. Sustained Israeli strikes — Hamas in Gaza, Hezbollah in Lebanon, Houthi infrastructure in Yemen — plus the rising cost of being seen as an Iranian instrument while Tehran couldn't protect you. " +
            'During the June 2025 12-day war and through the February 2026 escalation, the network simply did not act. ' +
            "Be careful with one specific claim: some sources say the Houthis 'abandoned regional projection' after US Operation Rough Rider 2025. That was refuted — Houthi Red Sea activity continues independently. The cleaner read: the Axis collapsed as a coordinated network. Individual nodes still operate, but on their own agenda.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['twelve-day-war'],
          feedsInto: ['russia-iran'],
          related: ['epic-fury'],
          entities: ['hezbollah', 'houthis', 'hamas', 'iraqi-pmfs'],
          sources: [SOURCE_BELFER],
        },
        {
          slug: 'russia-iran',
          title: 'Russia and Iran are formally aligned through 2045',
          bluf: "Russia and Iran signed a twenty-year partnership treaty in January 2025. Defence, cyber, energy, security — all of it. It's not friendship, it's shared exposure to the same sanctions regime.",
          body:
            "First, in December 2023, the two governments put out a joint declaration on 'counteracting unilateral coercive measures'. Translation: sanctions evasion is now a shared project, on paper. " +
            'Then in January 2025 they signed the actual treaty — a 20-year Comprehensive Strategic Partnership covering defence, cyber, energy, and security. ' +
            "CSIS puts it bluntly: both governments now frame the United States and its allies as their principal security threat. The alignment isn't about sentiment. It's about both regimes living under the same sanctions architecture. " +
            'A small but important distinction: the December 2023 instrument is a declaration, not a treaty. The treaty came in January 2025.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['axis-of-resistance-collapse'],
          feedsInto: ['instc', 'china-asymmetric'],
          related: [],
          entities: ['russia', 'iran', 'putin', 'pezeshkian'],
          sources: [SOURCE_CSIS_RU_IR],
        },
        {
          slug: 'instc',
          title: 'INSTC is the sanctions-bypass corridor being built right now',
          bluf: "There's an actual road, rail, and shipping route being built right now to move goods between Russia, Iran, and India without touching the West. Russia is putting €1.3 billion into one rail segment alone.",
          body:
            "The INSTC — International North-South Transport Corridor — is a 7,200 km mash-up of roads, railways, and shipping lanes connecting Russia to the Persian Gulf to India, threading through the South Caucasus and Central Asia. The idea isn't new; Russia, Iran, and India started it in 2000. " +
            'What changed after 2022 is the urgency. Russia treats it openly as sanctions-bypass infrastructure now. The key choke segment is the Rasht-Astara railway inside Iran — Russia is covering €1.3 bn of the €1.6 bn cost, targeting Q3 2027. ' +
            "Iran and Russia signed a 'transit roadmap for 2025' on 18 February 2025. Putin and Pezeshkian have publicly recommitted. CSIS calls it 'a clear Russian and Iranian commitment to creating a trade route that could bypass Western sanctions.' " +
            "If you want to know what 'Russia-Iran alignment' looks like in the real world — concrete poured, rails laid — this is it. Not a treaty paragraph. A corridor.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['russia-iran'],
          feedsInto: [],
          related: [],
          entities: ['russia', 'iran', 'india', 'instc'],
          sources: [SOURCE_CSIS_INSTC],
        },
        {
          slug: 'china-asymmetric',
          title: 'China is in the alignment but not in a hurry',
          bluf: "China is aligned with Russia and Iran on paper. It's just not in a hurry about it. Beijing watched the March 2026 Gulf crisis with declared neutrality — even as 25% of its Gulf crude imports dried up.",
          body:
            "CSIS frames it sharply: the Russia-China-Iran alignment is 'strategic and urgent for Russia and Iran, strategic but not urgent for China.' Beijing has a longer horizon and keeps diversifying its bets, even with real exposure to all of it. " +
            'Through the March 2026 crisis: declared neutrality. Gulf crude imports dropped ~25%. Iranian oil shortfall ran 1-1.4 mb/d. ' +
            "And there's a lot of Chinese skin in the game — Belt and Road ports at Gwadar (Pakistan), Djibouti, Piraeus, Haifa. Plenty of chokepoint exposure. But Beijing reads Hormuz as a logistics-and-price problem, not an existential one. " +
            "Worth noting: one claim circulating in some sources — that Russia and China actually reduced support to Iran in 2025-2026 — didn't survive adversarial verification. The directional evidence runs the opposite way.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['russia-iran'],
          feedsInto: [],
          related: ['cma-cgm-exposure'],
          entities: ['china', 'cosco', 'belt-and-road'],
          sources: [SOURCE_CSIS_RU_IR],
        },
      ],
    },
  ],
};

const SHIPPING_BIG_NINE: Program = {
  slug: 'shipping-industry',
  title: 'How container shipping actually works',
  blurb: 'The ship, the box, the carriers, the alliances, and how they make money (or lose it).',
  durationMinutes: 60,
  chapters: [
    {
      slug: 'the-big-9',
      title: 'The Big 9 carriers, ranked',
      number: 1,
      pages: [
        {
          slug: 'top-3',
          title: 'Top 3 carriers control nearly half of global capacity',
          bluf: "Three boxes carry half the world's containers. MSC (Geneva), Maersk (Copenhagen), CMA CGM (Marseille). About 46% of capacity, between them.",
          body:
            'As of January 2026 (Alphaliner): MSC at 7.136 M TEU (+13.2% YoY), Maersk at 4.612 M TEU, CMA CGM at 4.140 M TEU. ' +
            'The three together are about 46% of global capacity. The top 10 collectively control ~84%. ' +
            'MSC pulled decisively ahead in 2025, alone responsible for 39% of top-12 growth and widening its lead over Maersk to 2.524 M TEU. ' +
            'CMA CGM holds #3 with the most aggressive orderbook in the top 10 — 45.5% of existing fleet on order, vs an industry average of ~33.5%.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: [],
          feedsInto: ['alliances', 'cma-cgm-strategy'],
          related: [],
          entities: ['msc', 'maersk', 'cma-cgm'],
          sources: [SOURCE_ALPHALINER],
        },
        {
          slug: 'alliances',
          title: 'There are three alliances now — and MSC is in none of them',
          bluf: 'Carriers group up so they can share ships and split routes. There are three of these alliances right now. MSC — the biggest carrier on Earth — is in none of them.',
          body:
            'The old 2M alliance (Maersk + MSC) ended in early 2025. The new board: ' +
            '**Gemini** — Maersk + Hapag-Lloyd. Their pitch is schedule reliability via hub-and-spoke routing. ' +
            '**Premier** — ONE + HMM + Yang Ming. The successor to "THE Alliance" after MSC walked out. ' +
            '**Ocean Alliance** — CMA CGM + COSCO + Evergreen. The biggest by combined capacity. Locked in through ~2032. ' +
            "And then **MSC**. Operates alone on most lanes, because at 7.1 M TEU it doesn't need anyone. " +
            'Why does this matter for a geopolitics reader? Because when a single disruption hits — Hormuz, Red Sea, Panama — the alliance decides how the pain spreads. Gemini reshuffles spokes. Premier shares slots. Ocean spreads the cost across three carriers. MSC absorbs it solo.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['top-3'],
          feedsInto: ['cma-cgm-strategy', 'orderbook'],
          related: [],
          entities: ['gemini-alliance', 'premier-alliance', 'ocean-alliance', 'msc'],
          sources: [SOURCE_ALPHALINER],
        },
        {
          slug: 'orderbook',
          title: 'The orderbook is at a 15-year high',
          bluf: 'Container shipowners have ordered more new ships than at any point since 2010. About one new ship for every three already sailing. CMA CGM alone has ordered nearly half of its existing fleet.',
          body:
            'Clarksons data: the global container orderbook is at a 15-year high. As a share of fleet: industry sits at ~33.5%, COSCO at 38.1%, CMA CGM at 45.5%. ' +
            'All those new ships deliver between 2026 and 2028 — into a world where demand growth has slowed. ' +
            'Unless geopolitics keeps eating capacity, the math is brutal: too many boxes, too few cargoes. Houthi-driven Red Sea reroutings around the Cape absorbed roughly 25% of effective capacity in 2024 — pure supply discipline that has nothing to do with what any carrier wanted. ' +
            'So the strategic question for every carrier through 2027 is the same. Scrap old ships aggressively, hope geopolitics stays bad, or eat the rate pressure. Each carrier is betting differently.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['top-3'],
          feedsInto: ['cma-cgm-strategy'],
          related: ['cma-cgm-exposure'],
          entities: ['clarksons', 'cma-cgm', 'cosco'],
          sources: [SOURCE_ALPHALINER],
        },
      ],
    },
    {
      slug: 'cma-cgm-strategy',
      title: 'The CMA CGM Group',
      number: 2,
      pages: [
        {
          slug: 'cma-cgm-strategy',
          title: 'CMA CGM is the conglomerate hiding inside a container carrier',
          bluf: "Most people see CMA CGM as a French container shipping company. It's actually a conglomerate. Shipping, plus a top-5 global logistics arm, plus a media empire, plus a serious AI bet, plus terminals, plus air cargo.",
          body:
            'Group revenue tells the story: $55.5 bn in 2024 (+18% YoY, 24.2% EBITDA margin), then $54.4 bn in 2025 as the freight cycle normalised (19.4% margin). ' +
            "Four headline buckets. **Shipping** — 4.140 M TEU, #3 globally. **Logistics** — CEVA at $18.3 bn revenue, top-4 globally, integrated with Bolloré Logistics in February 2024. **Media** — the Altice Media deal closed July 2024 for ~€1.55 bn, giving CMA CGM BFM TV, BFM Business, RMC. France's self-described third-largest private media group. **AI / Digital** — €500 m committed in total. " +
            "This is the conglomerate Saadé's team is actually building. If you're pitching into it, pitch into the conglomerate — not just the shipping line.",
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['top-3'],
          feedsInto: ['cma-cgm-ai'],
          related: ['cma-cgm-exposure'],
          entities: ['cma-cgm', 'ceva-logistics', 'cma-media', 'bollore-logistics'],
          sources: [SOURCE_CMACGM_2024, SOURCE_CMACGM_2025],
        },
        {
          slug: 'cma-cgm-ai',
          title: '€500m AI commitment, anchored by Kyutai and Mistral',
          bluf: 'CMA CGM has put €500 million into AI. Co-founded Kyutai. Signed a five-year €100 m partnership with Mistral. As of 1 June 2026, an agentic platform called MAIA started rolling out to 80,000 employees.',
          body:
            "Saadé framed the bet himself at Kyutai's launch: 'place France and the rest of Europe at the forefront of artificial intelligence research' and 'I would like the younger generation to benefit from all the opportunities that this technology has to offer.' Worth quoting verbatim, because those two lines map exactly to what any young French builder needs to know before pitching this group. " +
            'The stack: **Kyutai** — co-founded November 2023 at Station F with Iliad/Niel and Schmidt Futures; CMA CGM put in €100 m. **Google Cloud** strategic partnership, July 2024, AI across shipping, logistics, media. **Mistral AI** — five years, €100 m, April 2025, with a Mistral AI Factory at the Marseille HQ and an AI Media Lab at Grand Central. About 20 Mistral engineers embedded. Plus investments in AMI Labs (Yann LeCun, March 2026 $1.03 bn round at $3.5 bn), Poolside, Dataiku, Perplexity. ' +
            "And then there's **MAIA**, the group's agentic platform built on Mistral. Rolling out to ~80,000 employees across CMA CGM, CEVA, and CMA Media starting 1 June 2026. 55+ projects, 200+ use cases as of late May 2026. " +
            'If you want to build something for this group, MAIA is the docking surface. Any new agent — including a Geopolitics Intel agent — slots in here.',
          confidence: 'HIGH',
          lastVerified: '2026-06-04',
          dependsOn: ['cma-cgm-strategy'],
          feedsInto: [],
          related: [],
          entities: ['cma-cgm', 'mistral', 'kyutai', 'maia', 'saade'],
          sources: [SOURCE_KYUTAI, SOURCE_MISTRAL],
        },
      ],
    },
  ],
};

const WORLD_2050_PROGRAM: Program = {
  slug: 'world-2050-program',
  title: 'The World in 2050',
  blurb: 'Where the data is, where the climate is heading, where AI is heading, where people are.',
  durationMinutes: 70,
  chapters: [
    {
      slug: 'how-we-know',
      title: 'How we know what we know',
      number: 1,
      pages: [
        {
          slug: 'authoritative-data',
          title: 'A small set of canonical portals carry most of the world',
          bluf: 'Most questions a curious person asks about the world have answers in six free portals. Our World in Data. World Bank WDI. FAOSTAT. Copernicus CDS. UN WPP. SIPRI.',
          body:
            'Between them, those six cover almost everything. ' +
            "World Bank WDI: about 1,400 indicators across 217 economies, pulling UN/OECD/IMF feeds — your economic baseline. FAOSTAT: free, machine-readable, CC-BY licensed — your agriculture and food baseline. Copernicus CDS: 140+ climate datasets, 3.8 petabytes, open access — the home of ERA5 reanalysis, which is what the '2024 was the first year above 1.5 °C' headline actually came from. UN DESA's World Population Prospects: the demography reference. SIPRI: military spending since 1949. Our World in Data: the synthesis layer where these get turned into newsroom-grade charts. " +
            "There's a peer group around them — IEA, FAO, WHO, NOAA, IPCC, IUCN, V-Dem, UCDP, Stanford AI Index, Epoch AI. Anything that doesn't trace back to one of these is downstream interpretation. " +
            "A 'World in 2050' program built on anything else is a blog.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['co2-budget-contested', 'amoc-contested', 'population-peak'],
          related: [],
          entities: ['world-bank', 'fao', 'copernicus', 'un-desa', 'sipri', 'our-world-in-data'],
          tags: ['climate', 'data'],
          timeframe: 'this-decade',
          sources: [
            SOURCE_OWID,
            SOURCE_WBANK,
            SOURCE_FAOSTAT,
            SOURCE_C3S,
            SOURCE_UN_WPP,
            SOURCE_SIPRI,
          ],
        },
      ],
    },
    {
      slug: 'climate-turning-points',
      title: 'Carbon turning points',
      number: 2,
      pages: [
        {
          slug: 'co2-422',
          title: 'CO₂ is at 422 ppm — 52% above pre-industrial',
          bluf: 'Atmospheric CO₂ hit 422.45 ppm in 2024 — 52% above what the air looked like before the industrial revolution. And 2024 was the first calendar year on record above 1.5 °C of warming.',
          body:
            "The Global Carbon Project's 2024 Global Carbon Budget is where the headline number lives. 422.45 ppm. 52% above pre-industrial. Global emissions for the year: 41.6 GtCO₂. " +
            'Copernicus C3S, using ERA5 reanalysis against the 1991-2020 baseline, confirmed 2024 was the first full calendar year above the 1.5 °C anomaly threshold. ' +
            "That's the headline. The argument is about the budget — how much more we can emit before we cross 1.5 °C on a multi-decadal average. That's the next page, and it's genuinely contested.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['authoritative-data'],
          feedsInto: ['co2-budget-contested', 'amoc-contested'],
          related: [],
          entities: ['gcp', 'copernicus'],
          tags: ['climate'],
          timeframe: 'now',
          sources: [SOURCE_GCP_2024, SOURCE_C3S],
        },
        {
          slug: 'co2-budget-contested',
          title: 'The 1.5 °C carbon budget: 235 GtCO₂ — or 130. Sources disagree.',
          bluf: 'Two credible institutions, two very different answers on how much carbon we can still burn. The Global Carbon Project says ~235 GtCO₂. Forster et al. (2024) says ~130 GtCO₂. Both are serious. The gap is huge.',
          body:
            "Global Carbon Project 2024 carries ~235 GtCO₂ for a 50% shot at staying under 1.5 °C — about six years at current emissions of ~41.6 GtCO₂/yr. Forster et al., in *Indicators of Global Climate Change 2024*, come in much tighter at ~130 GtCO₂. That's about three years. " +
            'The gap is methodological. Different choices on aerosol forcing, how much observed warming you attribute to CO₂ versus other forcings, how much non-CO₂ warming you back out of the budget. ' +
            'Honest summary in one sentence: somewhere between three and six years of current emissions exhausts the 1.5 °C budget at the 50% level. ' +
            'Anything tighter is overconfident. Anything looser is misleading.',
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['co2-422'],
          feedsInto: ['amoc-contested', 'peak-oil-demand'],
          related: [],
          entities: ['gcp', 'forster-et-al', 'ipcc'],
          tags: ['climate'],
          timeframe: 'this-decade',
          sources: [SOURCE_GCP_2024, SOURCE_IPCC_AR6],
        },
        {
          slug: 'amoc-contested',
          title: 'AMOC collapse: mid-century or "very unlikely"? Two credible answers.',
          bluf: "Will the Atlantic ocean current that warms Europe collapse this century? One Nature Communications paper says: yes, possibly mid-century. The IPCC says: very unlikely. That's the biggest live disagreement in tipping-point science.",
          body:
            "AMOC — the Atlantic Meridional Overturning Circulation — is the world's most consequential tipping element. If it collapses, Northwest Europe cools sharply, the Sahel dries, monsoons get unstable. Everything else flows from that. " +
            'Ditlevsen & Ditlevsen (2023, Nature Communications) read sea-surface-temperature fingerprints on the subpolar gyre and statistical early-warning indicators, and flag a real risk of collapse between 2025 and 2095, with a median around 2050. ' +
            "IPCC AR6 WG1, using CMIP6 climate-model ensembles, calls a 21st-century collapse 'very unlikely' at medium confidence. " +
            "The honest read isn't to pick a winner. It's to admit: we're arguing about whether the most important non-linear climate event of the next 30 years is roughly 0% or roughly 50%. That fact alone is policy-relevant.",
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['co2-budget-contested'],
          feedsInto: ['peak-oil-demand'],
          related: [],
          entities: ['ditlevsen', 'ipcc'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_DITLEVSEN, SOURCE_IPCC_AR6],
        },
        {
          slug: 'forest-and-life',
          title: 'Forests and life: the gauges are accelerating downward',
          bluf: 'Tropical forests lost in 2024 nearly doubled vs 2023 — 6.7 million hectares gone. Meanwhile the Living Planet Index says monitored vertebrate populations are down 73% on average since 1970.',
          body:
            "Global Forest Watch's 2024 update: tropical primary forest loss reached 6.7 Mha. Almost double the year before. And — for the first time — fires beat agricultural conversion as the leading direct driver. " +
            "The 2024 Living Planet Report (WWF / ZSL) documents a 73% average decline in monitored vertebrate populations since 1970. Some scientists pushback on the methodology (it's an average of ratios, which can mislead) — but the IUCN Red List points the same direction. " +
            'These two are the closest we have to a real-time read on the biosphere. Both point the same way. Both got worse in 2024.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['authoritative-data'],
          feedsInto: [],
          related: ['amoc-contested'],
          entities: ['global-forest-watch', 'wwf', 'iucn'],
          tags: ['climate', 'biodiversity'],
          timeframe: 'now',
          sources: [SOURCE_GFW, SOURCE_LPI_2024],
        },
      ],
    },
    {
      slug: 'energy-and-people',
      title: 'Energy, AI, and people',
      number: 3,
      pages: [
        {
          slug: 'peak-oil-demand',
          title: 'Peak oil demand: 2029-2030 in IEA scenarios — but the date moves',
          bluf: "The IEA says global oil demand peaks before 2030. BloombergNEF agrees. Rystad and OPEC push the date out to the mid-2030s. The whole 21st century pivots on who's right.",
          body:
            "IEA WEO 2025: oil demand plateaus around 2029 under STEPS (Stated Policies), peaks earlier in their APS (Announced Pledges) and NZE (Net Zero) scenarios. BloombergNEF and Equinor's outlooks broadly agree. " +
            "Rystad Energy and OPEC see the peak later — mid-2030s or beyond. The disagreement isn't about the trend, it's about three knobs: how fast EVs penetrate, when China's gasoline demand saturates, and how durable aviation + petrochemical demand stays. " +
            "A calibrated bet: peak oil demand lands somewhere between 2028 and 2034. After that, the decline curve is what funds — or doesn't fund — the energy transition in producing countries.",
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['authoritative-data'],
          feedsInto: ['copper-demand'],
          related: ['co2-budget-contested'],
          entities: ['iea', 'bnef', 'opec', 'rystad'],
          tags: ['energy-transition', 'climate'],
          timeframe: 'this-decade',
          sources: [SOURCE_IEA_WEO],
        },
        {
          slug: 'ai-long-arc',
          title: 'AI in the 2030s: capability up, compute up, returns disputed',
          bluf: 'Frontier AI training compute has doubled every 5-6 months since 2010. The capability benchmarks keep falling. Whether any of this scales to human-level general intelligence by 2030 is the actual debate — it is not the consensus.',
          body:
            'Two empirical patterns are rock-solid through 2025. One: training compute for frontier models keeps scaling (Epoch AI tracks this in detail). Two: capability benchmarks — MMLU, GPQA, SWE-bench, FrontierMath — keep getting saturated (Stanford AI Index 2025). ' +
            "What is *not* settled: whether scaling continues to deliver, when (or if) we get something equivalent to top-human general intelligence, and what happens to the trillions in capital allocation if returns disappoint. Median forecaster estimates for 'AGI' span from 2030 to 2060. That's a 30-year disagreement, not a small one. " +
            'Honest framing for a 2050 program: AI is the most likely single source of compounding economic and geopolitical disruption between now and 2050. And the magnitude of that disruption is genuinely uncertain. Both halves of that sentence matter.',
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['authoritative-data'],
          feedsInto: [],
          related: ['peak-oil-demand'],
          entities: ['epoch-ai', 'stanford-hai'],
          tags: ['ai'],
          timeframe: 'long-arc',
          sources: [SOURCE_STANFORD_AI],
        },
        {
          slug: 'population-peak',
          title: 'Population peaks around 2084 at ~10.3 billion — UN. IHME and IIASA say earlier.',
          bluf: 'The UN says global population peaks at around 10.3 billion in the mid-2080s. Two other serious institutions (IHME and IIASA) say it peaks earlier and lower — closer to 9.4-9.7 billion in the 2060s. The 20-year difference reshapes almost everything.',
          body:
            "The headline number you see everywhere — peak ~10.3 B around 2084 — comes from UN DESA's World Population Prospects 2024. " +
            "Two credible institutions disagree downward. IHME, using its Global Burden of Disease projections, sees an earlier, lower peak. IIASA's Wittgenstein Centre projects similar. " +
            "Why does 'peak in 2060 not 2080' matter? It reshapes labour supply trajectories in East Asia and Europe. It compresses Africa's demographic dividend window. It changes the global resource demand curve. " +
            "For a 2050 program, assume the peak is somewhere between 2060 and 2090. Lean closer to the UN for the median. Don't pretend the gap doesn't exist.",
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['authoritative-data'],
          feedsInto: [],
          related: [],
          entities: ['un-desa', 'ihme', 'iiasa'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_UN_WPP],
        },
      ],
    },
  ],
};

const ALLIANCES_RESHUFFLE_PROGRAM: Program = {
  slug: 'alliances-reshuffle-program',
  title: 'How the alliance map is changing',
  blurb:
    'NATO under strain, Europe waking up, BRICS+ expanding, dollar still dominant. The structural shape of who-backs-whom in the late 2020s.',
  durationMinutes: 45,
  chapters: [
    {
      slug: 'nato-schrodinger',
      title: 'NATO is in two states at once',
      number: 1,
      pages: [
        {
          slug: 'schrodinger-nato',
          title: 'Most European leaders now treat the US guarantee as broken',
          bluf: "ECFR put it bluntly in September 2025: most European leaders now accept that the defence relationship with the US, as they knew it, is over. That's a structural break, not a rhetorical one.",
          body:
            "The ECFR paper that broke this open — 'Making defence European again' — coined 'Schrodinger's NATO' for the state we're in: the US is formally still committed to the alliance and behaviourally absent at the same time. The 2026 US National Defense Strategy formalised the downgrade: Europe is now a secondary theatre, and support is conditional on burden-sharing. " +
            "If you want it in writing, the March 2025 Signal leak gave it to us. Vice-President Vance: 'I just hate bailing Europe out again.' Defence Secretary Hegseth: 'I fully share your loathing of European free-loading.' " +
            'What that produces in policy: every European NATO member now plans as if the US guarantee might not show up. Even if, in any given actual crisis, it does.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['rearm-europe', 'northwood'],
          related: ['liberation-day'],
          entities: ['nato', 'us-government', 'vance', 'hegseth'],
          tags: ['alliances', 'trumpism'],
          timeframe: 'now',
          sources: [SOURCE_ECFR_DEFENCE],
        },
        {
          slug: 'rearm-europe',
          title: 'Europe is putting €281 billion on the table for its own defence',
          bluf: 'Europe woke up. €150 billion in defence loans activated 29 May 2025. €131 billion more locked into the 2028-2034 EU budget for defence and space — a fivefold increase.',
          body:
            'Two concrete commitments anchor the European defence awakening. ' +
            '**SAFE** — Security Action for Europe. €150 bn in low-interest defence loans for member states. In force from 29 May 2025 per the Council of the EU. ' +
            "**The 2028-2034 MFF** — the EU's seven-year budget. The July 2025 Commission proposal quintuples defence and space spending to €131 bn through the European Competitiveness Fund window. " +
            "France's 2025 National Strategic Review labels Russia 'the most direct threat today and for years to come'. The UK's 2025 SDR says the same. " +
            "These aren't declarations of independence from the US. They're insurance against a US guarantee that may not arrive.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['schrodinger-nato'],
          feedsInto: ['northwood'],
          related: [],
          entities: ['european-commission', 'council-eu', 'france', 'uk'],
          tags: ['alliances'],
          timeframe: 'now',
          sources: [SOURCE_EU_SAFE, SOURCE_ECFR_DEFENCE],
        },
        {
          slug: 'northwood',
          title: 'France and the UK are quietly building a European nuclear pillar',
          bluf: "Britain and France — Europe's only nuclear powers — signed the Northwood Declaration on 10 July 2025, agreeing to coordinate their nuclear deterrence. First brick of a European nuclear umbrella that is no longer waiting for Washington.",
          body:
            "CSIS calls Northwood the 'strategic backdrop' for a Europe that 'will no longer be underwritten by the United States by default'. France and the UK — the only nuclear powers in Europe — committed to coordinate nuclear deterrence policy. Functionally: the ability to substitute for US extended deterrence if needed. " +
            'Quietly running in parallel: Franco-German conversations on nuclear sharing have moved from taboo to open discussion. Poland and the Baltics are explicit about wanting some kind of European nuclear cover. ' +
            "This won't produce a credible European nuclear umbrella by 2030. What it produces is the political-institutional scaffolding on which one becomes possible by 2040. Which, given how slow nuclear politics moves, is fast.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['rearm-europe'],
          feedsInto: [],
          related: [],
          entities: ['france', 'uk', 'germany', 'csis'],
          tags: ['alliances'],
          timeframe: 'this-decade',
          sources: [SOURCE_CSIS_NORTHWOOD],
        },
      ],
    },
    {
      slug: 'trumpism-as-structure',
      title: 'Trumpism reshapes globalisation',
      number: 2,
      pages: [
        {
          slug: 'liberation-day',
          title: '"Liberation Day" tariffs: struck down, then upheld',
          bluf: "The 'Liberation Day' tariffs of April 2025 took a beating — two federal courts struck them down within weeks. Then SCOTUS reversed those rulings in February 2026. The tariff regime is here to stay.",
          body:
            "On 2 April 2025, Trump invoked the International Emergency Economic Powers Act to impose a universal baseline tariff plus country-specific 'reciprocal' tariffs. He called it Liberation Day. " +
            'Two federal courts disagreed. The Court of International Trade (V.O.S. Selections v. United States) and the DC District Court (Learning Resources v. Trump) both struck the IEEPA tariffs down in late May 2025. ' +
            'The administration pivoted. Section 232 (national security) and Section 301 (trade practice) authorities kept most tariffs in place anyway. Then, in February 2026, SCOTUS reversed the lower courts and upheld the IEEPA framework on appeal. ' +
            "The lesson: the tariff regime is now institutionally durable. Not because Trump won every legal battle — he didn't — but because the toolkit has multiple authorities and a sympathetic Supreme Court.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['brics-payments'],
          related: ['schrodinger-nato'],
          entities: ['trump-2', 'scotus', 'us-trade-court'],
          tags: ['trumpism', 'alliances'],
          timeframe: 'now',
          sources: [SOURCE_ECFR_DEFENCE],
        },
      ],
    },
    {
      slug: 'brics-plus',
      title: 'BRICS+ as a payments cluster, not a replacement reserve',
      number: 3,
      pages: [
        {
          slug: 'brics-ten',
          title: 'BRICS+ is now ten members — and that is still not a bloc',
          bluf: 'BRICS doubled in size in 13 months — Egypt, Ethiopia, Iran, UAE joined in January 2024; Indonesia in January 2025. Saudi Arabia is still hedging. But ten members does not mean one bloc.',
          body:
            'The expansion is real. The bloc-ness is not. ' +
            "Brazil and India actively resist anti-Western alignment. The UAE is in BRICS *and* in the Abraham Accords with Israel. Indonesia is explicitly non-aligned and says so. What holds these ten together isn't a shared positive vision — it's shared frustrations with the US-led order. " +
            "Saudi Arabia has been 'invited' since 2023 but has not formally joined as of mid-2026. That's a hedge against US pressure, not a strategic statement. " +
            "Right way to read this: BRICS+ is a growing trade-and-payments cluster, not a coherent geopolitical bloc. The difference matters when you're forecasting what they can actually coordinate on.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['brics-payments'],
          related: [],
          entities: ['brics', 'india', 'saudi-arabia'],
          tags: ['alliances'],
          timeframe: 'this-decade',
          sources: [SOURCE_ECFR_DEFENCE],
        },
        {
          slug: 'brics-payments',
          title: 'USD still ~58% of reserves. RMB still ~2%. Read accordingly.',
          bluf: 'Every few years someone says BRICS will replace the dollar. The data says otherwise. The USD still holds ~58% of global FX reserves, the RMB is stuck at ~2%. BRICS payments work — at the margins. Not at the core.',
          body:
            'IMF COFER data through Q4 2024 puts the USD reserve share at ~58%, EUR ~20%, JPY ~6%, GBP ~5%, RMB ~2%. The dollar is at a multi-decade low and still has no serious challenger. ' +
            "BRICS+ payment innovations — BRICS Pay, mBridge, the expanded INSTC corridor, growing CIPS membership — do bypass SWIFT and dollar clearing for some Russia-Iran-China trade and for some Gulf-Asia flows. That's real. " +
            "But it isn't a reserve substitute. It's a sanctions-resistant transactional layer. Important distinction. " +
            'Calibrated bet for 2030: USD share at ~50%, RMB creeping to ~4-5%. BRICS+ becomes a real payments cluster. It does not replace the dollar.',
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['brics-ten', 'liberation-day'],
          feedsInto: [],
          related: [],
          entities: ['imf', 'brics', 'swift', 'cips'],
          tags: ['alliances', 'trumpism'],
          timeframe: 'this-decade',
          sources: [SOURCE_ECFR_DEFENCE],
        },
      ],
    },
  ],
};

const CRITICAL_MATERIALS_PROGRAM: Program = {
  slug: 'critical-materials-atlas',
  title: 'Critical materials, per-material',
  blurb:
    'Who mines, who refines, who can shut the tap. The two-axis logic and the per-material reality.',
  durationMinutes: 60,
  chapters: [
    {
      slug: 'framework',
      title: 'What makes a material "critical"',
      number: 1,
      pages: [
        {
          slug: 'usgs-2025',
          title: 'USGS 2025 lists 60 minerals as critical — up from 50 in 2022',
          bluf: 'The US Geological Survey added 10 minerals to its critical list in 2025, bringing the total to 60. Seventeen of them are already under Chinese export control — and the model gives those a 100% disruption probability.',
          body:
            'USGS runs a nonlinear optimisation over US input-output tables to estimate how much GDP gets hit if any single commodity is disrupted for a year. Modelled impacts on the 2025 list range from -$4.5 bn to +$33 M. The inclusion bar: an annualised probability-weighted GDP loss above $2 M. ' +
            'The 2025 list added 10 minerals to the 2022 version — potash, silicon, copper, silver, rhenium, lead among them. And it kept arsenic and tellurium that the methodology said should come off. ' +
            'Top 10 by economic damage if disrupted: samarium, rhodium, lutetium, terbium, dysprosium, gallium, germanium, gadolinium, tungsten, niobium. ' +
            'The single most consequential calibration choice in the whole framework: assigning 100% disruption probability to the 17 commodities already under MOFCOM controls or bans to the US. That one decision tells you how worried Washington is.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['china-refining', 'copper-demand'],
          related: [],
          entities: ['usgs', 'mofcom'],
          tags: ['decarbonisation'],
          timeframe: 'this-decade',
          sources: [SOURCE_USGS_CM_2025],
        },
        {
          slug: 'eu-crma',
          title: 'EU CRMA: 34 critical materials, 17 strategic, 2030 benchmarks',
          bluf: "Europe's answer to Chinese refining dominance has a name: the Critical Raw Materials Act. In force May 2024. It binds the EU to 2030 targets — and that 65% single-country cap is a not-very-subtle anti-China clause.",
          body:
            "The CRMA is the most concrete industrial-policy response to China's refining dominance. It lists 34 critical materials and tags 17 of them as 'strategic'. The 2030 benchmarks: 10% of consumption from EU extraction, 40% from EU processing, 25% from recycling, and no more than 65% from any single country. " +
            'Those are binding direction, not strict legal limits. But every missed benchmark is auditable. ' +
            "The 65% single-country cap is unsubtle. Almost every strategic material's refining is concentrated in China above that line. The clause is a fence around dependence. " +
            "Upstream, the EU has signed strategic partnerships with the DRC and Zambia (2023) and is funding the Lobito Corridor. That's the easier half. The downstream half — actually building a European refining and recycling industry — is the harder problem.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['usgs-2025'],
          feedsInto: ['china-refining'],
          related: [],
          entities: ['european-commission', 'drc', 'zambia'],
          tags: ['decarbonisation', 'alliances'],
          timeframe: 'this-decade',
          sources: [SOURCE_EU_CRMA],
        },
      ],
    },
    {
      slug: 'china-dominance',
      title: 'Where China actually holds the tap',
      number: 2,
      pages: [
        {
          slug: 'china-refining',
          title: 'China refines: ~85% of rare earths, ~60% of lithium, ~70% of cobalt processing',
          bluf: "China's lever over critical materials isn't in the mines. It's in the refineries. Over 85% of rare-earth refining. Around 60% of lithium. Around 70% of cobalt processing. And starting in late 2024, Beijing started actually pulling that lever.",
          body:
            'MOFCOM Announcement 2024 No. 46, dated 3 December 2024 — issued exactly one day after a fresh round of US semiconductor export controls — banned gallium, germanium, antimony, and superhard materials to the US, and tightened graphite controls. ' +
            "Through 2025 and 2026 the list grew: dysprosium, gadolinium, lutetium, samarium, terbium, yttrium, indium, molybdenum, tungsten, magnesium, tellurium, bismuth. That's 17 commodities under formal Chinese export controls or bans to the US. " +
            "Western counter-strategy is a stack — the US IRA's critical-mineral provisions, the EU CRMA, US-Australia bilateral financing ($1 bn each within six months under the October 2025 framework), EU strategic partnerships. " +
            'None of it undoes refining concentration on a 5-year horizon. It starts to undo it on a 10-15 year horizon. The gap matters.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['usgs-2025', 'eu-crma'],
          feedsInto: ['copper-demand', 'rare-earths', 'gallium-controls'],
          related: ['liberation-day'],
          entities: ['china', 'mofcom', 'us-government', 'australia'],
          tags: ['decarbonisation', 'alliances', 'trumpism'],
          timeframe: 'now',
          sources: [SOURCE_USGS_CM_2025, SOURCE_MOFCOM_46],
        },
      ],
    },
    {
      slug: 'per-material',
      title: 'Per-material briefs',
      number: 3,
      pages: [
        {
          slug: 'copper-demand',
          title: 'Copper is the single most binding 2030 constraint',
          bluf: 'When people worry about critical minerals they think of rare earths. The real bottleneck is the boring one — copper. Wood Mackenzie projects demand growing 24% to 42.7 Mtpa by 2035, requiring $210 bn in new capex and 880 ktpa of new project capacity every year. We are not building that.',
          body:
            "Copper is the electrification metal. Grids. EVs. Motors. Data centres. There's no plausible energy transition without copper supply expansion. " +
            "Wood Mackenzie's base case: demand grows 24% to 42.7 Mtpa by 2035. To get there, the world needs ~880 ktpa of new project capacity every single year. The current global new-project pipeline is well below that. The incentive price to bring marginal projects online sits above US$11,000/tonne — well above 2025 spot. " +
            "Where does copper come from? Chile (~24%), DRC + Peru + China (each ~10-11%) on the mining side. China (~40%) on the refining side. Substitution is limited — aluminium for some grid applications, that's about it. Recycling helps but doesn't close the gap. " +
            'Calibrated bet: copper is the materials constraint that bites first and hardest in the 2030s. Not rare earths.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['china-refining'],
          feedsInto: [],
          related: ['peak-oil-demand'],
          entities: ['chile', 'china', 'drc', 'wood-mackenzie'],
          tags: ['decarbonisation', 'energy-transition'],
          timeframe: 'this-decade',
          sources: [SOURCE_WOOD_MAC, SOURCE_IEA_CM_OUTLOOK],
        },
        {
          slug: 'rare-earths',
          title: 'Rare earths: a refining problem, not a geological one',
          bluf: "Rare earths aren't actually rare. The problem is that China refines over 85% of them, and the West didn't spend the last 30 years building competing capacity. The heavy rare earths — dysprosium, terbium, samarium — are the genuinely tight subset.",
          body:
            "The 'rare' in rare earths is misleading. The geology is fine. What's rare is the refining capacity outside China. Beijing invested 30 years building separation and processing chains that the West didn't. The result: even US mines (Mountain Pass / MP Materials) historically shipped their concentrate to China to get it actually refined. " +
            "That's starting to change. MP Materials is refining a growing share domestically at Mountain Pass. Lynas processes in Malaysia and is building a Texas plant. For the light rare earths (neodymium, praseodymium), expanding outside China is doable on a 5-7 year horizon. " +
            'The genuinely tight subset is the heavy rare earths — dysprosium, terbium, samarium — needed for the permanent magnets inside EV motors and wind turbines. And those are exactly the ones China formalised export controls on in 2025.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['china-refining'],
          feedsInto: [],
          related: ['copper-demand'],
          entities: ['china', 'mp-materials', 'lynas'],
          tags: ['decarbonisation', 'energy-transition'],
          timeframe: 'this-decade',
          sources: [SOURCE_USGS_CM_2025, SOURCE_IEA_CM_OUTLOOK],
        },
        {
          slug: 'gallium-controls',
          title: 'Gallium and germanium: the 2024 control that worked',
          bluf: "Want to see an economic weapon actually fire? Gallium. China produces 98% of the world's supply. Germanium, about 60%. On 3 December 2024 China banned both to the US — and direct flow went to zero. This is the worked example everyone now references.",
          body:
            'Gallium is the irreplaceable ingredient in compound semiconductors — GaAs, GaN — that go into radar, 5G base stations, high-end power electronics. Germanium goes into fibre optics, infrared optics, photovoltaics. ' +
            "China produces an estimated 98% of global gallium and 60% of germanium. MOFCOM's 3 December 2024 ban on US exports reduced direct flow to zero. " +
            'There are workarounds. Re-export through third countries. Recycling of GaAs scrap. But they raise costs and they constrain scale. ' +
            'This is the worked example everyone in critical-minerals policy now references. The lesson is uncomfortable but clear: refining concentration plus an authoritarian state plus a real geopolitical dispute equals a real economic weapon.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['china-refining'],
          feedsInto: [],
          related: ['liberation-day'],
          entities: ['china', 'mofcom', 'us-government'],
          tags: ['decarbonisation', 'alliances', 'trumpism'],
          timeframe: 'now',
          sources: [SOURCE_USGS_CM_2025, SOURCE_MOFCOM_46],
        },
      ],
    },
  ],
};

const AFRICA_PROGRAM: Program = {
  slug: 'africa-program',
  title: 'Africa to 2050',
  blurb:
    'Demographic dividend, resource nationalism, climate exposure, the new scramble. A continent at the centre of every 2050 story.',
  durationMinutes: 75,
  chapters: [
    {
      slug: 'africa-demographics',
      title: 'The demographic foundation',
      number: 1,
      pages: [
        {
          slug: 'africa-2-5b',
          title: 'Africa adds a billion people by 2050',
          bluf: 'In 1960, one in ten humans was African. By 2050 it will be roughly one in three. Africa adds about a billion people in the next 25 years — and most of them will be young.',
          body:
            'UNECA, drawing on UN WPP 2024, gives the headline trajectory verbatim: +950 M to 2.5 B by 2050, ~3.85 B by 2100. ISS African Futures (IFs v8.55, March 2026) corroborates and adds that **five of the eight countries driving more than half of global population growth to 2050 are African**: DRC, Egypt, Ethiopia, Nigeria, Tanzania. ' +
            "The working-age cohort nearly doubles from 883 M (2024) to 1.6 B (2050) — about 25% of the global working-age pool. ISS projects Africa's 15-64 cohort exceeds India's *and* China's combined by 2040 under the IFs current-path scenario. " +
            'This is the single most important fact about the 21st-century world.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['africa-dividend-window', 'lobito-corridor'],
          related: ['population-peak'],
          entities: ['un-desa', 'uneca', 'iss-african-futures', 'nigeria', 'drc'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_UNECA_DEMOG, SOURCE_ISS_FUTURES, SOURCE_UN_WPP],
        },
        {
          slug: 'africa-dividend-window',
          title: 'Only 11 African countries had entered the dividend window by 2025',
          bluf: "A 'demographic dividend' window opens when working-age people outnumber dependents by at least 1.7 to 1. Of Africa's 54 countries, only 11 were inside that window in 2025. Central Africa won't get there until 2062.",
          body:
            'The 11 already in (as of 2025): Mauritius, Seychelles, Cabo Verde, Libya, South Africa, Tunisia, Morocco, Djibouti, Botswana, Algeria, Egypt. ' +
            'By region: North Africa crossed back in 2005. Southern Africa around 2046. East Africa 2048. West Africa 2055. Central Africa not until 2062. ' +
            "Nigeria — projected to become the world's third-largest country around 2044 — doesn't cross the dividend ratio until ~2058, and peaks at only 2:1 around 2092. That's far later than China (which captured its dividend 2010-15) or India captured theirs. " +
            'Critical to understand: the dividend is a *potential* structural window, not a guaranteed payoff. Realising it depends on literacy gains, urbanisation, formalisation, and stability policy. Plenty of countries have hit the window and squandered it.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-2-5b'],
          feedsInto: ['lobito-corridor', 'aes-unified-force'],
          related: [],
          entities: ['iss-african-futures', 'nigeria'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_ISS_FUTURES],
        },
      ],
    },
    {
      slug: 'africa-resources',
      title: 'Resources, alliances, the new scramble',
      number: 2,
      pages: [
        {
          slug: 'lobito-corridor',
          title: 'The Lobito Corridor: an EU-US-Africa bet on critical minerals',
          bluf: "Three weeks before COP28, the EU and the US co-signed a single coordinated bet on African critical minerals: two strategic-partnership MoUs with the DRC and Zambia, plus a rail-corridor deal joining the US, EU, Angola, DRC, Zambia, the African Development Bank, and the Africa Finance Corporation. That's the Lobito Corridor.",
          body:
            "Why these two countries matter: the DRC supplies 70-76% of the world's cobalt and is the second-biggest copper producer on Earth (3.3 Mt in 2024, behind Chile). Zambia is Africa's #2 copper producer (~820 kt, world #7-8). Together they sit at the spine of the energy transition. " +
            'The October 2023 Global Gateway Forum in Brussels locked it all in. Five cooperation areas: sustainable value chains, infrastructure funding, sustainable production standards, R&I, capacity building. The Africa Finance Corporation got named as lead developer for the rail line itself — running from the DRC and Zambia copper belt across Angola to the Atlantic. ' +
            "This is the cleanest worked example of the EU's Critical Raw Materials Act turning into actual diplomacy. China's Belt and Road mineral footprint is still larger in stock terms. But the Lobito play targets the new flow.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-2-5b'],
          feedsInto: ['focac-2024'],
          related: ['eu-crma', 'copper-demand', 'china-refining'],
          entities: ['european-commission', 'us-government', 'drc', 'zambia', 'angola', 'afc'],
          tags: ['decarbonisation', 'alliances'],
          timeframe: 'now',
          sources: [SOURCE_AFRIPOLI_DRC, SOURCE_EU_CRMA],
        },
        {
          slug: 'aes-unified-force',
          title: "AES Unified Force: the Sahel's new security pact, with Russia",
          bluf: "Mali, Burkina Faso, and Niger — the Alliance of Sahel States — launched a 6,000-strong joint force in Niamey in December 2025. Their preferred security partner isn't France. It's Russia's Africa Corps.",
          body:
            'This is the third attempt at joint Sahel security. The first (Liptako-Gourma, 2017) was stillborn. The second (G5 Sahel) collapsed when Mali pulled out in May 2022, then Burkina Faso and Niger followed in late 2023. Chad and Mauritania formally dissolved the G5 on 6 December 2023. ' +
            "The new AES Unified Force is a structurally different bet — and the partner list shows it. Russia's Africa Corps (the Wagner successor) is the preferred security partner, in combat in Mali, training-only in Burkina Faso and Niger. " +
            'And the AES is deliberately diversifying procurement across Russia, Turkey, Iran, and China. They want exposure to multiple powers, not dependence on one. ' +
            "This is the cleanest single example of France's collapsed Sahel influence and the multi-aligned posture replacing it.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-dividend-window'],
          feedsInto: ['focac-2024'],
          related: ['russia-iran'],
          entities: ['aes', 'russia', 'wagner', 'mali', 'burkina-faso', 'niger', 'france'],
          tags: ['alliances'],
          timeframe: 'now',
          sources: [SOURCE_ISS_AES],
        },
        {
          slug: 'focac-2024',
          title: "China's $50bn pledge — and the debt-trap myth",
          bluf: "At FOCAC 9 in Beijing (September 2024), China pledged $50 billion to Africa over three years. The 'China is debt-trapping Africa' framing you hear is, when you check the numbers, not really true. Chinese lenders hold only about 12% of African external debt.",
          body:
            'The pledge breakdown: $50.7 bn over three years — RMB 210 bn (~$29.6 bn) in credit lines, RMB 80 bn (~$11.8 bn) in development assistance, RMB 70 bn (~$9.87 bn) in Chinese-firm investment, plus $50 m to a China-World Bank fund. ' +
            'China explicitly declined broad debt relief, despite African governments asking. ' +
            'Now the reality check. Chatham House and the BU GDP Center, working through the data, find: Chinese lenders hold ~12% of African external debt. Multilateral creditors hold ~35%. Private creditors hold ~42%. Chinese lending to Africa has fallen from a $28.8 bn 2016 peak to ~$2.1 bn across six projects in 2024. ' +
            "The pivot is concrete. 1,000 'small and beautiful' projects. Zero-tariff access for African LDCs. Only 30 connectivity infrastructure projects in the 2025-2027 plan. " +
            "China is still a major player. The dramatic debt-trap framing just doesn't survive contact with the data.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['lobito-corridor'],
          feedsInto: [],
          related: ['china-asymmetric'],
          entities: ['china', 'focac', 'au', 'chatham-house', 'bu-gdp'],
          tags: ['alliances', 'decarbonisation'],
          timeframe: 'this-decade',
          sources: [SOURCE_CHATHAM_FOCAC, SOURCE_BU_GDP_FOCAC],
        },
      ],
    },
    {
      slug: 'africa-countries',
      title: 'Country briefs',
      number: 3,
      pages: [
        {
          slug: 'country-nigeria',
          title: 'Nigeria — third-largest country by 2044, dividend not until ~2058',
          bluf: "Nigeria is Africa's biggest economy and biggest population (~228 M today, ~377 M by 2050). Around 2044 it overtakes the United States to become the world's third-largest country. But the demographic dividend doesn't actually kick in until ~2058.",
          body:
            'Key resource: hydrocarbons (oil is still ~85% of exports), plus a fast-growing tech sector with Lagos as the African AI hub. ' +
            'Biggest external dependence: refined-fuel imports (Nigeria exports crude and imports gasoline — a long-standing perversity) and fertiliser, both exposed to Russia / Eastern Europe shocks. ' +
            'Biggest internal challenge: the insurgency belt. Boko Haram and ISWAP in the North-East. Banditry in the North-West. IPOB in the South-East. On top of federal-state revenue disputes and a chronically over-leveraged FX regime. ' +
            'Climate exposure: Lagos is one of four named African coastal cities in the IPCC AR6 WG2 sea-level-rise list (190-245 M total African coastal exposure by 2060). ' +
            '2035 trajectory: probably a demographic late-mover. Window opening late, rising labour force, fragile institutions trying to catch up. The single thing to watch is whether power-sector reform actually delivers reliable electricity. Without that, the dividend never lands.',
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-2-5b', 'africa-dividend-window'],
          feedsInto: [],
          related: ['lobito-corridor'],
          entities: ['nigeria', 'lagos'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_UNECA_DEMOG, SOURCE_ISS_FUTURES, SOURCE_IPCC_AR6_WG2_AFRICA],
        },
        {
          slug: 'country-drc',
          title: 'DRC — 70-76% of global cobalt, ~110 M people, fragile',
          bluf: "The DRC supplies 70-76% of the world's cobalt and is the world's second-largest copper producer. If decarbonisation has a single structural spine, it runs through the Democratic Republic of the Congo.",
          body:
            'Population: ~110 M today, projected ~217 M by 2050 — the third-largest African population at mid-century, behind Nigeria and Ethiopia. ' +
            'Biggest external dependence: Chinese buyers on the refining side. Roughly 70%+ of DRC cobalt and copper flows to Chinese refiners. Diversification via the Lobito Corridor (EU, US, Angola, AfDB) is in flight but years from full effect. ' +
            'Biggest internal challenge: the eastern provinces. M23. Wazalendo. FDLR. ADF. Plus the 2023-2024 Rwanda-DRC border crisis. Mining-royalty reform in 2018 raised state take, but enforcement is uneven. ' +
            'Climate exposure: equatorial forest loss and food security stress. Less direct sea-level exposure than coastal countries. ' +
            '2035 trajectory: indispensable to global decarbonisation supply chains, internally fragile. The single most consequential African country for the energy transition.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['lobito-corridor'],
          feedsInto: [],
          related: ['copper-demand', 'china-refining'],
          entities: ['drc', 'china'],
          tags: ['decarbonisation', 'alliances'],
          timeframe: 'now',
          sources: [SOURCE_AFRIPOLI_DRC, SOURCE_ISS_FUTURES],
        },
        {
          slug: 'country-egypt',
          title: 'Egypt — early-dividend, water-stressed, Suez-dependent',
          bluf: "Egypt entered the demographic-dividend window before 2010 — which should have meant a boom. It didn't. Sovereign-debt distress, IMF dependence, and a military-owned business sector that crowds out private investment kept the dividend largely unrealised.",
          body:
            'Population ~115 M (2025). Already inside the demographic window, theoretically. ' +
            'Biggest external dependence: a three-legged stool. Suez Canal revenue (was about $10 bn/yr pre-Houthi disruption; dropped ~50% through 2024-2025). Wheat imports from Russia + Ukraine. Gulf rescue financing from Saudi, UAE, Qatar. Any one of those legs wobbling triggers a crisis. ' +
            "Biggest internal weakness: state economic over-reach. The military's own business sector — concrete, food, retail, hospitality — crowds out private investment in nearly every sector that could otherwise grow. " +
            "Climate exposure: Alexandria is on the IPCC named-city list for sea-level rise. The bigger multi-decade challenge is the Nile — Ethiopia's GERD upstream changes Egypt's water security in ways that haven't fully played out. " +
            "2035 trajectory: chronically vulnerable to external shock, but pivoting regionally through the new 'circumstance' bloc (Türkiye-Qatar-Iran-restraining-the-West). Watch IMF Article IV cycles for whether reform credibility actually arrives.",
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-dividend-window'],
          feedsInto: [],
          related: ['hormuz-vs-redsea', 'allies-of-circumstance'],
          entities: ['egypt', 'imf', 'gulf-states'],
          tags: ['climate', 'alliances'],
          timeframe: 'now',
          sources: [SOURCE_ISS_FUTURES, SOURCE_IPCC_AR6_WG2_AFRICA],
        },
      ],
    },
    {
      slug: 'africa-climate',
      title: 'Climate exposure and the adaptation gap',
      number: 4,
      pages: [
        {
          slug: 'africa-migrants',
          title: 'Up to 86 million internal climate migrants by 2050',
          bluf: 'The IPCC says climate will displace 17-40 million people inside sub-Saharan Africa by 2050 in a 1.7 °C world. In a 2.5 °C world that rises to 56-86 million. More than 60% of them will be in West Africa.',
          body:
            'Those numbers come straight from the IPCC AR6 WG2 Chapter 9 Executive Summary. The drivers are familiar: water stress, falling crop productivity, sea-level rise. ' +
            'Sea-level exposure alone goes from 108-116 M Africans by 2030 to 190-245 M by 2060 — up from 54 M in 2000. Lagos, Cotonou, Dakar, and Alexandria are the headline coastal exposures. ' +
            'And these are *lower-bound* numbers. AR6 explicitly excludes rapid-onset hazards — floods, cyclones — which add to the trajectory. AR7, when it lands, will almost certainly revise these upward.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-2-5b'],
          feedsInto: ['africa-adaptation-gap'],
          related: ['co2-budget-contested'],
          entities: ['ipcc', 'lagos', 'alexandria', 'dakar', 'cotonou'],
          tags: ['climate'],
          timeframe: 'long-arc',
          sources: [SOURCE_IPCC_AR6_WG2_AFRICA],
        },
        {
          slug: 'africa-adaptation-gap',
          title: 'Africa needs $53bn/year for adaptation. It receives $13bn.',
          bluf: 'Africa says it needs $53 billion a year to adapt to a warming climate. It gets $13 billion. About a quarter. And only 20% of global adaptation finance flows to Africa, versus 45% to East Asia and Pacific.',
          body:
            "The canonical source here is the Global Center on Adaptation / CPI 'State and Trends in Climate Adaptation Finance 2023' report. " +
            "But there's a bigger problem hiding inside: African NDCs themselves may understate the actual need by up to 100%. If true, the cumulative gap is closer to $1.6 trillion — more than 8× the $195 bn projected at current trajectories. " +
            "Globally, the UNEP Adaptation Gap Report 2025 ('Running on Empty') puts developing-country adaptation need at >$310 bn/year by 2035. The COP29 Baku-to-Belem Roadmap targets $1.3 trillion/year in total climate finance from public and private sources by 2035. UN authors keep urging grants over loans, to avoid deepening debt. " +
            'Three structural facts a 2050 reader needs. The funding gap is huge. The trajectory has been worsening, not closing. And most adaptation finance arrives as debt, not grants.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['africa-migrants'],
          feedsInto: [],
          related: ['co2-budget-contested'],
          entities: ['gca', 'unep', 'cop29'],
          tags: ['climate', 'alliances'],
          timeframe: 'this-decade',
          sources: [SOURCE_GCA_ADAPT_2023, SOURCE_IPCC_AR6_WG2_AFRICA],
        },
      ],
    },
  ],
};

const MIDDLE_EAST_PROGRAM: Program = {
  slug: 'middle-east-program',
  title: 'The Middle East to 2035',
  blurb:
    'Post-Khamenei Iran, post-Assad Syria, post-Gaza Israel, post-oil Gulf. The hinge years and the new bloc forming.',
  durationMinutes: 70,
  chapters: [
    {
      slug: 'me-hinge',
      title: 'The hinge years, 2024-2026',
      number: 1,
      pages: [
        {
          slug: 'assad-falls',
          title: '8 December 2024: Assad falls. The arc breaks.',
          bluf: "On 8 December 2024, HTS rebels removed Bashar al-Assad from power in Syria. The Tehran-Baghdad-Damascus-Beirut 'arc of resistance' that Iran had spent decades building collapsed overnight. Every alliance calculation in the Middle East rewired around that single day.",
          body:
            "It's hard to overstate how much that one event broke. Iran lost its land bridge to Hezbollah. Russia lost its strategic anchor in Latakia and Tartus. Syria was suddenly open to Turkish and Gulf influence. And a transitional HTS-led government took over under Ahmad al-Sharaa. " +
            'What followed was extraordinary fast. By May 2025, ~$15 bn of US sanctions on Syria had been lifted. In July 2025 the US de-proscribed HTS — formally taking them off the foreign-terrorist-organisation list. The UK followed in October. On 6 November 2025, the UN Security Council delisted al-Sharaa and Khattab themselves by a 14-0 vote (China abstaining). ' +
            "The post-Assad transition is fragile, but it's a real success. And the 'arc of resistance' framing — load-bearing for Iranian strategy for 40 years — is functionally dead.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: [],
          feedsInto: ['epic-fury-2026', 'allies-of-circumstance'],
          related: ['axis-of-resistance-collapse'],
          entities: ['syria', 'hts', 'al-sharaa', 'iran', 'russia'],
          tags: ['alliances'],
          timeframe: 'now',
          sources: [SOURCE_UNSC_SYRIA, SOURCE_CARNEGIE_DIWAN],
        },
        {
          slug: 'midnight-hammer',
          title: '22 June 2025: Operation Midnight Hammer',
          bluf: "On 22 June 2025, the US hit Iran's nuclear sites with fourteen GBU-57 Massive Ordnance Penetrators from B-2 bombers, plus submarine-launched Tomahawks. Targets: Fordow, Natanz, Isfahan. Iran's nuclear programme was set back. Not eliminated.",
          body:
            "Operation Midnight Hammer was the largest US combat use of the GBU-57 — the 'bunker buster' big enough to reach buried facilities like Fordow. Three sites hit. Israeli operations on Iranian air-defence and missile infrastructure ran in parallel. " +
            'Damage assessments from CFR, Cambridge AJIL, and the Congressional Research Service memo IN12571 all reached roughly the same conclusion: a 1-2 year setback to centrifuge enrichment. None of them declared the programme destroyed. Iran retained substantial nuclear infrastructure. ' +
            'Midnight Hammer set up everything that came next. Operation Epic Fury eight months later. And the Iranian retaliation that swept seven Gulf states in 48 hours.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['assad-falls'],
          feedsInto: ['epic-fury-2026'],
          related: ['epic-fury'],
          entities: ['us-government', 'iran', 'israel'],
          tags: ['alliances', 'chokepoint'],
          timeframe: 'now',
          sources: [SOURCE_CRS_IRAN_STRIKES, SOURCE_CARNEGIE_DIWAN],
        },
        {
          slug: 'epic-fury-2026',
          title: 'The 48 hours that exposed the Gulf air-defence cost trap',
          bluf: 'After the 28 February 2026 US-Israeli strike on Iran, Iran fired more than 400 ballistic missiles and about 1,000 drones at seven Gulf states in 48 hours. Interception worked — about 90% — but the cost arithmetic is what changed everything. Patriots cost a hundred times what Shaheds cost.',
          body:
            'The Operation Epic Fury strike — covered in detail in the Hormuz Crisis briefing — triggered a retaliation across Bahrain, Jordan, Kuwait, Qatar, Saudi Arabia, the UAE, and Iraq. The UAE alone engaged 537 ballistic missiles, 26 cruise missiles, and 2,256 drones. Thirty-five drones penetrated defences. ' +
            'Interception rates were impressive on paper: ~90% on ballistic missiles, ~85% on drones. But the cost asymmetry tells the real story. Patriot interceptors run $4-5 M each, with typically two fired per incoming target. Shahed drones cost Iran $20-50 K each. ' +
            'Do the math. The cost ratio runs 100-200× against the defender. ' +
            "Carnegie summarised it cleanly: 'By targeting multiple locations in the Gulf, Iran signaled that it was willing to bring the confrontation closer to the region's core economic and political centers.' " +
            'That is why Saudi Arabia, UAE, Kuwait, and Qatar are now reassessing the entire US defence framework.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['midnight-hammer'],
          feedsInto: ['allies-of-circumstance'],
          related: ['epic-fury'],
          entities: ['iran', 'uae', 'saudi-arabia', 'qatar', 'kuwait'],
          tags: ['alliances', 'chokepoint'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_SHOCKWAVES, SOURCE_CARNEGIE_DIWAN],
        },
      ],
    },
    {
      slug: 'me-new-bloc',
      title: 'The new bloc forming',
      number: 2,
      pages: [
        {
          slug: 'allies-of-circumstance',
          title: 'Türkiye, Egypt, Qatar, Iran, Pakistan: allies of circumstance',
          bluf: "A new bloc took shape through 2025-2026. Not formal. Not anti-Western. Türkiye, Egypt, Qatar, Iran, and loosely Pakistan — coordinating to restrain a US-supported Israel. Carnegie called them 'allies of circumstance' in early February 2026.",
          body:
            "Carnegie's Michael Young watched the bloc take shape through 2025-2026 and put it bluntly: 'Türkiye and Qatar, with the collaboration of Russia and Egypt, had managed to delay a U.S. attack against Iran' via a framework covering nuclear, missile, regional, and hydrocarbon issues — through a Trump-Pezeshkian / Witkoff-Araghchi negotiating track. That track collapsed on 28 February 2026 when Epic Fury hit. " +
            "IISS describes an overlapping 'quadrilateral' of Türkiye, Pakistan, Saudi Arabia, and Egypt — with Qatar 'in the fold'. The Saudi presence is notable. Riyadh is hedging, not committing. " +
            "What's important to understand: this bloc isn't anti-Western. It's restraining-Western. It's what a multipolar Middle East looks like when no single external power — not the US, not Russia, not China — can deliver a unilateral outcome anymore.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['epic-fury-2026'],
          feedsInto: ['gulf-lng-glut'],
          related: ['china-asymmetric'],
          entities: ['turkey', 'egypt', 'qatar', 'iran', 'pakistan', 'russia'],
          tags: ['alliances'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_DIWAN, SOURCE_IISS_QUADRILATERAL],
        },
      ],
    },
    {
      slug: 'me-countries',
      title: 'Country briefs',
      number: 3,
      pages: [
        {
          slug: 'country-saudi-arabia',
          title: 'Saudi Arabia — MBS, Vision 2030, the oil-vs-renewables hedge',
          bluf: 'The Gulf hegemon. Top oil exporter on Earth. A $700 bn+ sovereign wealth fund. And one big bet — Vision 2030 — that NEOM, football, AI, and tourism will outrun the inevitable decline of oil demand.',
          body:
            'Ruler: Crown Prince and Prime Minister Mohammed bin Salman, de facto since 2017. Population ~33 M. ' +
            'Top exports: crude oil (still 70%+), refined products, petrochemicals. Top imports: machinery, vehicles, food. ' +
            'Key alliance picture: a residual US security framework, plus the China-mediated 2023 restoration of ties with Iran, plus selective normalisation hedging with Israel. Riyadh is keeping every door open. ' +
            "Biggest external dependence: an oil price above ~$80/bbl for the budget to balance. That's declining as Vision 2030 diversifies, but it's still binding through 2030. " +
            "Biggest internal weakness: succession fragility — when one person makes every decision, his health is the country's health. Plus the growing gap between what Vision 2030 announces and what actually gets built (NEOM, The Line). " +
            '2035 trajectory: declining single-source dependence on oil. Growing diplomatic optionality. And a structural Gulf-wide air-defence cost problem they share with every neighbour.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['allies-of-circumstance'],
          feedsInto: [],
          related: ['gulf-lng-glut', 'peak-oil-demand'],
          entities: ['saudi-arabia', 'mbs', 'pif', 'neom'],
          tags: ['alliances', 'energy-transition'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_DIWAN, SOURCE_IEA_WEO],
        },
        {
          slug: 'country-iran',
          title: 'Iran — post-Khamenei, sanctioned, retaliatory capacity proven',
          bluf: 'Operation Epic Fury on 28 February 2026 killed Supreme Leader Ali Khamenei. The regime did not collapse. Within 48 hours, Iran proved it could fire on seven Gulf states simultaneously.',
          body:
            'Governance: contested transition post-Khamenei. The IRGC is now the dominant institution. Population ~89 M. ' +
            "Top exports: crude oil (~3 mb/d running through 'shadow' trade to China), petrochemicals, condensates. Top imports: refined fuels (Iran is a major refiner-shy economy), machinery, food. " +
            'Key alliances: Russia (the 20-year Comprehensive Strategic Partnership Treaty signed January 2025), China (strategic but not urgent for Beijing), the new restraining-the-West bloc with Türkiye-Qatar-Egypt. ' +
            "Biggest external dependence: Chinese crude offtake. If Beijing decides Iran is more trouble than it's worth, the regime has nowhere else to sell the oil. " +
            'Biggest internal weakness: currency collapse, generational distrust of the regime, and the same succession fragility every authoritarian system carries. ' +
            '2035 trajectory: degraded proxy network, intact direct retaliatory capacity against Gulf neighbours, increasingly dependent on a single Chinese customer. The signal to watch is whether Tehran restarts visible nuclear-weapons work after the post-Khamenei dust settles.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['epic-fury-2026'],
          feedsInto: [],
          related: ['russia-iran', 'china-asymmetric', 'epic-fury'],
          entities: ['iran', 'khamenei', 'irgc-navy', 'china'],
          tags: ['alliances', 'iran-axis', 'chokepoint'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_DIWAN, SOURCE_CSIS_RU_IR],
        },
        {
          slug: 'country-uae',
          title: 'UAE — port empire, tech hedge, Iran-exposed',
          bluf: 'The most globalised state in the Gulf. A trade re-export hub, a 100 GW renewables target via Masdar, soft power through DP World and the Edge defence group. The Iranian retaliation in February 2026 exposed how close the threat sits.',
          body:
            'Ruler: President Mohamed bin Zayed (MBZ). Population ~10 M — about 90% expatriate. ' +
            'Top exports: re-exports, crude oil, aluminium, gold. Top imports: machinery, food, textiles. Dubai is the trade-hub city; Abu Dhabi is the oil-and-sovereign-wealth city. They run on different logics. ' +
            "Key alliances: US security framework + Abraham Accords with Israel + new 'circumstance' bloc proximity + a China-tech hedge that nobody wants to talk about too loudly. " +
            "Biggest external dependence: trade-flow stability. Dubai's re-export model collapses if Hormuz or Bab el-Mandeb fall. Both are within Iranian reach. " +
            'Biggest internal weakness: a 90% expatriate population that is structurally non-citizen — the model only works as long as people want to come and work there. Ruler-dependent succession. And the fact that Iranian missiles and drones can hit any inch of UAE infrastructure. ' +
            "2035 trajectory: hedged, diversified, exposed. Things to watch: Masdar's global expansion, ADNOC IPO follow-through, and the speed of Saudi competitive convergence — Riyadh wants to be Dubai.",
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['epic-fury-2026'],
          feedsInto: [],
          related: ['gulf-lng-glut'],
          entities: ['uae', 'mbz', 'dp-world', 'masdar', 'adnoc'],
          tags: ['alliances', 'energy-transition', 'chokepoint'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_SHOCKWAVES, SOURCE_IEA_WEO],
        },
        {
          slug: 'country-turkiye',
          title: 'Türkiye — drone diplomacy, NATO-tense, "circumstance" pivot',
          bluf: "Still in NATO, but increasingly transactional with Washington. A drone-export power that has reshaped wars from Ukraine to Libya. And central to the new 'allies of circumstance' bloc restraining a US-supported Israel.",
          body:
            'Ruler: Recep Tayyip Erdoğan, in his last constitutional term (succession 2028 looms). Population ~85 M. ' +
            'Top exports: vehicles, machinery, textiles, and defence — especially the drones, which have become a real diplomatic instrument. Top imports: energy, machinery, gold. ' +
            "Key alliances: formally still NATO. Operationally inside the 'circumstance' bloc with Qatar, Egypt, Iran, and Pakistan. Transactional with Russia (S-400 system, gas pipelines). And there's a BRICS application pending. " +
            'Biggest external dependence: energy imports from Russia + Iran + Azerbaijan; refugee load (~3.5 M Syrians, gradually returning after Assad fell); currency stability. ' +
            "Biggest internal weakness: lira credibility, the upcoming succession transition, and the unresolved Kurdish question that has been the country's organising domestic problem for a century. " +
            '2035 trajectory: more independent from the US, more central to Middle Eastern diplomacy, more present in Africa (mostly via drones). The single thing to watch is the 2028 succession.',
          confidence: 'HIGH',
          lastVerified: '2026-06-10',
          dependsOn: ['allies-of-circumstance'],
          feedsInto: [],
          related: ['schrodinger-nato'],
          entities: ['turkey', 'erdogan', 'nato', 'qatar', 'russia'],
          tags: ['alliances'],
          timeframe: 'now',
          sources: [SOURCE_CARNEGIE_DIWAN, SOURCE_IISS_QUADRILATERAL],
        },
      ],
    },
    {
      slug: 'me-energy',
      title: 'Energy through 2030',
      number: 4,
      pages: [
        {
          slug: 'gulf-lng-glut',
          title: 'The 2028-2030 LNG glut and the Gulf budget squeeze',
          bluf: "Between 2028 and 2030, the world's LNG capacity is set to grow by about 360 billion cubic metres a year — roughly 50% on top of 2024 trade. Qatar alone is adding 88 bcm/year, much of it without long-term buyers locked in. Gulf budgets are about to feel that.",
          body:
            "The headline addition is QatarEnergy's North Field expansion. Stack on top of that: US Gulf Coast LNG (Plaquemines, Corpus Christi, Rio Grande), Mozambique LNG restarts, Russian sanction-evading flows. The 2028-2030 window is when global supply outpaces demand growth even in the IEA's middle-of-the-road STEPS scenario. " +
            "Spot LNG prices are likely to compress hard. Long-term contract prices follow with a 1-2 year lag. Gulf state budgets — Qatar's especially — depend on those prices staying above breakeven. " +
            'Now pair that with the renewables hedge. NEOM Green Hydrogen targets 600 tonnes/day by end-2026. Masdar (UAE) targets 100 GW of renewable capacity by 2030. These are real bets, not press releases. ' +
            "But they don't close the budget gap if oil and LNG prices both drop at the same time. Which is the scenario the 2028-2030 window puts on the table.",
          confidence: 'MED',
          lastVerified: '2026-06-10',
          dependsOn: ['epic-fury-2026'],
          feedsInto: [],
          related: ['peak-oil-demand'],
          entities: ['qatar', 'saudi-arabia', 'uae', 'neom', 'masdar'],
          tags: ['energy-transition', 'alliances'],
          timeframe: 'this-decade',
          sources: [SOURCE_CARNEGIE_SHOCKWAVES, SOURCE_IEA_WEO],
        },
      ],
    },
  ],
};

export const GEOPOLITICS_CATEGORIES: Category[] = [
  {
    slug: 'hormuz-crisis',
    title: 'Hormuz Crisis',
    tier: 'now',
    tint: '#B85A2E',
    blurb:
      "Iran, the US, Israel, and the Gulf — what they are doing to the world's most consequential strait.",
    programs: [HORMUZ_BRIEFING],
  },
  {
    slug: 'shipping-industry',
    title: 'Shipping Industry',
    tier: 'decade',
    tint: '#3D6C8A',
    blurb: 'Carriers, alliances, lanes, money flows. The system that moves 80% of world trade.',
    programs: [SHIPPING_BIG_NINE],
  },
  {
    slug: 'alliances-reshuffle',
    title: 'Alliances Reshuffle',
    tier: 'decade',
    tint: '#7A4B96',
    blurb:
      'NATO under strain, BRICS+ expansion, Russia–Iran 20-year pact, Trumpism. The old order fraying and the new blocs forming.',
    programs: [ALLIANCES_RESHUFFLE_PROGRAM],
  },
  {
    slug: 'critical-materials',
    title: 'Critical Materials Atlas',
    tier: 'decade',
    tint: '#8E6A2C',
    blurb:
      'Copper, lithium, cobalt, coltan, rare earths, gallium, uranium. Who mines, who refines, who can shut the tap.',
    programs: [CRITICAL_MATERIALS_PROGRAM],
  },
  {
    slug: 'world-2050',
    title: 'The World in 2050',
    tier: 'horizon',
    tint: '#5C7A4F',
    blurb:
      'End of petroleum, AI, carbon turning points, demographics, the long arc. Calibrated bets and the data behind them.',
    programs: [WORLD_2050_PROGRAM],
  },
  {
    slug: 'middle-east',
    title: 'Middle East',
    tier: 'now',
    tint: '#C49044',
    blurb:
      'Post-Khamenei Iran, post-Assad Syria, post-Gaza Israel, post-oil Gulf. New alliances, current conflicts, country-by-country.',
    programs: [MIDDLE_EAST_PROGRAM],
  },
  {
    slug: 'africa',
    title: 'Africa to 2050',
    tier: 'horizon',
    tint: '#A8543A',
    blurb:
      'Demographic dividend, resource nationalism, climate exposure, the new scramble. One billion more people by 2050, half the answers still open.',
    programs: [AFRICA_PROGRAM],
  },
];

export const WORLD_HERO_QUOTE = {
  text: 'The world is not made of atoms. It is made of stories.',
  attribution: 'Muriel Rukeyser',
} as const;

export function categoriesByTier(tier: Tier): Category[] {
  return GEOPOLITICS_CATEGORIES.filter((c) => c.tier === tier);
}

export function findPage(slug: string): Page | null {
  for (const category of GEOPOLITICS_CATEGORIES) {
    for (const program of category.programs) {
      for (const chapter of program.chapters) {
        for (const page of chapter.pages) {
          if (page.slug === slug) return page;
        }
      }
    }
  }
  return null;
}

export function locatePage(slug: string) {
  for (const category of GEOPOLITICS_CATEGORIES) {
    for (const program of category.programs) {
      for (const chapter of program.chapters) {
        const idx = chapter.pages.findIndex((page) => page.slug === slug);
        if (idx >= 0) {
          return {
            category,
            program,
            chapter,
            page: chapter.pages[idx],
            pageIndex: idx,
            prev: chapter.pages[idx - 1] ?? null,
            next: chapter.pages[idx + 1] ?? null,
            totalInChapter: chapter.pages.length,
          };
        }
      }
    }
  }
  return null;
}

export function firstPageOf(programSlug: string): Page | null {
  for (const category of GEOPOLITICS_CATEGORIES) {
    for (const program of category.programs) {
      if (program.slug === programSlug) {
        return program.chapters[0]?.pages[0] ?? null;
      }
    }
  }
  return null;
}
