import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const V: Record<string, (v: string) => string> = {
  name: v => v.trim().length > 1 ? '' : 'Please enter your name.',
  email: v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email.',
  role: v => v ? '' : 'Choose a role.',
  why: v => v.trim().length > 9 ? '' : 'A sentence or two, please (10+ characters).',
};

export default function JoinForm() {
  const [vals, setVals] = useState({ name: '', email: '', role: '', why: '', website: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    (['name','email','role','why'] as const).forEach(k => e[k] = V[k](vals[k]));
    return e;
  }, [vals]);
  const ok = !errors.name && !errors.email && !errors.role && !errors.why;

  const set = (k: string, v: string) => setVals(s => ({ ...s, [k]: v }));
  const blur = (k: string) => setTouched(t => ({ ...t, [k]: true }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, role: true, why: true });
    if (!ok) return;
    if (vals.website) return; // honeypot
    setSubmitting(true);
    try {
      if (supabase) {
        await supabase.from('join_submissions').insert({ name: vals.name, email: vals.email, role: vals.role, why: vals.why });
      }
      setDone(true);
    } catch {
      setDone(true); // graceful; can add error UI
    } finally { setSubmitting(false); }
  };

  return (
    <section className="wrap" id="join">
      <hr className="hl" />
      <div style={{ paddingTop: 32 }}>
        <h2 className="big" style={{ fontSize: 'clamp(32px,5vw,72px)' }}>Join LearnSteer</h2>
        {!done ? (
          <form className="join-form" id="fm" noValidate onSubmit={submit}>
            <div className="hp" aria-hidden="true"><label>Leave empty <input name="website" tabIndex={-1} autoComplete="off" value={vals.website} onChange={e=>set('website', e.target.value)} /></label></div>
            <div className="f">
              <input id="fn" placeholder=" " autoComplete="name" required value={vals.name} onChange={e=>set('name', e.target.value)} onBlur={()=>blur('name')} aria-invalid={!!(touched.name && errors.name)} />
              <label htmlFor="fn">Full name</label>
              <span className="err" id="e1">{touched.name ? errors.name : ''}</span>
            </div>
            <div className="f">
              <input id="fe" type="email" placeholder=" " autoComplete="email" required value={vals.email} onChange={e=>set('email', e.target.value)} onBlur={()=>blur('email')} aria-invalid={!!(touched.email && errors.email)} />
              <label htmlFor="fe">Email</label>
              <span className="err" id="e2">{touched.email ? errors.email : ''}</span>
            </div>
            <div className="f">
              <input id="fr" type="text" placeholder=" " required value={vals.role} onChange={e=>set('role', e.target.value)} onBlur={()=>blur('role')} aria-invalid={!!(touched.role && errors.role)} autoComplete="organization-title" />
              <label htmlFor="fr">Role</label>
              <span className="err" id="e3">{touched.role ? errors.role : ''}</span>
            </div>
            <div className="f">
              <textarea id="fw" rows={2} placeholder=" " required value={vals.why} onChange={e=>set('why', e.target.value)} onBlur={()=>blur('why')} aria-invalid={!!(touched.why && errors.why)}></textarea>
              <label htmlFor="fw">Why do you want to join?</label>
              <span className="err" id="e4">{touched.why ? errors.why : ''}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn" id="fs" disabled={!ok || submitting}>{submitting ? 'Sending…' : 'Join'}</button>
            </div>
          </form>
        ) : (
          <p id="ok" role="status" style={{ fontSize: 20, marginTop: 24, color: 'var(--sky-dark)' }}>Thank you. We will be in touch soon.</p>
        )}
      </div>
    </section>
  );
}
