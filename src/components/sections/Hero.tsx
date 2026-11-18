import { useEffect, useRef } from 'react';
import { C } from '../../lib/content';
import { publicUrl } from '../../lib/supabaseClient';

export default function Hero() {
  const heroSrc = publicUrl(C.hero.src);
  const heroPoster = publicUrl(C.hero.poster);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const vid = videoRef.current!;
    const hero = heroRef.current!;
    const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const GHOST = false;

    let vok = false;
    let raf = 0;
    let io: IntersectionObserver | null = null;
    let onResize: (() => void) | null = null;
    let removePointer = () => {};
    let vis = true;

    const showVideoFallback = () => {
      cv.style.display = 'none';
      if (heroSrc) {
        vid.style.opacity = '1';
        vid.style.zIndex = '0';
      }
    };

    // Always set up video source/playback so it can autoplay (and serve as fallback)
    if (heroSrc) {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.loop = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.setAttribute('muted', '');
      vid.setAttribute('loop', '');
      vid.setAttribute('autoplay', '');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', '');
      if (/^https?:\/\//i.test(heroSrc)) vid.crossOrigin = 'anonymous';
      vid.poster = heroPoster || '';
      vid.preload = window.innerWidth < 700 ? 'metadata' : 'auto';
      const start = () => { const p = vid.play(); if (p) p.catch(() => {}); };
      vid.addEventListener('loadeddata', () => { vok = true; start(); });
      vid.addEventListener('canplay', () => { vok = true; start(); });
      vid.addEventListener('playing', () => { vok = true; });
      vid.addEventListener('ended', () => { vid.currentTime = 0; start(); });
      vid.src = heroSrc;
      vid.load();
      start();
    }

    const gl = cv.getContext('webgl', { antialias: false, alpha: true });
    if (!gl) {
      showVideoFallback();
      return;
    }

    const tc = document.createElement('canvas');
    const tx = tc.getContext('2d')!;
    let act = 0, mx = 0.5, my = 0.5, lx: number | null = null, ly = 0, lastT = 0, dpr = 1, tt: WebGLTexture, vt: WebGLTexture, lastPtr = -1e9, ghosting = false;

    // Spotlight + trail-warp effect, styled for white/sky-blue theme
    const FS = `precision mediump float;uniform sampler2D t,tr;uniform vec2 r,m,v;uniform float T,has,va,bs;
    vec3 src(vec2 u){
     float a=r.x/r.y;
     if(has>.5){
      vec2 s=a>va?vec2(1.,va/a):vec2(a/va,1.);
      return texture2D(t,clamp((u-.5)*s+.5,0.,1.)).rgb;
     }
     float n=sin(u.x*4.+T*.25+sin(u.y*5.-T*.3)*2.)*.5+.5;
     vec3 base=mix(vec3(1.0), vec3(0.94,0.98,1.0), 0.7);
     vec3 sky=vec3(0.055,0.647,0.914);
     return mix(base, mix(base, sky, 0.16+n*0.10), 0.5);
    }
    void main(){vec2 u=gl_FragCoord.xy/r;u.y=1.-u.y;float a=r.x/r.y;vec2 e=vec2(.008);
     float c0=texture2D(tr,u).r,gx=texture2D(tr,u+vec2(e.x,0.)).r-texture2D(tr,u-vec2(e.x,0.)).r,gy=texture2D(tr,u+vec2(0.,e.y)).r-texture2D(tr,u-vec2(0.,e.y)).r;
     vec2 o=vec2(gx,gy)*.35+vec2(sin(u.y*6.+T*.6),cos(u.x*5.+T*.5))*.002;
     vec2 dm=(u-m)*vec2(a,1.);
     float rv=clamp(exp(-dot(dm,dm)*28.)*v.x*.9+c0*1.6,0.,1.);
     vec3 c=vec3(src(u+o*1.5).r,src(u+o).g,src(u+o*.5).b);
     vec3 sky=vec3(0.056,0.647,0.914);
     float reveal=mix(bs,1.0,rv);
     c=mix(vec3(1.0), c, reveal);
     c+=sky*length(o)*0.7*rv;
     c=mix(c, vec3(1.0), (1.0-rv)*0.05);
     c*=1.-.05*length(u-.5);
     gl_FragColor=vec4(c,1.);}`;

    let U: Record<string, WebGLUniformLocation | null> = {};
    const sh = (t: number, s: string) => {
      const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o));
      return o;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(pr));
      showVideoFallback();
      return;
    }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    ['t', 'tr', 'r', 'm', 'v', 'T', 'has', 'va', 'bs'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
    const mk = (u: number) => {
      gl.activeTexture(gl.TEXTURE0 + u);
      const x = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, x);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
      ([[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]] as const).forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
      return x;
    };
    vt = mk(0); tt = mk(1);
    gl.uniform1i(U.t!, 0); gl.uniform1i(U.tr!, 1);

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = hero.clientWidth * dpr; cv.height = hero.clientHeight * dpr;
      gl.viewport(0, 0, cv.width, cv.height);
      tc.width = 256; tc.height = Math.max(64, Math.round(256 * hero.clientHeight / Math.max(1, hero.clientWidth)));
      tx.fillStyle = '#000'; tx.fillRect(0, 0, tc.width, tc.height);
    }
    function draw(ts: number) {
      if (heroSrc && vis && (vid.paused || vid.ended)) { vid.play().catch(() => {}); }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tt); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vt);
      if (vid.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, vid);
      gl.uniform2f(U.r!, cv.width, cv.height); gl.uniform2f(U.m!, mx, my); gl.uniform2f(U.v!, act, 0); gl.uniform1f(U.T!, ts / 1000);
      gl.uniform1f(U.bs!, innerWidth < 700 ? 0.62 : 0.55);
      gl.uniform1f(U.has!, (heroSrc && vid.readyState >= 2) ? 1 : 0);
      gl.uniform1f(U.va!, (vid.videoWidth || 16) / (vid.videoHeight || 9));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function loop(ts: number) {
      if (vis && ts - lastT > 16) {
        lastT = ts; act *= 0.97;
        if (GHOST && performance.now() - lastPtr > 2000) {
          const t = ts / 1000; ghosting = true;
          move(0.5 + 0.32 * Math.sin(t * 0.45) + 0.12 * Math.sin(t * 1.1), 0.5 + 0.28 * Math.sin(t * 0.6 + 1) + 0.1 * Math.cos(t * 0.9), false); act = 0.85;
        }
        tx.globalCompositeOperation = 'source-over'; tx.fillStyle = 'rgba(0,0,0,.07)'; tx.fillRect(0, 0, tc.width, tc.height);
        draw(ts);
      }
      raf = requestAnimationFrame(loop);
    }
    function stamp(x: number, y: number, s: number) {
      const g = tx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      tx.globalCompositeOperation = 'lighter'; tx.fillStyle = g; tx.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
    function move(x: number, y: number, big: boolean) {
      mx = x; my = y; act = 1; const X = x * tc.width, Y = y * tc.height;
      if (lx === null || big) { lx = X; ly = Y; }
      const n = Math.max(1, Math.ceil(Math.hypot(X - lx, Y - ly) / 4));
      for (let i = 1; i <= n; i++) stamp(lx + (X - lx) * i / n, ly + (Y - ly) * i / n, big ? 40 : 24);
      lx = X; ly = Y;
    }
    function ripple(e: PointerEvent) {
      const r = hero.getBoundingClientRect();
      if (ghosting) { ghosting = false; lx = null; }
      lastPtr = performance.now();
      move((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.type === 'pointerdown');
    }
    const onLeave = () => { lx = null; };
    hero.addEventListener('pointermove', ripple);
    hero.addEventListener('pointerdown', ripple);
    hero.addEventListener('pointerleave', onLeave);
    removePointer = () => {
      hero.removeEventListener('pointermove', ripple);
      hero.removeEventListener('pointerdown', ripple);
      hero.removeEventListener('pointerleave', onLeave);
    };

    io = new IntersectionObserver(e => {
      vis = e[0].isIntersecting;
      if (heroSrc) vis ? vid.play().catch(() => {}) : vid.pause();
    });
    io.observe(hero);

    onResize = () => { size(); if (RM) draw(1200); };
    addEventListener('resize', onResize);
    size();
    if (RM) draw(1200); else raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      if (onResize) removeEventListener('resize', onResize);
      removePointer();
    };
  }, []);

  return (
    <section id="hero" ref={heroRef as any} style={{ padding: 0 }}>
      <canvas id="cv" ref={canvasRef} aria-hidden="true"></canvas>
      <video id="vid" ref={videoRef} muted loop autoPlay playsInline preload="auto" aria-label="Background video"></video>
      <div className="hero-in">
        <h1 id="h1">
          {C.hero.lines.map((l, i) => (
            <span className="ln" key={i}><span style={{ animationDelay: `${0.3 + i * 0.15}s` }}>{l}</span></span>
          ))}
        </h1>
        <p className="sub" id="sub">{C.hero.sub}</p>
        <div><a className="btn" id="cta" href="#join">{C.hero.cta}</a></div>
      </div>

    </section>
  );
}
