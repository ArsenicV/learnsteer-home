import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, publicUrl } from '../../lib/supabaseClient';
import { PLACEHOLDER_CONTRIBUTORS } from '../../lib/content';
import type { Contributor } from '../../lib/types';

type Node = { p: Contributor; i: number; t: number; x: number; y: number; vx: number; vy: number; ph: number };
type Edge = [Node, Node];

function buildGraph(list: Contributor[]) {
  const n = list.length;
  const teams = [...new Set(list.map(p => p.team || '-'))];
  const nodes: Node[] = list.map((p, i) => {
    const t = teams.indexOf(p.team || '-'); const a = t / Math.max(1, teams.length) * Math.PI * 2;
    return { p, i, t, x: Math.cos(a) * 220 + Math.cos(i * 2.4) * 70, y: Math.sin(a) * 220 + Math.sin(i * 2.4) * 70, vx: 0, vy: 0, ph: i * 1.7 };
  });
  const edges: Edge[] = [];
  const has = (a: Node, b: Node) => edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
  teams.forEach((_, t) => {
    const g = nodes.filter(x => x.t === t);
    g.forEach((a, k) => [1, 3].forEach(s => { const b = g[(k + s) % g.length]; if (b && b !== a && !has(a, b)) edges.push([a, b]); }));
  });
  for (let k = 0; k < Math.ceil(n / 6); k++) { const a = nodes[(k * 7) % n], b = nodes[(k * 11 + 3) % n]; if (a && b && a.t !== b.t && !has(a, b)) edges.push([a, b]); }
  for (let it = 0; it < 400; it++) {
    const c = 1 - it / 400;
    for (const a of nodes) { for (const b of nodes) { if (a === b) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx*dx+dy*dy)+.1, f = 2600/(d*d); a.vx += dx/d*f; a.vy += dy/d*f; } a.vx -= a.x*.002; a.vy -= a.y*.002; }
    for (const [a,b] of edges) { const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy)||1, k=(d-70)*.02; a.vx+=dx/d*k; a.vy+=dy/d*k; b.vx-=dx/d*k; b.vy-=dy/d*k; }
    for (const a of nodes) { a.x += a.vx*c*.6; a.y += a.vy*c*.6; a.vx*=.8; a.vy*=.8; }
  }
  return { nodes, edges, teams };
}

function ini(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(); }

export default function ContributorsView({ standalone = false }: { standalone?: boolean }) {
  const [all, setAll] = useState<Contributor[]>(PLACEHOLDER_CONTRIBUTORS);
  const [active, setActive] = useState(() => standalone || (typeof document !== 'undefined' && (document.body?.dataset.v === 'crew' || location.pathname.startsWith('/contributors'))));
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [listView, setListView] = useState(false);
  const [sel, setSel] = useState<Node | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<any>({});

  useEffect(() => {
    if (standalone || location.pathname.startsWith('/contributors')) { setActive(true); return; }
    const onView = (e: any) => setActive(e.detail === 'crew' || document.body.dataset.v === 'crew');
    setActive(document.body.dataset.v === 'crew');
    window.addEventListener('app:view', onView as any);
    return () => window.removeEventListener('app:view', onView as any);
  }, [standalone]);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.from('contributors').select('*').order('sort_order', { ascending: true });
      if (live && data && data.length) setAll(data as any);
    })();
    return () => { live = false; };
  }, []);

  const G = useMemo(() => buildGraph(all), [all]);
  const fq = q.trim().toLower();
  const match = (n: Node) => (!team || n.p.team === team) && (!fq || n.p.name.toLowerCase().includes(fq));
  const filtered = G.nodes.filter(match);

  useEffect(() => {
    if (!active || listView) return;
    const cvs = canvasRef.current, wrap = wrapRef.current; if (!cvs || !wrap) return;
    const gx = cvs.getContext('2d')!;
    const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let raf = 0, TT = 0, dirty = true, hv: Node | null = null;
    const cam = stateRef.current.cam || { x: 0, y: 0, k: 1 };
    stateRef.current.cam = cam;
    const P = new Map<number, {x:number;y:number}>(); let drag: any = null, pinch = 0;

    const gsize = () => {
      const r = cvs.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 2);
      cvs.width = r.width * d; cvs.height = r.height * d; (stateRef.current).d=d; (stateRef.current).w=r.width; (stateRef.current).h=r.height; dirty = true;
    };
    const w2s = (n: Node): [number,number] => {
      const w = stateRef.current.w || 0, h = stateRef.current.h || 0;
      return [w/2 + n.x*cam.k + cam.x + Math.sin(TT*.5+n.ph)*1.6, h/2 + n.y*cam.k + cam.y + Math.cos(TT*.4+n.ph)*1.6];
    };
    const gdraw = () => {
      const d = stateRef.current.d||1, w = stateRef.current.w||0, h = stateRef.current.h||0;
      gx.setTransform(d,0,0,d,0,0); gx.clearRect(0,0,w,h);
      const actN = hv || sel; const nb = new Set<Node>(); if (actN) { nb.add(actN); G.edges.forEach(([a,b])=>{ if(a===actN) nb.add(b); if(b===actN) nb.add(a); }); }
      for (const [a,b] of G.edges) {
        const on = actN && (a===actN||b===actN); const p=w2s(a), q=w2s(b);
        const alpha = on ? 0.55 : actN ? 0.05 : (match(a)&&match(b)?0.18:0.05);
        gx.strokeStyle = `rgba(14,165,233,${alpha})`; gx.beginPath(); gx.moveTo(p[0],p[1]); gx.lineTo(q[0],q[1]); gx.stroke();
      }
      for (const n of G.nodes) {
        const [x,y]=w2s(n); const m = match(n);
        let a = m ? (RM?0.85:0.55+0.35*Math.sin(TT*1.3+n.ph)) : 0.12;
        let r = 2.8*Math.min(1.6, Math.max(.8, cam.k));
        if (actN) { if (nb.has(n)) a=1; else a*=.25; }
        if (n===actN) { r*=2; gx.fillStyle='rgba(14,165,233,.18)'; gx.beginPath(); gx.arc(x,y,r*3,0,Math.PI*2); gx.fill(); }
        gx.fillStyle = `rgba(3,105,161,${a})`; gx.beginPath(); gx.arc(x,y,r,0,Math.PI*2); gx.fill();
        if (n===sel) { gx.strokeStyle='#0ea5e9'; gx.lineWidth=1.5; gx.beginPath(); gx.arc(x,y,r+6,0,Math.PI*2); gx.stroke(); gx.lineWidth=1; }
        if (cam.k>1.6 && m) { gx.fillStyle=`rgba(15,23,42,${0.7*a})`; gx.font='11px sans-serif'; gx.fillText(n.p.name, x+r+6, y+4); }
      }
    };
    const isCrewActive = () => standalone || location.pathname.startsWith('/contributors') || document.body.dataset.v === 'crew';
    const gloop = (ts: number) => { raf = 0; if (!isCrewActive() || listView) return; if (!RM || dirty) { TT = RM?0:ts/1000; gdraw(); dirty=false; } raf = requestAnimationFrame(gloop); };

    gsize();
    const R = Math.max(...G.nodes.map(n => Math.hypot(n.x,n.y)), 1);
    const initCam = () => {
      const w = stateRef.current.w || wrap.getBoundingClientRect().width || 600;
      const h = stateRef.current.h || wrap.getBoundingClientRect().height || 400;
      cam.x = 0; cam.y = 0; cam.k = Math.min(w, h) / (2.3 * R);
      stateRef.current.inited = true;
    };
    if (!stateRef.current.inited) initCam();
    dirty = true; raf = requestAnimationFrame(gloop);
    setTimeout(() => { gsize(); if (!stateRef.current.inited || !stateRef.current.w) initCam(); dirty = true; }, 0);

    const pick = (mx:number,my:number) => { let b: Node|null=null, bd=196; for(const n of G.nodes){const [x,y]=w2s(n); const dd=(x-mx)**2+(y-my)**2; if(dd<bd){bd=dd;b=n;}} return b; };
    const zoom = (f:number,sx:number,sy:number) => { const k=Math.min(6,Math.max(.4,cam.k*f)), g=k/cam.k, cx=sx-(stateRef.current.w||0)/2, cy=sy-(stateRef.current.h||0)/2; cam.x=cx-(cx-cam.x)*g; cam.y=cy-(cy-cam.y)*g; cam.k=k; dirty=true; };

    const onDown = (e: PointerEvent) => { cvs.setPointerCapture(e.pointerId); const r=cvs.getBoundingClientRect(); P.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top}); drag={sx:e.clientX,sy:e.clientY,m:false}; if(P.size===2){const[a,b]=[...P.values()]; pinch=Math.hypot(a.x-b.x,a.y-b.y);} };
    const onMove = (e: PointerEvent) => { const r=cvs.getBoundingClientRect(); const x=e.clientX-r.left,y=e.clientY-r.top; const o=P.get(e.pointerId); if(o){P.set(e.pointerId,{x,y}); if(P.size===2){const[a,b]=[...P.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch) zoom(d/pinch,(a.x+b.x)/2,(a.y+b.y)/2); pinch=d; drag.m=true;} else {cam.x+=x-o.x; cam.y+=y-o.y; if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4) drag.m=true;}} else {hv=pick(x,y); cvs.style.cursor=hv?'pointer':'grab';} dirty=true; };
    const onUp = (e: PointerEvent) => { if(P.size===1 && drag && !drag.m){ const r=cvs.getBoundingClientRect(); const n=pick(e.clientX-r.left,e.clientY-r.top); setSel(n); } P.delete(e.pointerId); pinch=0; dirty=true; };
    const onLeave = () => { hv=null; dirty=true; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r=cvs.getBoundingClientRect(); zoom(Math.exp(-e.deltaY*.0015), e.clientX-r.left, e.clientY-r.top); };

    cvs.addEventListener('pointerdown', onDown); cvs.addEventListener('pointermove', onMove); cvs.addEventListener('pointerup', onUp); cvs.addEventListener('pointerleave', onLeave); cvs.addEventListener('wheel', onWheel, {passive:false});
    const ro = new ResizeObserver(gsize); ro.observe(cvs);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cvs.removeEventListener('pointerdown', onDown); cvs.removeEventListener('pointermove', onMove); cvs.removeEventListener('pointerup', onUp); cvs.removeEventListener('pointerleave', onLeave); cvs.removeEventListener('wheel', onWheel as any); };
  }, [active, listView, G, q, team, sel, standalone]);

  return (
    <div>
      <div className="vh"><a className="lk lbl" href="/">&larr; Home</a><span className="lbl" id="cn">{all.length} contributors</span></div>
      <h2 className="big" style={{ fontSize: 'clamp(32px,5vw,72px)', margin: 0 }}>Contributors</h2>
      <div className="tools">
        <input id="q" type="search" placeholder="Search by name" aria-label="Search contributors by name" value={q} onChange={e=>setQ(e.target.value)} />
        <div id="chips" className="tools" style={{ margin: 0 }} role="group" aria-label="Filter by team">
          <button className="chip" aria-pressed={team===''} onClick={()=>setTeam('')}>All</button>
          {G.teams.map(t => <button key={t} className="chip" aria-pressed={team===t} onClick={()=>setTeam(t)}>{t}</button>)}
        </div>
        <button className="sm" id="lv" aria-pressed={listView} onClick={()=>setListView(v=>!v)}>{listView ? 'Graph view' : 'List view'}</button>
      </div>
      {!listView ? (
        <div className="gw" id="gw" ref={wrapRef}><canvas id="gc" ref={canvasRef} role="img" aria-label="Network graph of contributors. Use list view for a keyboard-friendly version."></canvas></div>
      ) : (
        <ul className="gl" id="gl">
          {filtered.map(n => (
            <li key={n.p.id}><button onClick={()=>setSel(n)}>{n.p.name}<span>{n.p.role} · {n.p.team}</span></button></li>
          ))}
        </ul>
      )}
      {sel && (
        <aside id="gcard" aria-label="Contributor details">
          <div className="ph4" style={{ aspectRatio: '4/5' }}>
            {publicUrl(sel.p.image_path) ? <img src={publicUrl(sel.p.image_path)} alt={sel.p.name} /> : <b aria-hidden="true" style={{fontSize:32}}>{ini(sel.p.name)}</b>}
          </div>
          <div>
            <h3>{sel.p.name}</h3>
            <span className="lbl">{sel.p.role}</span><br/>
            <span className="lbl">{sel.p.team}</span>
            {sel.p.link ? <><br/><a className="lk" href={sel.p.link} rel="noopener">Profile</a></> : null}
          </div>
          <button className="sm" onClick={()=>setSel(null)} style={{ gridColumn: '1/-1', justifySelf: 'end' }}>Close</button>
        </aside>
      )}
    </div>
  );
}
