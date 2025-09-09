"use client";

import { useEffect, useMemo, useState } from "react";
import { wieldFetch, CHAIN_ID, rarityName, rarityIcons, pickUsd, usdNum, short, keyFor } from "../lib/wield";

const TABS = ["Trading", "For Trade", "Activity", "Profile", "Settings"];

export default function Page() {
  const [active, setActive] = useState("Trading");
  const [loading, setLoading] = useState(false);

  // marketplace
  const [packs, setPacks] = useState([]);
  const [verified, setVerified] = useState([]);
  const [ticker, setTicker] = useState([]);

  // filters
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // profile / trade
  const [theme, setTheme] = useState("dark");
  const [wallet, setWallet] = useState("");
  const [boughtItems, setBoughtItems] = useState([]);

  // Theme switch (top-right button also toggles)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Initial fetch — Packs + Verified + Activity + (Profile if wallet)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // PACKS
        const packsRes = await wieldFetch(`vibe/boosterbox/recent?limit=180&includeMetadata=true&chainId=${CHAIN_ID}`);
        const packsList = packsRes?.data || packsRes || [];
        setPacks(packsList);

        const verifiedList = packsList.filter(p => p?.metadata?.verified === true);
        setVerified(verifiedList.slice(0, 24));

        // ACTIVITY (openings preferred, fallback opened)
        let actList = [];
        try {
          const openings = await wieldFetch(`vibe/openings/recent?limit=80&includeMetadata=true&chainId=${CHAIN_ID}`);
          actList = openings?.data || openings || [];
        } catch {
          const fb = await wieldFetch(`vibe/boosterbox/recent?limit=140&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
          actList = fb?.data || fb || [];
        }
        const activityItems = actList.map(x => ({
          id: x.id ?? `${x.contractAddress}-${x.tokenId ?? Math.random()}`,
          owner: x.owner || x.to || "",
          collection: x.collectionName || x.series || "Pack",
          tokenId: x.tokenId ?? x.id ?? "—",
          rarity: rarityName(x.rarity),
          priceUsd: pickUsd(x),
          image: x.image || x.metadata?.image,
          ts: x.timestamp || x.time || Date.now()
        }));
        setTicker(activityItems);

        // PROFILE (optional)
        if (wallet) {
          try {
            const pd = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
            setBoughtItems(pd?.boughtItems || []);
          } catch {
            setBoughtItems([]);
          }
        } else {
          setBoughtItems([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet]);

  // MARKET FILTER
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (packs || []).filter(p => {
      const creator = (p?.creator || "").toLowerCase();
      const name = (p?.name || p?.collectionName || "").toLowerCase();
      const r = rarityName(p?.rarity || p?.metadata?.rarity || "");
      const isVerified = p?.metadata?.verified === true;

      const passQuery = !q || creator.includes(q) || name.includes(q);
      const passVerified = !verifiedOnly || isVerified;
      const passRarity = rarityFilter === "ALL" || r === rarityFilter;

      return passQuery && passVerified && passRarity;
    });
  }, [packs, query, verifiedOnly, rarityFilter]);

  // VERIFIED CREATORS (by highest USD item)
  const verifiedCreators = useMemo(() => {
    const map = new Map();
    (packs || []).forEach(p => {
      const isV = p?.metadata?.verified === true;
      if (!isV) return;
      const creatorKey = p.creator || p.creatorAddress || "unknown";
      const value = usdNum(p);
      const nm = p?.name || p?.collectionName || "Pack";

      const prev = map.get(creatorKey) || { creator: creatorKey, name: p.creator || creatorKey, count: 0, maxValue: 0, topName: "" };
      prev.count += 1;
      if (value > prev.maxValue) { prev.maxValue = value; prev.topName = nm; }
      map.set(creatorKey, prev);
    });
    return [...map.values()].sort((a,b) => b.maxValue - a.maxValue).slice(0, 20);
  }, [packs]);

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="row">
          <div className="logo">
            <div className="logo-badge">🂡</div>
            <div>VibeMarket <span style={{opacity:.7}}>Tracker</span></div>
            <div className="pill">VibePoints</div>
          </div>
          <div className="row">
            <div className="wallet-chip">{wallet ? short(wallet) : "Not Connected"}</div>
            {wallet ? (
              <button className="btn" onClick={() => setWallet("")}>Disconnect</button>
            ) : (
              <button className="btn" onClick={connectWallet(setWallet)}>Connect</button>
            )}
            <button className="btn ghost" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
        <div className="tabbar">
          {TABS.map(t => (
            <button key={t} className={`tab ${active === t ? "active":""}`} onClick={() => setActive(t)}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* TICKER */}
      <div className="wrapper">
        <div className="ticker-wrap panel">
          <div className="ticker-rtl">
            {(ticker.length ? ticker : [{id:"x",owner:"—",collection:"—",tokenId:"—"}]).concat(ticker).map((i, idx) => (
              <div key={`${i.id}-${idx}`} className="chip">
                {`${short(i.owner)} pulled ${i.rarity || ""} in ${i.collection} #${i.tokenId}${i.priceUsd ? ` (${i.priceUsd})` : ""}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="wrapper">
        <div className="grid">
          <div>
            {/* TRADING */}
            {active === "Trading" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Marketplace (Vibe-synced)</div>
                  <div className="row">
                    <input className="input" placeholder="Search packs/creators…" value={query} onChange={e=>setQuery(e.target.value)} />
                    <select className="select" value={rarityFilter} onChange={e=>setRarityFilter(e.target.value)}>
                      <option value="ALL">All</option>
                      <option value="COMMON">Common</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Epic</option>
                      <option value="LEGENDARY">Legendary</option>
                    </select>
                    <label className="row" style={{gap:6}}>
                      <input type="checkbox" checked={verifiedOnly} onChange={e=>setVerifiedOnly(e.target.checked)} />
                      <span>Verified only</span>
                    </label>
                    <a className="btn ghost" href="https://vibechain.com/market" target="_blank" rel="noreferrer">Open VibeMarket</a>
                  </div>
                </div>
                {loading ? <div className="card">Loading…</div> : <Grid packs={filtered} />}
              </section>
            )}

            {/* FOR TRADE */}
            {active === "For Trade" && (<ForTrade wallet={wallet} />)}

            {/* ACTIVITY */}
            {active === "Activity" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Recent Pulls</div>
                  <button className="btn" onClick={refreshActivity(setTicker)}>Refresh</button>
                </div>
                <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                  {(ticker.length ? ticker : [{id:"y"}]).slice(0,50).map(i => (
                    <div key={i.id} className="card row" style={{padding:10}}>
                      {i.image ? (
                        <img className="thumb" alt="" src={i.image} style={{width:40,height:40,borderRadius:8}} />
                      ) : (
                        <div className="thumb" style={{width:40,height:40,borderRadius:8}} />
                      )}
                      <div className="grow">
                        <div className="title">{short(i.owner)} pulled</div>
                        <div className="sub">
                          <span className="linklike">{i.collection}</span> • #{i.tokenId} • {rarityIcons(i.rarity)}
                          {i.priceUsd ? ` (${i.priceUsd})` : ""}
                        </div>
                      </div>
                      <div className="muted">{new Date(i.ts).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PROFILE */}
            {active === "Profile" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Your Profile</div>
                  <div className="row">
                    <input className="input" placeholder="0x… wallet" value={wallet} onChange={e=>setWallet(e.target.value)} />
                    <button className="btn" onClick={() => loadProfile(wallet, setBoughtItems)}>Load</button>
                  </div>
                </div>
                <div className="cards">
                  <div className="card">PnL & holdings will connect to <code>/vibe/owner/:address</code> when available.</div>
                </div>
              </section>
            )}

            {/* SETTINGS */}
            {active === "Settings" && (
              <section className="panel">
                <div className="panel-head"><div className="panel-title">Settings</div></div>
                <div className="row" style={{marginBottom:12}}>
                  <button className="btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
                    Toggle {theme === "dark" ? "Light" : "Dark"} Mode
                  </button>
                </div>
                <div className="cards" style={{gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
                  <div className="card"><div className="meta"><div className="title">Chain</div><div className="sub">Base (chainId {CHAIN_ID})</div></div></div>
                  <div className="card"><div className="meta"><div className="title">Wallet</div><div className="sub">{wallet ? short(wallet) : "Disconnected"}</div></div></div>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <aside className="panel">
            <div className="panel-head">
              <div className="panel-title">Verified by VibeMarket</div>
              <a className="btn ghost" href="https://vibechain.com/market" target="_blank" rel="noreferrer">All</a>
            </div>
            <div className="cards">
              {(verified.length ? verified : packs.slice(0,8)).map(pack => (
                <PackSmall key={keyFor(pack)} pack={pack} />
              ))}
            </div>

            <div className="panel" style={{marginTop:12}}>
              <div className="panel-head"><div className="panel-title">Verified Creators</div></div>
              <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                {verifiedCreators.length ? verifiedCreators.map(c => (
                  <div key={c.creator} className="card row" style={{padding:"10px"}}>
                    <div className="grow">
                      <div className="title truncate">{c.name}</div>
                      <div className="muted">{c.creator}</div>
                    </div>
                    <div className="badge">${c.maxValue.toLocaleString()}</div>
                  </div>
                )) : <div className="card">No verified creators found.</div>}
              </div>
            </div>
          </aside>
        </div>

        <div className="footer">
          Built for the Vibe community • Prototype • <a href="https://vibechain.com/market" target="_blank" rel="noreferrer">VibeMarket</a> • Created by <a href="https://x.com/spawnizz" target="_blank" rel="noreferrer">@spawnizz</a>
        </div>
      </div>
    </>
  );
}

/* ---------------- Helpers & small components ---------------- */

function connectWallet(setWallet) {
  // Simple injected wallet chooser prompt
  return async () => {
    try {
      if (!window?.ethereum) return alert("No wallet found");
      // Request accounts; most mobile wallets + desktop inject this
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accs?.[0] || "");
    } catch (e) { console.error(e); }
  };
}

function refreshActivity(setTicker) {
  return async () => {
    try {
      let list = [];
      try {
        const openings = await wieldFetch(`vibe/openings/recent?limit=80&includeMetadata=true&chainId=${CHAIN_ID}`);
        list = openings?.data || openings || [];
      } catch {
        const fb = await wieldFetch(`vibe/boosterbox/recent?limit=140&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
        list = fb?.data || fb || [];
      }
      const items = list.map(x => ({
        id: x.id ?? `${x.contractAddress}-${x.tokenId ?? Math.random()}`,
        owner: x.owner || x.to || "",
        collection: x.collectionName || x.series || "Pack",
        tokenId: x.tokenId ?? x.id ?? "—",
        rarity: rarityName(x.rarity),
        priceUsd: pickUsd(x),
        image: x.image || x.metadata?.image,
        ts: x.timestamp || x.time || Date.now(),
      }));
      setTicker(items);
    } catch (e) { console.error(e); }
  };
}

async function loadProfile(addr, setBoughtItems) {
  if (!addr) return;
  try {
    const profileData = await wieldFetch(`vibe/owner/${addr}?chainId=${CHAIN_ID}`);
    setBoughtItems(profileData?.boughtItems || []);
    alert("Profile loaded.");
  } catch (e) {
    console.error(e);
    alert("Profile endpoint to wire: /vibe/owner/:address (PNL, holdings)");
  }
}

/* ---- UI small components ---- */

function Grid({ packs = [] }) {
  if (!packs.length) return <div className="card">No packs found.</div>;
  return (
    <div className="cards">
      {packs.map(p => <PackCard key={keyFor(p)} pack={p} />)}
    </div>
  );
}

function PackCard({ pack }) {
  const name = pack?.name || pack?.collectionName || "Pack";
  const creator = pack?.creator || "";
  const img = pack?.image || pack?.metadata?.image || "";
  const isVerified = pack?.metadata?.verified === true;
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const rarity = rarityName(pack?.rarity || pack?.metadata?.rarity || "");

  return (
    <a className="card pack" href={link} target="_blank" rel="noreferrer">
      {img ? <img className="thumb lg" alt="" src={img} /> : <div className="thumb lg" style={{background:"var(--bg-1)"}} />}
      <div className="meta">
        <div className="row-between">
          <div className="title" style={{display:"flex",alignItems:"center",gap:6}}>
            {name}
            {isVerified && (
              <img
                alt="verified"
                src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimage%2Ffit%3Dcontain%2Cf%3Dauto%2Cw%3D168%2Fhttps%253A%252F%252Fvibechain.com%252Fvibemarket%252Fassets%252Ficons%252Fseal1.png"
                style={{width:12,height:12}}
              />
            )}
          </div>
          <span className="badge">{rarity}</span>
        </div>
        <div className="sub">{short(creator)}</div>
      </div>
    </a>
  );
}

function PackSmall({ pack }) {
  const name = pack?.name || pack?.collectionName || "Pack";
  const img = pack?.image || pack?.metadata?.image || "";
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const isVerified = pack?.metadata?.verified === true;

  return (
    <a className="card row" href={link} target="_blank" rel="noreferrer">
      {img ? (
        <img className="thumb" alt="" src={img} />
      ) : (
        <div className="thumb" style={{background:"var(--bg-1)"}} />
      )}
      <div className="grow">
        <div className="title truncate" style={{display:"flex",alignItems:"center",gap:6}}>
          {name}
          {isVerified && (
            <img
              alt="verified"
              src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimage%2Ffit%3Dcontain%2Cf%3Dauto%2Cw%3D168%2Fhttps%253A%252F%252Fvibechain.com%252Fvibemarket%252Fassets%252Ficons%252Fseal1.png"
              style={{width:12,height:12}}
            />
          )}
        </div>
        <div className="muted">View</div>
      </div>
    </a>
  );
}

function Placeholder({ text }) { return <div className="card">{text}</div>; }

/* -------- For Trade (local + optional wallet import) ---------- */
function ForTrade({ wallet }) {
  const [items, setItems] = useState(() => loadTradeList());
  const [form, setForm] = useState({ name:"", rarity:"COMMON", contract:"", tokenId:"", notes:"" });
  const [importing, setImporting] = useState(false);

  useEffect(() => { saveTradeList(items); }, [items]);

  const addItem = () => {
    if (!form.name && !form.contract) return;
    setItems(prev => [...prev, { ...form, id: `${form.contract}-${form.tokenId}-${Math.random()}` }]);
    setForm({ name:"", rarity:"COMMON", contract:"", tokenId:"", notes:"" });
  };

  const removeItem = (id) => setItems(prev => prev.filter(x => x.id !== id));

  const importFromWallet = async () => {
    if (!wallet) return alert("Connect wallet first.");
    setImporting(true);
    try {
      const res = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
      const holdings = res?.holdings || res?.cards || [];
      const mapped = holdings.map(h => ({
        id: `${h.contract || h.address}-${h.tokenId || h.id}-${Math.random()}`,
        name: h.name || h.series || "Item",
        rarity: rarityName(h.rarity),
        contract: h.contract || h.address || "",
        tokenId: h.tokenId || h.id || "",
        notes: ""
      }));
      setItems(prev => dedupeById([...prev, ...mapped]));
    } catch {
      alert("Could not import from /vibe/owner/:address yet. Add manually for now.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">For Trade (local list v1)</div>
        <div className="row">
          <button className="btn ghost" onClick={importFromWallet} disabled={importing}>
            {importing ? "Importing…" : "Import from wallet"}
          </button>
        </div>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <input className="input" placeholder="Name / Card" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} />
        <select className="select" value={form.rarity} onChange={e=>setForm(s=>({...s,rarity:e.target.value}))}>
          <option>COMMON</option><option>RARE</option><option>EPIC</option><option>LEGENDARY</option>
        </select>
        <input className="input" placeholder="Contract (0x…)" value={form.contract} onChange={e=>setForm(s=>({...s,contract:e.target.value}))} />
        <input className="input" placeholder="Token ID" value={form.tokenId} onChange={e=>setForm(s=>({...s,tokenId:e.target.value}))} />
        <button className="btn" onClick={addItem}>Add</button>
      </div>

      <div className="cards" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
        {!items.length ? <div className="card">No items in your trade list yet.</div> :
          items.map(i => (
            <div key={i.id} className="card">
              <div className="meta">
                <div className="row-between">
                  <div className="title truncate">{i.name}</div>
                  <span className="badge">{i.rarity}</span>
                </div>
                <div className="sub">{short(i.contract)} • #{i.tokenId || "—"}</div>
                {i.notes ? <div className="sub">{i.notes}</div> : null}
                <div className="row">
                  <button className="btn ghost" onClick={()=>removeItem(i.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );
}

function loadTradeList() { try { return JSON.parse(localStorage.getItem("forTrade") || "[]"); } catch { return []; } }
function saveTradeList(list) { try { localStorage.setItem("forTrade", JSON.stringify(list || [])); } catch {} }
function dedupeById(arr) { const seen = new Set(); const out = []; for (const x of arr) { if (seen.has(x.id)) continue; seen.add(x.id); out.push(x); } return out; }