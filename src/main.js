import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { translations } from './i18n.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// The intro plays from the top, so don't let the browser restore a mid-page position
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
document.body.classList.add('loading');
$('#year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------------- */
/* Smooth scroll                                                     */
/* ---------------------------------------------------------------- */
const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

$$('a[href^="#"]').forEach(a =>
  a.addEventListener('click', e => {
    const target = a.getAttribute('href');
    if (target.length < 2) return;
    e.preventDefault();
    document.documentElement.classList.remove('menu-open');
    lenis.scrollTo(target === '#top' ? 0 : target, { offset: 0, duration: 1.6 });
  })
);

/* ---------------------------------------------------------------- */
/* Split text into masked words                                     */
/* ---------------------------------------------------------------- */
function splitWords(el) {
  const text = el.textContent.trim();
  el.replaceChildren();
  text.split(/\s+/).forEach((word, i) => {
    if (i) el.append(' ');
    const outer = document.createElement('span');
    const inner = document.createElement('span');
    outer.className = 'w';
    inner.textContent = word;
    outer.append(inner);
    el.append(outer);
  });
  return $$('.w > span', el);
}

/* ---------------------------------------------------------------- */
/* i18n                                                              */
/* ---------------------------------------------------------------- */
let lang = 'en';
try { lang = localStorage.getItem('teno-lang') || 'en'; } catch {}

function applyLang(next, animate) {
  lang = next;
  const html = document.documentElement;
  html.lang = next;
  html.dir = next === 'ar' ? 'rtl' : 'ltr';
  $('#langToggle').textContent = next === 'ar' ? 'EN' : 'عربي';
  const dict = translations[next];
  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const value = dict[key] ?? translations.en[key];
    if (value == null) return;
    el.textContent = value;
    if (el.classList.contains('split')) splitWords(el);
  });
  try { localStorage.setItem('teno-lang', next); } catch {}
  if (animate) {
    gsap.fromTo('main, .nav, .footer', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
}

$('#langToggle').addEventListener('click', () => {
  gsap.to('main, .nav, .footer', {
    opacity: 0, duration: 0.3,
    onComplete: () => applyLang(lang === 'en' ? 'ar' : 'en', true),
  });
});
applyLang(lang, false);

/* ---------------------------------------------------------------- */
/* Preloader                                                         */
/* ---------------------------------------------------------------- */
function runLoader() {
  const paths = $$('.loader .lp');
  paths.forEach(p => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });

  const heroImgs = $$('.hero-card img');
  let loaded = 0;
  const progress = { v: 0 };
  const bar = $('#loaderBar');

  const tl = gsap.timeline();
  tl.to(paths, { strokeDashoffset: 0, duration: 1.6, stagger: 0.18, ease: 'power2.inOut' })
    .to('.loader .lt', { opacity: 1, duration: 0.6 }, '-=0.5')
    .to('.loader-word span, .loader-word em', { y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, '-=0.8');

  const done = new Promise(resolve => {
    const tick = () => {
      loaded++;
      gsap.to(progress, { v: loaded / heroImgs.length, duration: 0.4, onUpdate: () => (bar.style.width = progress.v * 100 + '%') });
      if (loaded === heroImgs.length) resolve();
    };
    heroImgs.forEach(img => (img.complete ? tick() : (img.addEventListener('load', tick), img.addEventListener('error', tick))));
  });

  Promise.all([done, tl.then()]).then(() => {
    gsap.timeline()
      .to('.loader-mark', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .to('.loader-word, .loader-bar', { opacity: 0, y: -20, duration: 0.4 }, '<')
      .to('#loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
      .add(heroIntro, '-=0.55')
      .add(() => {
        $('#loader').remove();
        document.body.classList.remove('loading');
        lenis.start();
      });
  });
}

function heroIntro() {
  const tl = gsap.timeline();
  tl.from('.hero-title .word', { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.12, ease: 'expo.out' })
    .from('.hero-reveal', { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out' }, '-=0.9')
    .from('.hero-card', { y: 120, opacity: 0, scale: 0.9, duration: 1.4, stagger: 0.12, ease: 'expo.out' }, 0.1)
    .from('.hero-card img', { scale: 1.5, duration: 1.8, ease: 'expo.out' }, 0.1)
    .from('.hero-ring, .scroll-hint', { opacity: 0, duration: 1 }, '-=0.6')
    .from('.nav > *', { y: -30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.2);
  return tl;
}

/* ---------------------------------------------------------------- */
/* Molten chocolate drip under the hero                              */
/* ---------------------------------------------------------------- */
function initDrip() {
  const path = $('#dripPath');
  const W = 1440;
  const base = 16;
  const drips = Array.from({ length: 16 }, (_, i) => ({
    x: (i + 0.5) * (W / 16) + (Math.random() - 0.5) * 40,
    w: 18 + Math.random() * 26,
    max: 40 + Math.random() * 110,
    speed: 0.3 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
  }));
  let velocityBoost = 0;
  lenis.on('scroll', ({ velocity }) => (velocityBoost = Math.min(Math.abs(velocity) * 4, 50)));

  gsap.ticker.add(time => {
    velocityBoost *= 0.94;
    let d = `M0 0 L0 ${base}`;
    for (const k of drips) {
      const L = k.max * (0.55 + 0.45 * Math.sin(time * k.speed + k.phase)) + velocityBoost * (k.max / 150);
      const wave = Math.sin(time * 0.8 + k.x * 0.01) * 3;
      d += ` L${k.x - k.w} ${base + wave}`;
      d += ` C${k.x - k.w * 0.45} ${base + wave} ${k.x - k.w * 0.45} ${base + L} ${k.x} ${base + L}`;
      d += ` C${k.x + k.w * 0.45} ${base + L} ${k.x + k.w * 0.45} ${base + wave} ${k.x + k.w} ${base + wave}`;
    }
    d += ` L${W} ${base} L${W} 0 Z`;
    path.setAttribute('d', d);
  });
}

/* ---------------------------------------------------------------- */
/* Gold dust particles                                               */
/* ---------------------------------------------------------------- */
function initGoldDust() {
  const canvas = $('#goldDust');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  const mouse = { x: -999, y: -999 };
  const count = innerWidth < 700 ? 40 : 90;
  const particles = [];

  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.3,
      vy: -(Math.random() * 0.35 + 0.08), vx: (Math.random() - 0.5) * 0.15,
      tw: Math.random() * Math.PI * 2,
    });
  }

  const hero = $('#hero');
  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('mouseleave', () => (mouse.x = mouse.y = -999));

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);

  gsap.ticker.add(() => {
    if (!visible) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        p.x += (dx / dist) * 1.4;
        p.y += (dy / dist) * 1.4;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.tw += 0.03;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      const a = 0.35 + Math.sin(p.tw) * 0.35;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(243,226,179,${a})`);
      g.addColorStop(1, 'rgba(201,164,92,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ---------------------------------------------------------------- */
/* Hero parallax (mouse + scroll)                                    */
/* ---------------------------------------------------------------- */
function initHeroParallax() {
  const cards = $$('.hero-card');
  if (finePointer) {
    const setters = cards.map(c => ({
      x: gsap.quickTo(c, 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo(c, 'y', { duration: 1.2, ease: 'power3' }),
      d: parseFloat(c.dataset.depth),
    }));
    $('#hero').addEventListener('mousemove', e => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      setters.forEach(s => { s.x(nx * 40 * s.d); s.y(ny * 30 * s.d); });
    });
  }
  cards.forEach(c => {
    gsap.to(c, {
      yPercent: -30 * parseFloat(c.dataset.depth),
      ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });
  gsap.to('.hero-inner', {
    y: -120, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ---------------------------------------------------------------- */
/* Velocity-driven marquee                                           */
/* ---------------------------------------------------------------- */
function initMarquee() {
  const track = $('.marquee-track');
  const loop = gsap.to(track, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
  let dir = 1;
  lenis.on('scroll', ({ velocity, direction }) => {
    if (direction) dir = direction;
    gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(velocity), 40) * 0.25), duration: 0.3, overwrite: true });
  });
  gsap.ticker.add(() => {
    if (loop.timeScale() < 0 && loop.progress() < 0.001) loop.progress(0.999);
  });
}

/* ---------------------------------------------------------------- */
/* Generic reveals                                                   */
/* ---------------------------------------------------------------- */
function initReveals() {
  $$('.split').forEach(el => {
    const words = $$('.w > span', el).length ? $$('.w > span', el) : splitWords(el);
    gsap.from(words, {
      yPercent: 110, duration: 1.1, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  $$('.fade-up').forEach(el =>
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  );

  $$('.eyebrow').forEach(el =>
    gsap.from(el.querySelectorAll('.line'), { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
  );

  // counters
  $$('.count').forEach(el => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 2.2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = obj.v.toFixed(dec)),
    });
  });

  // story images
  gsap.fromTo('.si-1', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.story', start: 'top 70%', once: true } });
  gsap.from('.si-2', { y: 120, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.4, scrollTrigger: { trigger: '.story', start: 'top 70%', once: true } });
  $$('.story-img img').forEach(img =>
    gsap.fromTo(img, { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.story', scrub: true } })
  );

  // coffee cups
  gsap.from('.cup', { y: 100, opacity: 0, rotateX: -12, duration: 1.3, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.coffee-grid', start: 'top 80%', once: true } });

  // gallery
  $$('.g').forEach((g, i) =>
    gsap.fromTo(g, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', delay: (i % 4) * 0.08,
      scrollTrigger: { trigger: g, start: 'top 92%', once: true },
    })
  );

  // boutiques
  $$('.route').forEach(r => {
    const len = r.getTotalLength();
    gsap.fromTo(r, { strokeDashoffset: len, strokeDasharray: `${len} ${len}` }, {
      strokeDashoffset: 0, duration: 2, ease: 'power2.inOut',
      scrollTrigger: { trigger: '.bq-map', start: 'top 75%', once: true },
      onComplete: () => gsap.set(r, { strokeDasharray: '4 6' }),
    });
  });
  gsap.from('.pin, .routes text', { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.8, stagger: 0.08, ease: 'back.out(3)', scrollTrigger: { trigger: '.bq-map', start: 'top 75%', once: true } });
  gsap.from('.bq', { y: 50, opacity: 0, duration: 1, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.bq-grid', start: 'top 85%', once: true } });

  // order
  gsap.fromTo('.order-bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.order', scrub: true } });
  gsap.from('.order-mark', { rotate: -180, scale: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.order', start: 'top 70%', once: true } });
}

/* ---------------------------------------------------------------- */
/* Pinned horizontal collection                                      */
/* ---------------------------------------------------------------- */
function initCollections() {
  const track = $('.col-track');
  const distance = () => track.scrollWidth - innerWidth;

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.col-pin',
      start: 'top top',
      end: () => '+=' + distance(),
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: self => {
        gsap.set('.col-progress i', { scaleX: self.progress });
        const skew = gsap.utils.clamp(-6, 6, self.getVelocity() / -400);
        gsap.to('.product', { skewX: skew, duration: 0.5, ease: 'power3', overwrite: true });
      },
    },
  });

  $$('.product').forEach(p => {
    gsap.fromTo(p.querySelector('img'), { xPercent: -8 }, {
      xPercent: 8, ease: 'none',
      scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
    });
  });

  // Captions: IntersectionObserver sees the real (scrubbed) position, so the last card never gets stuck hidden
  const metas = $$('.p-meta');
  gsap.set(metas, { y: 40, opacity: 0 });
  const io = new IntersectionObserver(entries =>
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      gsap.to(e.target, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
      io.unobserve(e.target);
    }), { threshold: 0.3 });
  metas.forEach(m => io.observe(m));
}

/* ---------------------------------------------------------------- */
/* Signature clip-path reveal                                        */
/* ---------------------------------------------------------------- */
function initSignature() {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.signature', start: 'top top', end: 'bottom bottom', scrub: 1 },
  });
  tl.fromTo('.sig-img',
    { clipPath: 'inset(22% 30% 22% 30% round 400px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 })
    .fromTo('.sig-img img', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .to('.sig-copy', { opacity: 1, y: 0, duration: 0.4 }, 0.65)
    .from('.sig-copy h2', { y: 60, duration: 0.4 }, 0.65);
}

/* ---------------------------------------------------------------- */
/* Occasions hover preview                                           */
/* ---------------------------------------------------------------- */
function initOccasions() {
  if (!finePointer) return;
  const preview = $('.occ-preview');
  const img = preview.querySelector('img');
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
  const list = $('.occ-list');
  let shown = false;
  const show = () => { if (!shown) { shown = true; gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true }); } };
  const hide = () => { if (shown) { shown = false; gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.4, overwrite: true }); } };
  list.addEventListener('mousemove', e => {
    if (!shown) gsap.set(preview, { x: e.clientX - 140, y: e.clientY - 180 });
    xTo(e.clientX - 140);
    yTo(e.clientY - 180);
    show();
  });
  list.addEventListener('mouseleave', hide);
  // content can scroll away under a still pointer without firing mouseleave
  lenis.on('scroll', hide);
  $$('.occ').forEach(o =>
    o.addEventListener('mouseenter', () => {
      if (img.getAttribute('src') === o.dataset.img) return;
      gsap.fromTo(img, { scale: 1.3, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
      img.src = o.dataset.img;
    })
  );
  gsap.from('.occ', { y: 60, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.occ-list', start: 'top 80%', once: true } });
}

/* ---------------------------------------------------------------- */
/* Cursor, magnetic buttons, tilt                                    */
/* ---------------------------------------------------------------- */
function initCursor() {
  if (!finePointer) return;
  const cursor = $('.cursor');
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  const label = $('.cursor-label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  addEventListener('mousemove', e => { cursor.classList.add('ready'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });

  document.addEventListener('mouseover', e => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !labelled && !!interactive);
    if (labelled) label.textContent = labelled.dataset.cursor;
  });
}

function initMagnetic() {
  if (!finePointer) return;
  $$('.magnetic').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

function initTilt() {
  if (!finePointer) return;
  $$('.tilt').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: px * 12, rotateX: -py * 12, duration: 0.6, ease: 'power3' });
      gsap.to(el.querySelector('img'), { x: px * -20, y: py * -20, scale: 1.08, duration: 0.6, ease: 'power3' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      gsap.to(el.querySelector('img'), { x: 0, y: 0, scale: 1, duration: 0.9 });
    });
  });
}

/* ---------------------------------------------------------------- */
/* Nav + menu                                                        */
/* ---------------------------------------------------------------- */
function initNav() {
  const nav = $('#nav');
  let last = 0;
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('scrolled', scroll > 60);
    nav.classList.toggle('hidden', scroll > last && scroll > 400 && !document.documentElement.classList.contains('menu-open'));
    last = scroll;
  });
  $('#burger').addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('menu-open');
    open ? lenis.stop() : lenis.start();
    if (open) gsap.from('.menu a', { y: 60, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.25 });
  });
  $$('.menu a').forEach(a => a.addEventListener('click', () => lenis.start()));
}

/* ---------------------------------------------------------------- */
/* Lightbox                                                          */
/* ---------------------------------------------------------------- */
function initLightbox() {
  const box = $('#lightbox');
  const img = box.querySelector('img');
  const items = $$('.g img');
  let index = 0;
  const show = i => {
    index = (i + items.length) % items.length;
    img.src = items[index].src;
    img.alt = items[index].alt;
  };
  const close = () => { box.classList.remove('open'); lenis.start(); };
  $$('.g').forEach((g, i) => g.addEventListener('click', () => { show(i); box.classList.add('open'); lenis.stop(); }));
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  box.addEventListener('click', e => { if (e.target === box) close(); });
  addEventListener('keydown', e => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
}

/* ---------------------------------------------------------------- */
initNav();
initCursor();
initMagnetic();
initTilt();
initLightbox();

if (reduceMotion) {
  $('#loader').remove();
  document.body.classList.remove('loading');
  gsap.set('.sig-img', { clipPath: 'none' });
  gsap.set('.sig-copy', { opacity: 1 });
  lenis.start();
} else {
  initDrip();
  initGoldDust();
  initHeroParallax();
  initMarquee();
  initReveals();
  initCollections();
  initSignature();
  initOccasions();
  runLoader();
  addEventListener('load', () => ScrollTrigger.refresh());
}
