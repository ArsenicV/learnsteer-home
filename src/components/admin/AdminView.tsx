import { useEffect, useState } from 'react';
import { supabase, publicUrl } from '../../lib/supabaseClient';
import { DEFAULT_STAGES, PLACEHOLDER_CONTRIBUTORS } from '../../lib/content';
import type { Contributor, RoadmapStage } from '../../lib/types';

const TEAMS = ['Programs', 'Engineering', 'Design', 'Partnerships', 'Research'];

export default function AdminView() {
  const [active, setActive] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'c'|'s'|'r'>('c');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [stages, setStages] = useState<RoadmapStage[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    const onView = () => setActive(document.body.dataset.v === 'admin');
    setActive(document.body.dataset.v === 'admin');
    window.addEventListener('app:view', onView as any);
    return () => window.removeEventListener('app:view', onView as any);
  }, []);

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    let admin = false;
    if (user) {
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      admin = !!data?.is_admin;
    }
    setIsAdmin(admin);
    if (admin) {
      const [c, s, r] = await Promise.all([
        supabase.from('contributors').select('*').order('sort_order', { ascending: true }),
        supabase.from('roadmap_stages').select('*').order('sort_order', { ascending: true }),
        supabase.from('join_submissions').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      setContributors((c.data as any) || []);
      setStages((s.data as any) || []);
      setResponses(r.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (active) load(); }, [active]);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (location.hash !== '#admin') location.hash = '#admin';
        load();
      }
      if (event === 'SIGNED_OUT') {
        setUser(null); setIsAdmin(false); setLoading(false);
      }
    });
    // If returned from magic link with tokens in URL, supabase-js will process them; ensure we land on admin view.
    if (location.hash.includes('access_token') || location.search.includes('code=')) {
      setTimeout(() => { if (location.hash !== '#admin') location.hash = '#admin'; }, 50);
    }
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    if (!supabase) return setStatus('Supabase not configured');
    if (!email || !password) return setStatus('Enter your email and password.');
    setStatus('Signing in...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setStatus(`Sign-in failed: ${error.message}`);
    setStatus('');
    if (location.hash !== '#admin') location.hash = '#admin';
    await load();
  };

  const sendMagicLink = async () => {
    if (!supabase) return setStatus('Supabase not configured');
    if (!email) return setStatus('Enter your email first.');
    setStatus('Sending magic link...');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/' },
    });
    setStatus(error ? `Magic link failed: ${error.message}` : 'Magic link sent. Check your email, click the link, and you’ll return to the admin panel.');
  };

  const signOut = async () => { await supabase?.auth.signOut(); setUser(null); setIsAdmin(false); };

  const saveContrib = async (p: Contributor, idx: number) => {
    if (!supabase) return;
    setStatus('Saving contributor...');
    const payload = { name: p.name, role: p.role, team: p.team, image_path: p.image_path || null, link: p.link || null, sort_order: idx };
    try {
      if (String(p.id).startsWith('new-') || !p.id) {
        const { data, error } = await supabase.from('contributors').insert(payload).select().single();
        if (error) throw error;
        if (data) setContributors(cs => cs.map(x => x === p ? (data as any) : x));
      } else {
        const { error } = await supabase.from('contributors').update(payload).eq('id', p.id);
        if (error) throw error;
      }
      setStatus('Saved contributor');
    } catch (e: any) {
      setStatus('Save failed: ' + (e?.message || 'Unknown error'));
    }
  };
  const delContrib = async (p: Contributor) => { if (supabase && p.id && !String(p.id).startsWith('new-')) await supabase.from('contributors').delete().eq('id', p.id); setContributors(cs => cs.filter(x => x !== p)); };
  const addContrib = () => setContributors(cs => [...cs, { id: 'new-'+Date.now(), name: 'New Contributor', role: 'Role', team: TEAMS[0], image_path: null, link: null, sort_order: cs.length } as any]);
  const uploadImage = async (file: File, p: Contributor) => {
    if (!supabase) return setStatus('Supabase not configured');
    try {
      setStatus('Uploading photo...');
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9.\-_]/g, '_') || 'photo';
      const path = `contributors/${Date.now()}-${base}.${ext || 'jpg'}`;
      const { error } = await supabase.storage.from('media').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || undefined,
      });
      if (error) throw error;
      setContributors(cs => cs.map(x => x === p ? { ...x, image_path: path } : x));
      setStatus('Photo uploaded. Click Save on this contributor to publish.');
    } catch (e: any) {
      setStatus('Upload failed: ' + (e?.message || 'Unknown error'));
    }
  };

  const saveStage = async (s: RoadmapStage, idx: number) => {
    if (!supabase) return;
    setStatus('Saving stage...');
    const payload = { title: s.title, status: s.status, date_label: s.date_label, description: s.description, sort_order: idx };
    try {
      if (String(s.id).startsWith('new-')) {
        const { data, error } = await supabase.from('roadmap_stages').insert(payload).select().single();
        if (error) throw error;
        if (data) setStages(ss => ss.map(x => x === s ? (data as any) : x));
      } else {
        const { error } = await supabase.from('roadmap_stages').update(payload).eq('id', s.id);
        if (error) throw error;
      }
      setStatus('Saved stage');
    } catch (e: any) {
      setStatus('Save failed: ' + (e?.message || 'Unknown error'));
    }
  };
  const delStage = async (s: RoadmapStage) => { if (supabase && s.id && !String(s.id).startsWith('new-')) await supabase.from('roadmap_stages').delete().eq('id', s.id); setStages(ss => ss.filter(x => x !== s)); };
  const addStage = () => setStages(ss => [...ss, { id: 'new-'+Date.now(), title: 'New stage', status: 'Planned', date_label: '', description: '', sort_order: ss.length } as any]);
  const moveStage = (i: number, d: number) => setStages(ss => { const a=[...ss]; const j=i+d; if(j<0||j>=a.length) return a; [a[i],a[j]]=[a[j],a[i]]; return a; });

  const delResponse = async (id: string) => { if (supabase) await supabase.from('join_submissions').delete().eq('id', id); setResponses(rs => rs.filter(r => r.id !== id)); };
  const downloadCsv = () => {
    const qv = (v: any) => '"' + String(v ?? '').replace(/^([=+\-@])/,"'$1").replace(/"/g,'""') + '"';
    const csv = ['date,name,email,role,why', ...responses.map(r => [r.created_at, r.name, r.email, r.role, r.why].map(qv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'responses.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  if (!active) return null;
  return (
    <div>
      <div className="vh"><a className="lk lbl" href="#" data-go="home">&larr; Back</a><span className="lbl">Admin</span></div>
      <h2 className="big" style={{ fontSize: 'clamp(32px,5vw,72px)', margin: 0 }}>Manage site</h2>
      {!supabase ? (
        <p className="big">Configure Supabase in <code>.env</code> (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY) to enable admin.</p>
      ) : loading ? <p className="lbl">Loading…</p> : !user ? (
        <div style={{maxWidth:460, marginTop:32}}>
          <p>Sign in to manage content.</p>
          <div className="f"><input placeholder=" " type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /><label>Email</label></div>
          <div className="f"><input placeholder=" " type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /><label>Password</label></div>
          <div className="tools" style={{marginTop:8}}>
            <button className="btn" onClick={signIn}>Sign in with password</button>
            <button className="sm" type="button" onClick={sendMagicLink}>Send magic link instead</button>
          </div>
          <p className="lbl" role="status" style={{marginTop:12, whiteSpace:'pre-wrap'}}>{status}</p>
          <p className="lbl" style={{marginTop:12}}>If password sign-in fails, use “Send magic link instead”, or in Supabase confirm your user and set a known password (Authentication → Users).</p>
        </div>
      ) : !isAdmin ? (
        <div style={{marginTop:32}}><p>Signed in as {user.email}, but not an admin. Add your user to <code>profiles</code> with <code>is_admin = true</code>.</p><button className="sm" onClick={signOut}>Sign out</button></div>
      ) : (
        <div id="ad">
          <div className="tools">
            <button className="sm" onClick={signOut}>Sign out ({user.email})</button>
            <span className="lbl" id="ast" role="status">{status}</span>
          </div>
          <div className="tabs">
            {[['c','Contributors'],['s','Timeline'],['r','Responses']].map(([k,l]) => (
              <button key={k} className="chip" aria-pressed={tab===k} onClick={()=>setTab(k as any)}>{l}</button>
            ))}
          </div>
          {tab==='c' && (<>
            {contributors.map((p,i) => (
              <div className="ar c" key={p.id+String(i)}>
                <input value={p.name} aria-label="Name" onChange={e=>setContributors(cs=>cs.map((x,j)=>j===i?{...x,name:e.target.value}:x))} />
                <input value={p.role} aria-label="Role" onChange={e=>setContributors(cs=>cs.map((x,j)=>j===i?{...x,role:e.target.value}:x))} />
                <input value={p.team} aria-label="Team" onChange={e=>setContributors(cs=>cs.map((x,j)=>j===i?{...x,team:e.target.value}:x))} />
                <input value={p.image_path||''} placeholder="Image path (media/…)" aria-label="Photo path" onChange={e=>setContributors(cs=>cs.map((x,j)=>j===i?{...x,image_path:e.target.value}:x))} />
                <div className="row">
                  <label className="sm" style={{cursor:'pointer'}}>Upload<input type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0]; if(f) uploadImage(f,p);}} /></label>
                  <button className="sm" onClick={()=>saveContrib(p,i)}>Save</button>
                  <button className="sm" onClick={()=>delContrib(p)}>Delete</button>
                </div>
                {p.image_path ? <img src={publicUrl(p.image_path)} alt="" style={{height:40,objectFit:'cover'}} /> : null}
              </div>
            ))}
            <div className="tools" style={{ marginTop: 24 }}><button className="btn" onClick={addContrib}>Add contributor</button></div>
          </>)}
          {tab==='s' && (<>
            {stages.map((s,i) => (
              <div className="ar" key={s.id+String(i)}>
                <input value={s.title} aria-label="Title" onChange={e=>setStages(ss=>ss.map((x,j)=>j===i?{...x,title:e.target.value}:x))} />
                <select value={s.status} aria-label="Status" onChange={e=>setStages(ss=>ss.map((x,j)=>j===i?{...x,status:e.target.value as any}:x))}>
                  {['Completed','In progress','Planned'].map(o=><option key={o}>{o}</option>)}
                </select>
                <input value={s.date_label} aria-label="Date" onChange={e=>setStages(ss=>ss.map((x,j)=>j===i?{...x,date_label:e.target.value}:x))} />
                <input value={s.description} aria-label="Description" onChange={e=>setStages(ss=>ss.map((x,j)=>j===i?{...x,description:e.target.value}:x))} />
                <div className="row">
                  <button className="sm" onClick={()=>moveStage(i,-1)}>Up</button>
                  <button className="sm" onClick={()=>moveStage(i,1)}>Down</button>
                  <button className="sm" onClick={()=>saveStage(s,i)}>Save</button>
                  <button className="sm" onClick={()=>delStage(s)}>Delete</button>
                </div>
              </div>
            ))}
            <div className="tools" style={{ marginTop: 24 }}><button className="btn" onClick={addStage}>Add stage</button></div>
          </>)}
          {tab==='r' && (<>
            <div className="tools"><button className="btn" onClick={downloadCsv}>Download CSV</button><span className="lbl">{responses.length} responses</span></div>
            <div style={{overflowX:'auto'}}><table className="tbl"><thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Role</th><th>Why</th><th></th></tr></thead><tbody>
              {responses.map(r => (<tr key={r.id}><td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td><td>{r.name}</td><td>{r.email}</td><td>{r.role}</td><td>{r.why}</td><td><button className="sm" onClick={()=>delResponse(r.id)}>Delete</button></td></tr>))}
            </tbody></table></div>
          </>)}
        </div>
      )}
    </div>
  );
}
