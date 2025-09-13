"use client";
import { useEffect, useMemo, useState } from "react";
import { getRecentPacks, getRecentPulls, CHAIN_ID } from "../lib/wield";

/* ------ Tabs ------ */
const TABS = ["Trading","For Trade","Activity","Profile","Settings"];

export default function Page(){
  const [active,setActive] = useState("Trading");
  const [theme,setTheme] = useState("dark");
  const [wallet,setWallet] = useState("");
  const [loading,setLoading] = useState(false);

  // data
  const [packs,setPacks] = useState([]);
  const [ticker,setTicker] = useState([]);

  // filters
  const [q,setQ] = useState("");
  const [verifiedOnly,setVerifiedOnly] = useState(false);
  const [rarity,setRarity] = useState("ALL");

  // trade list (local)
  const [trade,setTrade] = useState(() => {
    try{ return JSON.parse(localStorage.getItem("forTrade")||"[]"); }catch{return []}
  });
  useEffect(()=>{ localStorage.setItem("forTrade", JSON.stringify(trade)); },[trade]);

  // theme
  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); },[theme]);

  // fetch
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const [p, openings] = await Promise.all([getRecentPacks(120), getRecentPulls(60)]);
        setPacks(p || []);
        const items = (openings||[]).map(x => ({
          id: x.id ?? `${x.contractAddress}-${x.tokenId??Math.random()}`,
          owner: x.owner || x.to || "",
          collection: x.collectionName || x.series || "Pack",
          tokenId: x.tokenId ?? x.id ?? "—",
          rarity: normRarity(x.rarity),
          image: x.image || x.metadata?.image,
          ts: x.timestamp || x.time || Date.now()
        }));
        setTicker(items);
      }catch(e){ console.error(e); }
      setLoading(false);
    })();
  },[]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    return (packs||[]).filter(p=>{
      const verified = p?.metadata?.verified === true;
      const rn = normRarity(p?.rarity || p?.metadata?.rarity || "");
      const passQ = !s || (p?.name||"").toLowerCase().includes(s) || (p?.collectionName||"").toLowerCase().includes(s) || (p?.creator||"").toLowerCase().includes(s);
      const passV = !verifiedOnly || verified;
      const passR = rarity==="ALL" || rn===rarity;
      return passQ && passV && passR;
    });
  },[packs,q,verifiedOnly,rarity]);

  return (
    <>
      <header className="header">
        <div className="row">
          <div className="logo">
            <div className="logo-badge">🂡</div>
            <div>Vibe Tracker</div>
            <div className="pill">Chain {CHAIN_ID}</div>
          </div>

          <div className="row">
            <div className="pill">{wallet ? short(wallet) : "Not Connected"}</div>
            {wallet ? (
              <button className="btn ghost" onClick={()=>setWallet("")}>Disconnect</button>
            ) : (
              <button className="btn" onClick={connectWallet(setWallet)}>Connect</button>
            )}
            <button className="btn ghost" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>
              {theme==="dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="wrapper">
          <div className="ticker-wrap">
            <div className="ticker">
              {(ticker.length?ticker:[{id:"x",owner:"someone",collection:"",tokenId:"",rarity:"",image:""}]).map(i=>(
                <div key={i.id} className="chip">
                  {`${short(i.owner)} pulled ${i.rarity||""} in ${i.collection} #${i.tokenId}`}
                </div>
              ))}
              {/* duplicate for continuous loop */}
              {ticker.map(i=>(
                <div key={i.id+"dup"} className="chip">
                  {`${short(i.owner)} pulled ${i.rarity||""} in ${i.collection} #${i.tokenId}`}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tabbar">
          {TABS.map(t=>(
            <button key={t} className={`tab ${active===t?"active":""}`} onClick={()=>setActive(t)}>{t}</button>
          ))}
        </div>
      </header>

      <main className="wrapper">
        <div className="grid">
          <div>
            {active==="Trading" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Marketplace</div>
                  <div className="row">
                    <input className="input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
                    <select className="select" value={rarity} onChange={e=>setRarity(e.target.value)}>
                      <option value="ALL">All</option>
                      <option value="COMMON">Common</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Epic</option>
                      <option value="LEGENDARY">Legendary</option>
                    </select>
                    <label className="row">
                      <input type="checkbox" checked={verifiedOnly} onChange={e=>setVerifiedOnly(e.target.checked)}/>
                      <span className="muted">Verified only</span>
                    </label>
                  </div>
                </div>
                {loading ? <div className="card">Loading…</div> : <Grid packs={filtered} />}
              </section>
            )}

            {active==="For Trade" && (
              <ForTrade wallet={wallet} trade={trade} setTrade={setTrade} />
            )}

            {active==="Activity" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Recent Pulls</div>
                  <button className="btn ghost" onClick={async()=>{
                    try{ setTicker(await getRecentPulls(60)); }catch(e){console.error(e)}
                  }}>Refresh</button>
                </div>
                <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                  {(ticker||[]).slice(0,40).map(i=>(
                    <div key={i.id} className="card row">
                      {i.image ? <img className="thumb" src={i.image} alt=""/> : <div className="thumb"/>}
                      <div className="grow">
                        <div className="title">{short(i.owner)} pulled</div>
                        <div className="muted">{i.collection} • #{i.tokenId} {stars(i.rarity)}</div>
                      </div>
                      <div className="muted">{new Date(i.ts).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {active==="Profile" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Profile</div>
                  <div className="muted">PnL / holdings to wire to /vibe/owner/:address later.</div>
                </div>
                <div className="card">Connect wallet to enable future profile stats.</div>
              </section>
            )}

            {active==="Settings" && (
              <section className="panel">
                <div className="panel-head"><div className="panel-title">Settings</div></div>
                <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                  <div className="card row">
                    <div className="grow">
                      <div className="title">Theme</div>
                      <div className="muted">Current: {theme}</div>
                    </div>
                    <button className="btn" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>Toggle</button>
                  </div>
                  <div className="card">
                    <div className="title">Chain</div>
                    <div className="muted">Base (chainId {CHAIN_ID})</div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            <section className="panel">
              <div className="panel-head">
                <div className="panel-title">Verified by VibeMarket</div>
                <a className="btn ghost" href="https://vibechain.com/market" target="_blank" rel="noreferrer">All</a>
              </div>
              <div className="cards">
                {(packs||[]).filter(p=>p?.metadata?.verified).slice(0,12).map(p=>(
                  <PackSmall key={keyFor(p)} pack={p}/>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="footer">
          Built for the Vibe community • Prototype • <a className="linklike" href="https://vibechain.com/market" target="_blank">VibeMarket</a>
        </div>
      </main>
    </>
  );
}

/* ---------- Small components ---------- */

function Grid({packs=[]}){
  if(!packs.length) return <div className="card">No packs found.</div>;
  return <div className="cards">{packs.map(p=><PackCard key={keyFor(p)} pack={p}/>)}</div>;
}

function PackCard({pack}){
  const name = pack?.name || pack?.collectionName || "Pack";
  const img = pack?.image || pack?.metadata?.image || "";
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const rarity = normRarity(pack?.rarity || pack?.metadata?.rarity || "");
  const verified = pack?.metadata?.verified === true;
  return (
    <a className="card pack" href={link} target="_blank" rel="noreferrer">
      {img ? <img className="thumb lg" src={img} alt=""/> : <div className="thumb lg"/>}
      <div className="meta">
        <div className="row-between" style={{marginTop:8}}>
          <div className="title truncate" style={{display:"flex",alignItems:"center",gap:6}}>
            {name}
            {verified && (
              <img
                alt="verified" width={14} height={14}
                src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimage%2Ffit%3Dcontain%2Cf%3Dauto%2Cw%3D168%2Fhttps%253A%252F%252Fvibechain.com%252Fvibemarket%252Fassets%252Ficons%252Fseal1.png"
              />
            )}
          </div>
          <span className="badge">{rarity}</span>
        </div>
        <div className="muted truncate">{short(pack?.creator || "")}</div>
      </div>
    </a>
  );
}

function PackSmall({pack}){
  const name = pack?.name || pack?.collectionName || "Pack";
  const img = pack?.image || pack?.metadata?.image || "";
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const isVerified = pack?.metadata?.verified === true;
  return (
    <a className="card row" href={link} target="_blank" rel="noreferrer">
      {img ? <img className="thumb" alt="" src={img}/> : <div className="thumb"/>}
      <div className="grow">
        <div className="title truncate" style={{display:"flex",alignItems:"center",gap:6}}>
          {name}
          {isVerified && (
            <img
              alt="verified" width={12} height={12}
              src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimage%2Ffit%3Dcontain%2Cf%3Dauto%2Cw%3D168%2Fhttps%253A%252F%252Fvibechain.com%252Fvibemarket%252Fassets%252Ficons%252Fseal1.png"
            />
          )}
        </div>
        <div className="muted">View</div>
      </div>
    </a>
  );
}

function ForTrade({wallet, trade, setTrade}){
  const [form,setForm] = useState({name:"",rarity:"COMMON",contract:"",tokenId:"",notes:""});
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">For Trade (local v1)</div>
        <div className="muted">{wallet?short(wallet):"Connect wallet"}</div>
      </div>

      <div className="row" style={{padding:12}}>
        <input className="input" placeholder="Name / Card" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))}/>
        <select className="select" value={form.rarity} onChange={e=>setForm(s=>({...s,rarity:e.target.value}))}>
          <option>COMMON</option><option>RARE</option><option>EPIC</option><option>LEGENDARY</option>
        </select>
        <input className="input" placeholder="Contract (0x…)" value={form.contract} onChange={e=>setForm(s=>({...s,contract:e.target.value}))}/>
        <input className="input" placeholder="Token ID" value={form.tokenId} onChange={e=>setForm(s=>({...s,tokenId:e.target.value}))}/>
        <button className="btn" onClick={()=>{
          if(!form.name && !form.contract) return;
          setTrade(prev=>[...prev, {...form, id:`${form.contract}-${form.tokenId}-${Math.random()}`}]);
          setForm({name:"",rarity:"COMMON",contract:"",tokenId:"",notes:""});
        }}>Add</button>
      </div>

      <div className="cards" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
        {!trade.length ? <div className="card">No items yet.</div> :
          trade.map(i=>(
            <div key={i.id} className="card">
              <div className="row-between">
                <div className="title truncate">{i.name}</div>
                <span className="badge">{i.rarity}</span>
              </div>
              <div className="muted">{short(i.contract)} • #{i.tokenId||"—"}</div>
              <div className="row" style={{marginTop:10}}>
                <button className="btn ghost" onClick={()=>setTrade(prev=>prev.filter(x=>x.id!==i.id))}>Remove</button>
              </div>
            </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Utils ---------- */
function connectWallet(setWallet){
  return async ()=>{
    try{
      if(!window?.ethereum) return alert("No injected wallet found.");
      const accs = await window.ethereum.request({ method:"eth_requestAccounts" });
      setWallet(accs?.[0] || "");
    }catch(e){ console.error(e); }
  };
}
function short(x=""){ return x ? (x.length>10 ? `${x.slice(0,6)}…${x.slice(-4)}` : x) : ""; }
function keyFor(p){ return p?.id || `${p?.contractAddress||"x"}-${p?.tokenId||p?.name||Math.random()}`; }
function normRarity(r){
  const n = String(r||"").toUpperCase();
  if(["4","LEGENDARY"].includes(n)) return "LEGENDARY";
  if(["3","EPIC"].includes(n)) return "EPIC";
  if(["2","RARE"].includes(n)) return "RARE";
  if(["1","COMMON"].includes(n)) return "COMMON";
  return ["COMMON","RARE","EPIC","LEGENDARY"].includes(n)?n:"COMMON";
}
function stars(r){
  const n = normRarity(r);
  if(n==="LEGENDARY") return " ★★★★";
  if(n==="EPIC") return " ★★★";
  if(n==="RARE") return " ★★";
  return " ★";
}
