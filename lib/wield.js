// Public chain (Base)
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

// Always call Wield via our Next API proxy
export async function wieldFetch(path, init = {}) {
  const clean = String(path || "").replace(/^\/?/, "");
  const res = await fetch(`/api/wield/${clean}`, { cache: "no-store", ...init });
  if (!res.ok) {
    let msg = "";
    try { msg = await res.text(); } catch {}
    throw new Error(`Wield ${res.status} ${msg}`.trim());
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

// Helpers
export function rarityName(r) {
  const n = String(r || "").toUpperCase();
  if (["4","LEGENDARY"].includes(n)) return "LEGENDARY";
  if (["3","EPIC"].includes(n)) return "EPIC";
  if (["2","RARE"].includes(n)) return "RARE";
  if (["1","COMMON"].includes(n)) return "COMMON";
  return (["COMMON","RARE","EPIC","LEGENDARY"].includes(n) ? n : "COMMON");
}
export function rarityIcons(r) {
  const n = rarityName(r);
  if (n === "LEGENDARY") return "★★★★";
  if (n === "EPIC") return "★★★";
  if (n === "RARE") return "★★";
  return "★";
}
export function pickUsd(x) {
  const val = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? null;
  if (val == null) return "";
  const num = Number(val);
  if (!Number.isFinite(num)) return "";
  return `$${num.toFixed(num >= 100 ? 0 : 2)}`;
}
export function usdNum(x) {
  const v = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? x?.metadata?.usdPrice ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function short(x = "") {
  if (!x || typeof x !== "string") return "";
  return x.length > 10 ? `${x.slice(0,6)}…${x.slice(-4)}` : x;
}
export function keyFor(p) {
  return p?.id || `${p?.contractAddress || "x"}-${p?.tokenId || p?.name || Math.random()}`;
}