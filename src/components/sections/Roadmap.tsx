import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { DEFAULT_STAGES } from '../../lib/content';
import type { RoadmapStage } from '../../lib/types';

export default function Roadmap() {
  const [stages, setStages] = useState<RoadmapStage[]>(DEFAULT_STAGES);
  const rmRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.from('roadmap_stages').select('*').order('sort_order', { ascending: true });
      if (live && data && data.length) setStages(data as any);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const rm = rmRef.current; const rf = railRef.current;
    if (!rm || !rf) return;
    const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const update = () => {
      const r = rm.getBoundingClientRect();
      const H = matchMedia('(min-width:900px)').matches;
      const p = Math.min(1, Math.max(0, H ? (innerHeight * 0.85 - r.top) / (innerHeight * 0.45) : (innerHeight * 0.75 - r.top) / r.height));
      rf.style.transform = H ? `scaleX(${p})` : `scaleY(${p})`;
      rm.querySelectorAll('li').forEach((l, i) => {
        const on = RM || (H ? p >= i / stages.length + 0.001 : l.getBoundingClientRect().top < innerHeight * 0.75);
        l.classList.toggle('on', on);
      });
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, [stages]);

  const completed = useMemo(() => stages.filter(s => s.status === 'Completed').length, [stages]);

  return (
    <section className="wrap" id="tl">
      <hr className="hl" />
      <div style={{ paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap' }}>
        <div><div className="lbl">Roadmap</div><h2 className="big" style={{ fontSize: 'clamp(32px,5vw,72px)' }}>Our journey</h2></div>
        <div className="lbl" id="rcnt">{completed} of {stages.length} completed</div>
      </div>
      <div className="rm" id="rm" ref={rmRef} style={{ ['--n' as any]: stages.length }}>
        <i className="rail"><b id="rf" ref={railRef as any}></b></i>
        <ol>
          {stages.map((s, idx) => (
            <li key={s.id} className={s.status === 'In progress' ? 'cur' : ''}>
              <span className="nd"></span>
              <span className="no">{`0${idx + 1}`}</span>
              <div className="rc">
                <span className="bdg">{s.status}</span>
                <h3>{s.title}</h3>
                <div className="lbl">{s.date_label}</div>
                <p>{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
