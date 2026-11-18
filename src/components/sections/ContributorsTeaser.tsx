import { useEffect, useState } from 'react';
import { supabase, publicUrl } from '../../lib/supabaseClient';
import { PLACEHOLDER_CONTRIBUTORS } from '../../lib/content';
import type { Contributor } from '../../lib/types';

function ini(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function pickRandom(list: Contributor[], n: number) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

export default function ContributorsTeaser() {
  const [people, setPeople] = useState<Contributor[]>(PLACEHOLDER_CONTRIBUTORS);
  useEffect(() => {
    let live = true;
    (async () => {
      let list = PLACEHOLDER_CONTRIBUTORS;
      if (supabase) {
        const { data } = await supabase.from('contributors').select('*').order('sort_order', { ascending: true });
        if (data && data.length) list = data as any;
      }
      if (live) setPeople(pickRandom(list, 10));
    })();
    return () => { live = false; };
  }, []);

  return (
    <section className="wrap" id="crew">
      <hr className="hl" />
      <div style={{ paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap' }}>
        <div><div className="lbl">The people</div><h2 className="big" style={{ fontSize: 'clamp(32px,5vw,72px)' }}>Contributors</h2></div>
        <a className="lk lbl" href="#join">Want to join?</a>
      </div>
      <ul className="crew" id="crew-l">
        {people.map((p, i) => {
          const img = publicUrl(p.image_path);
          return (
            <li className="pc" key={p.id} style={{ transitionDelay: `${(i % 4) * 0.1}s` }}>
              <a href={p.link || '#'} aria-label={`${p.name}, ${p.role}`}>
                <div className="ph4">
                  <span className="ix">{String(i + 1).padStart(2, '0')}</span>
                  {img ? <img src={img} alt={p.name} loading="lazy" decoding="async" /> : <b aria-hidden="true">{ini(p.name)}</b>}
                </div>
                <h3>{p.name}</h3>
                <span className="lbl">{p.role}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <a className="btn" href="/contributors" style={{ marginTop: 56 }}>View all contributors</a>
    </section>
  );
}
