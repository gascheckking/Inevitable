const API = process.env.NEXT_PUBLIC_WIELD_API || "https://api.wield.xyz/v1";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);
const KEY = process.env.WIELD_API_KEY;

/** Simple fetch helper for Wield API (auto-includes x-api-key) */
export async function wieldFetch(path) {
  const url = path.startsWith("http") ? path : `${API.replace(/\/$/,"")}/${path.replace(/^\//,"")}`;
  const res = await fetch(url, {
    headers: KEY ? { "x-api-key": KEY } : {},
    cache: "no-store",
    next: { revalidate: 0 }
  });
  if (!res.ok) throw new Error(`Wield ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

/** Best-effort marketplace pulls (openings first, fallback to opened packs) */
export async function getRecentPulls(limit=60){
  try{
    const r = await wieldFetch(`vibe/openings/recent?limit=${limit}&includeMetadata=true&chainId=${CHAIN_ID}`);
    return r?.data || r || [];
  }catch{
    const r = await wieldFetch(`vibe/boosterbox/recent?limit=${limit}&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
    return r?.data || r || [];
  }
}

export async function getRecentPacks(limit=120){
  const r = await wieldFetch(`vibe/boosterbox/recent?limit=${limit}&includeMetadata=true&chainId=${CHAIN_ID}`);
  return r?.data || r || [];
}
