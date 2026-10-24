/**
 * The public Chill Machine is its own app (vikashmorgan/chill-machine,
 * chillmachine.vercel.app). Colour Brain links and frames it; it no longer
 * hosts its own copy. NEXT_PUBLIC_CHILL_URL points at a local one in dev.
 */
export const CHILL_URL = process.env.NEXT_PUBLIC_CHILL_URL ?? 'https://chillmachine.vercel.app';
