import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SiteEffects() {
  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;

    // View routing (hash)
    const show = (v: string) => {
      document.body.dataset.v = v;
      scrollTo(0, 0);
      window.dispatchEvent(new CustomEvent('app:view', { detail: v }));
    };
    const applyHash = () => {
      const h = location.hash;
      if (h === '#admin') show('admin');
      else show('home');
    };
    applyHash();
    addEventListener('hashchange', applyHash);

    // Intercept data-go
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('[data-go]') as HTMLAnchorElement | null;
      if (a) {
        e.preventDefault();
        const go = a.dataset.go;
        if (go === 'admin') location.hash = '#admin';
        else { history.pushState('', document.title, location.pathname + location.search); show('home'); }
        return;
      }
      const h = (e.target as HTMLElement).closest('header a,#ov a') as HTMLAnchorElement | null;
      if (h && document.body.dataset.v && document.body.dataset.v !== 'home') {
        const id = h.getAttribute('href') || '';
        if (!id.startsWith('#admin')) {
          e.preventDefault();
          history.pushState('', document.title, location.pathname + location.search);
          show('home');
          if (id.length > 1) setTimeout(() => document.querySelector(id)?.scrollIntoView(), 60);
        }
      }
    };
    document.addEventListener('click', onClick);

    // Reveal lines/items
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.2 });
    const observeReveals = () => {
      document.querySelectorAll('hr.hl,.svc li,.pc').forEach((el, i) => {
        if (!(el as HTMLElement).dataset.ob) {
          (el as HTMLElement).dataset.ob = '1';
          if (el.matches('li')) (el as HTMLElement).style.transitionDelay = `${(i % 6) * 0.08}s`;
          io.observe(el);
        }
      });
    };
    observeReveals();
    const mo = new MutationObserver(observeReveals);
    mo.observe(document.body, { childList: true, subtree: true });

    // Word reveals
    const revealWords = () => {
      document.querySelectorAll('.w').forEach((w) => {
        const r = w.getBoundingClientRect();
        w.classList.toggle('on', RM || r.top < innerHeight * 0.78);
      });
    };

    // Hero parallax
    const hero = document.getElementById('hero');
    const cv = document.getElementById('cv');
    const parallax = () => {
      revealWords();
      const y = scrollY;
      if (hero && cv && y < innerHeight) {
        (cv as HTMLElement).style.opacity = String(1 - (y / innerHeight) * 0.9);
        (cv as HTMLElement).style.transform = `translateY(${y * 0.2}px)`;
        document.querySelectorAll<HTMLElement>('.card').forEach((c) => {
          const p = parseFloat(c.dataset.p || '0');
          c.style.translate = `0 ${-y * p * 3}px`;
        });
      }
      // roadmap progress handled by component; footer wordmark
      const wm = document.getElementById('wm');
      const wmw = document.querySelector('.wmw');
      if (wm && wmw) {
        const r = wmw.getBoundingClientRect();
        if (r.top < innerHeight * 0.8) wm.classList.add('in');
      }
    };
    addEventListener('scroll', parallax, { passive: true });
    parallax();

    // Smooth scroll (inertia) on fine pointer, no reduced motion
    let cleanupSmooth = () => {};
    if (!RM && matchMedia('(pointer:fine)').matches) {
      let t = scrollY, c = scrollY, on = false;
      const wheel = (e: WheelEvent) => {
        if ((e as any).ctrlKey) return;
        e.preventDefault();
        t = Math.max(0, Math.min(t + e.deltaY, document.documentElement.scrollHeight - innerHeight));
        if (!on) {
          on = true; c = scrollY;
          (function f() {
            c += (t - c) * 0.1; scrollTo(0, c);
            if (Math.abs(t - c) > 0.5) requestAnimationFrame(f); else on = false;
          })();
        }
      };
      const sync = () => { if (!on) { t = scrollY; c = scrollY; } };
      addEventListener('wheel', wheel, { passive: false });
      addEventListener('scroll', sync, { passive: true });
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      cleanupSmooth = () => { removeEventListener('wheel', wheel as any); removeEventListener('scroll', sync); document.documentElement.style.scrollBehavior = prev; };
    }

    // Show admin link if signed-in admin
    (async () => {
      try {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        if (data?.is_admin) {
          const al = document.getElementById('admin-link'); if (al) al.style.display = 'inline';
        }
      } catch {}
    })();

    return () => {
      removeEventListener('hashchange', applyHash);
      document.removeEventListener('click', onClick);
      removeEventListener('scroll', parallax);
      cleanupSmooth();
      io.disconnect(); mo.disconnect();
    };
  }, []);
  return null;
}
