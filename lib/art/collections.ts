/*
 * Art collections: bodies of finished work that get a space of their own,
 * opened from the Art branch of the tree.
 *
 * The pictures stay where they live, in the owner's Google Drive, and are shown
 * through Drive's own thumbnails. Those load only for someone signed in to the
 * Google account that owns them, so the work stays private: nothing is copied
 * into this app or onto a public URL.
 */

export type CollectionImage = { id: string; title: string };

export type Collection = {
  slug: string;
  route: string;
  title: string;
  line: string;
  /** What the collection is for, in a sentence or two. */
  aim?: string[];
  /** The path from first image to finished piece. */
  steps?: string[];
  driveFolderUrl: string;
  images: CollectionImage[];
};

const FLOW_IMAGES: CollectionImage[] = [
  { id: '1pyXI_wti4YT907ep1MJKJAGutuOHa9Ft', title: 'grok_1791368583045.jpg' },
  { id: '1FAFTNeWseBs3Yn9p0CmEqp_BYLnUnXxc', title: 'grok_1791368585766.jpg' },
  { id: '1kY-mfCvdbf_njxTH0tuNenPN51ck9wae', title: 'grok_1791368589937.jpg' },
  { id: '1A4jAt6pa_tidUZmGPAluRvpPJK2imXkC', title: 'grok_1791368702761.jpg' },
  { id: '1uVmo76QbuyONRTycZorDOu0r4Q_kcQLP', title: 'grok_1791368708812.jpg' },
  { id: '1cjTV7MvVdNPwxUNLOOtuMaDaHZHhb4wC', title: 'grok_1791368712770.jpg' },
  { id: '14GxNQDaPQmlbFjaNmfpEcUVsvyeVJdtt', title: 'grok_1791369034795.jpg' },
  { id: '1MGLPWa2e6Zraj1mc2kD3-BYf6aKmOO1f', title: 'grok_1791369241730.jpg' },
  { id: '1qsa44Yj4EEXndWHkYFNKDZSYCy_hsRYh', title: 'grok_1791370126534.jpg' },
  { id: '1_EgKal5SxofV0HFqG6h9bMF1_4t4IUwo', title: 'grok_1791370207043.jpg' },
  { id: '1WbYxV8VbHL2-CE1QwID9GLXZ7GvLSHny', title: 'grok_1791370599840.jpg' },
  { id: '1cA4yRBIr5JqgA0evNWT9nKBWixd9dT_F', title: 'grok_1791370851797.jpg' },
  { id: '1mDZcSp2B9Gg380QKto5acOICmeJEI9mr', title: 'grok_1791370855627.jpg' },
  { id: '1_oUAzovbcr9uDPCgwAbWUHpPJKXxaCWP', title: 'grok_1791370861995.jpg' },
  { id: '1PZrezIsUAIvvOt3IJds0YLSA_ekV5ZY-', title: 'grok_1791371021515.jpg' },
  { id: '1ttTOlpm4a-9tWneF0dNY_51SVVOrP0r8', title: 'grok_1791371343220.jpg' },
  { id: '1vaRmjwZUnOy-YCj31VX5frqJ90C6J-7l', title: 'grok_1791372219854.jpg' },
  { id: '1ncQ6zd5bEt3mBndMQcKmYtUFlTEoLcXs', title: 'grok_1791372226258.jpg' },
  {
    id: '1qSI7mBbTpEa3ooTWVMXcm1Y9ePTkas6H',
    title: 'Screenshot_2026-10-05-18-06-02-093_com.instagram.android.jpg',
  },
  {
    id: '1w4BLSUppa_k2tXODfEOFEDye8XNFfDtq',
    title: 'Screenshot_2026-10-05-18-06-16-373_com.instagram.android.jpg',
  },
  {
    id: '1nnnaR-_0-WTmBmtLx4tDh0kH1Li1B34J',
    title: 'Screenshot_2026-10-07-12-46-40-213_ai.x.grok.jpg',
  },
  {
    id: '18WrUmJAo0ILGE1quj20qoc7N4I0tizAl',
    title: 'Screenshot_2026-10-07-12-46-53-515_ai.x.grok.jpg',
  },
];

export const COLLECTIONS: Collection[] = [
  {
    slug: 'flow',
    route: '/art/flow',
    title: 'AI Sculptures · Flow',
    line: 'Sculptures imagined with AI, gathered under one idea: flow.',
    aim: [
      'The aim of this collection is to go from AI images to real 3D videos and 3D assets, then to 3D print them with extrusion methods.',
      'The goal: deliver art to clients without having to build anything by hand.',
      'The final mission: a real 3D gallery space, with the sculptures shown in different materials, that visitors can walk through.',
    ],
    steps: [
      'AI images',
      '3D videos',
      '3D assets',
      '3D print (extrusion)',
      'Delivered to clients',
      '3D gallery to walk through',
    ],
    driveFolderUrl: 'https://drive.google.com/drive/folders/1REC-iDLstl347oPN841jBTrPZEelPNTk',
    images: FLOW_IMAGES,
  },
];

export function collectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

const DRIVE_ID = /^[A-Za-z0-9_-]{20,}$/;

/** Drive's own thumbnail of a file, at a given width; it needs the owner's Google sign-in. */
export function driveThumbnail(id: string, width = 900): string {
  if (!DRIVE_ID.test(id)) throw new Error(`not a Drive file id: ${id}`);
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${Math.round(width)}`;
}

export function driveView(id: string): string {
  if (!DRIVE_ID.test(id)) throw new Error(`not a Drive file id: ${id}`);
  return `https://drive.google.com/file/d/${id}/view`;
}

/** What a collection's leaf is called on the tree. */
export const COLLECTION_NAMES: Record<string, string> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.route, c.title]),
);
