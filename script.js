/* =========================================================
   Sehaj's matchday — all the interactive bits (and pranks)
   ========================================================= */

const $ = (s) => document.querySelector(s);
let audio = null;
const getAudio = () => (audio ||= new (window.AudioContext || window.webkitAudioContext)());

/* ---------- Referee whistle (synthesised, no files) ---------- */
function whistle() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    [[0, 0.18], [0.24, 0.55]].forEach(([start, len]) => {
      const osc = ctx.createOscillator();
      const trill = ctx.createOscillator();
      const trillGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.frequency.value = 2900;
      trill.frequency.value = 32;
      trillGain.gain.value = 140;
      trill.connect(trillGain).connect(osc.frequency);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.08, t + start + 0.02);
      gain.gain.setValueAtTime(0.08, t + start + len - 0.04);
      gain.gain.linearRampToValueAtTime(0, t + start + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + start); trill.start(t + start);
      osc.stop(t + start + len); trill.stop(t + start + len);
    });
  } catch (e) { /* no audio, no problem */ }
}

/* =========================================================
   PRANK #1 — the walk-out button dodges three times
   ========================================================= */
const tunnel = $('#tunnel');
const walkout = $('#walkout');
const taunt = $('#taunt');
const taunts = [
  'Too slow.',
  'Nutmegged. Try again.',
  'Okay, okay. Last one, I promise. It’s yours now.',
];
let dodges = 0;

function dodge() {
  if (dodges >= 3) return false;
  const pad = 20;
  const w = walkout.offsetWidth, h = walkout.offsetHeight;
  const rect = walkout.getBoundingClientRect();
  let x, y, tries = 0;
  do {
    x = pad + Math.random() * (window.innerWidth - w - pad * 2);
    y = pad + Math.random() * (window.innerHeight - h - pad * 2);
    tries++;
  } while (Math.hypot(x - rect.left, y - rect.top) < 160 && tries < 30);
  walkout.classList.add('loose');
  walkout.style.left = x + 'px';
  walkout.style.top = y + 'px';
  taunt.textContent = taunts[dodges];
  dodges++;
  return true;
}

// On phones a tap fires pointerdown AND click; skip that click so one tap = one dodge.
let skipWalkClick = false;
walkout.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(); });
walkout.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && dodge()) { e.preventDefault(); skipWalkClick = true; }
});
walkout.addEventListener('click', (e) => {
  if (skipWalkClick) { skipWalkClick = false; return; }
  if (dodges < 3) { e.preventDefault(); dodge(); return; } // keyboard users get dodged too
  enterStadium();
});

function enterStadium() {
  whistle();
  tunnel.classList.add('gone');
  document.body.classList.remove('locked');
  startClock();
  setTimeout(() => tunnel.remove(), 1000);
  $('#kickoff').scrollIntoView({ behavior: 'instant', block: 'start' });
}

/* ---------- Match clock: 1 second = 1 match minute ---------- */
function startClock() {
  const clock = $('#clock');
  const home = $('#score-home');
  let min = 0;
  const id = setInterval(() => {
    min++;
    if (min === 45) clock.textContent = 'HT';
    else if (min <= 90) clock.textContent = min + "'";
    if (min === 67) { home.textContent = '2'; flash(home); }
    if (min === 90) { clock.textContent = 'FT'; clearInterval(id); }
  }, 1000);
}
function flash(el) {
  el.animate([{ color: '#C6F432', transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 700 });
}

/* =========================================================
   PRANK #2 — Sehaj does the SIUUU
   The animation runs exactly as long as the audio clip, and the
   landing is timed to the moment the shout starts.
   ========================================================= */
const siuAudio = new Audio('audio/siu.mp3');
siuAudio.preload = 'auto';
const LAND_AT = 0.56; // fraction of the clip where the "SIUUU" shout begins
const stage = $('#siu-stage');
let siuDur = 4.39;
siuAudio.addEventListener('loadedmetadata', () => {
  if (isFinite(siuAudio.duration) && siuAudio.duration > 0) siuDur = siuAudio.duration;
  stage.style.setProperty('--siu-dur', siuDur + 's');
});

function confetti() {
  const colours = ['#C8A24B', '#FFFFFF', '#0F1B3D', '#C6F432'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colours[i % colours.length];
    document.body.appendChild(c);
    const drift = (Math.random() - 0.5) * 220;
    c.animate(
      [{ transform: 'translate(0,0) rotate(0)' },
       { transform: `translate(${drift}px, 105vh) rotate(${Math.random() * 720}deg)` }],
      { duration: 1500 + Math.random() * 1300, easing: 'cubic-bezier(.3,.6,.6,1)' }
    ).onfinish = () => c.remove();
  }
}
let celebrating = false;
$('#siu').addEventListener('click', () => {
  if (celebrating) return;
  celebrating = true;
  if (playing) $('#pl-play').click(); // pause the beat so the SIUUU is heard
  stage.style.setProperty('--siu-dur', siuDur + 's');
  stage.classList.remove('go'); void stage.offsetWidth; stage.classList.add('go');
  siuAudio.currentTime = 0;
  siuAudio.play().catch(() => {}); // still animates if audio is blocked
  setTimeout(() => {
    confetti();
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
  }, siuDur * LAND_AT * 1000);
  setTimeout(() => { stage.classList.remove('go'); celebrating = false; }, siuDur * 1000 + 100);
});

/* =========================================================
   PRANK #3 — the "Yes" button won't let you be a Barça fan
   ========================================================= */
const yes = $('#barca-yes');
const result = $('#medical-result');
const nope = ['Nope.', 'Not today.', 'This club has standards.', 'Try "No".', 'VAR says no.'];
let n = 0;
function runAway() {
  const box = $('#medical-btns').getBoundingClientRect();
  const maxX = Math.max(60, box.width - yes.offsetWidth);
  const x = (Math.random() * maxX) - yes.offsetLeft;
  const y = (Math.random() - 0.5) * 60;
  yes.style.transform = `translate(${x}px, ${y}px) rotate(${(Math.random() - 0.5) * 30}deg)`;
  result.textContent = nope[n++ % nope.length];
}
yes.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') runAway(); });
yes.addEventListener('pointerdown', (e) => { e.preventDefault(); runAway(); });
yes.addEventListener('click', (e) => { e.preventDefault(); result.textContent = 'Nice try. The referee has overruled that.'; });
$('#barca-no').addEventListener('click', () => {
  result.textContent = 'Medical passed. Welcome to the club — my inbox is open.';
  yes.style.transform = '';
});

/* ---------- Bonus prank: the tab title when you leave ---------- */
const realTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? 'Come back, it’s 1–1 😭' : realTitle;
});

/* =========================================================
   Skills — the starting XI
   ========================================================= */
const squad = [
  { n: 9,  name: 'Machine learning', pos: 'Striker', x: 50, y: 15, note: 'The finisher. Training models that turn past data into predictions.' },
  { n: 11, name: 'Web dev', pos: 'Left wing', x: 18, y: 22, note: 'HTML, CSS and JavaScript. Signed this season, scored on debut with this website.' },
  { n: 17, name: 'APIs & automation', pos: 'Right wing', x: 82, y: 22, note: 'Pace on the break. Pulls data from APIs and makes boring tasks run themselves.' },
  { n: 8,  name: 'AI tools', pos: 'Central midfield', x: 22, y: 43, note: 'The modern box-to-box player. Using LLMs like a teammate to brainstorm, debug and learn faster.' },
  { n: 7,  name: 'Python', pos: 'Central midfield · Captain', x: 50, y: 48, note: 'Captain. The language I reach for first — data, scripts, models, automation.', c: true },
  { n: 10, name: 'Data storytelling', pos: 'Playmaker', x: 78, y: 43, note: 'Power BI and charts that turn numbers into something a person actually understands in five seconds.' },
  { n: 3,  name: 'Excel', pos: 'Left back', x: 14, y: 68, note: 'Unfashionable, reliable, never injured. Pivot tables on demand.' },
  { n: 4,  name: 'SQL & databases', pos: 'Centre back', x: 38, y: 71, note: 'Organises the back line. Knows where every row lives.' },
  { n: 5,  name: 'Statistics', pos: 'Centre back', x: 62, y: 71, note: 'Reads the game. Can tell a real pattern from a lucky bounce.' },
  { n: 2,  name: 'Cloud (AWS)', pos: 'Right back', x: 86, y: 68, note: 'Overlapping into new territory: the basics of compute, storage and running things in the cloud.' },
  { n: 1,  name: 'Git & GitHub', pos: 'Goalkeeper', x: 50, y: 89, note: 'Last line of defence. Every version saved, every mistake recoverable.', gk: true },
];
const pitch = $('#pitch');
squad.forEach((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pl' + (p.gk ? ' gk' : '');
  b.style.left = p.x + '%';
  b.style.top = p.y + '%';
  b.setAttribute('aria-pressed', p.c ? 'true' : 'false');
  b.innerHTML = `<span class="dot">${p.n}</span><span class="lbl">${p.name}</span>${p.c ? '<span class="armband">C</span>' : ''}`;
  b.addEventListener('click', () => {
    pitch.querySelectorAll('.pl').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    $('#pc-pos').textContent = p.pos + ' · #' + p.n;
    $('#pc-name').textContent = p.name;
    $('#pc-note').textContent = p.note;
  });
  pitch.appendChild(b);
});

/* =========================================================
   Now-playing bar: sections are tracks
   ========================================================= */
const sections = [...document.querySelectorAll('[data-track]')];
let current = 0;
const trackEl = $('#pl-track');
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      current = sections.indexOf(en.target);
      trackEl.textContent = `${current + 1}. ${en.target.dataset.track}`;
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => io.observe(s));
trackEl.textContent = `1. ${sections[0].dataset.track}`;

const go = (i) => sections[Math.max(0, Math.min(sections.length - 1, i))].scrollIntoView({ behavior: 'smooth' });
$('#pl-prev').addEventListener('click', () => go(current - 1));
$('#pl-next').addEventListener('click', () => go(current + 1));

const bar = $('#pl-bar');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
}, { passive: true });

/* =========================================================
   Beat machine — a tiny house loop at 124 BPM, all synthesised
   ========================================================= */
const BPM = 124;
const step = 60 / BPM / 4; // 16th notes
let playing = false, nextTime = 0, stepIdx = 0, timer = null, noiseBuf = null;
const bass = [55, 0, 55, 0, 0, 55, 0, 65.4, 55, 0, 55, 0, 0, 49, 0, 49]; // A1 groove

function noise(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function kick(ctx, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.36);
}
function hat(ctx, t, vol, len) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(ctx); f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + len);
}
function clap(ctx, t) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(ctx); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + 0.2);
}
function bassNote(ctx, t, hz) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = hz;
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.15);
  g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(f).connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.22);
}
function schedule() {
  const ctx = getAudio();
  while (nextTime < ctx.currentTime + 0.12) {
    const s = stepIdx % 16;
    if (s % 4 === 0) kick(ctx, nextTime);
    if (s === 4 || s === 12) clap(ctx, nextTime);
    if (s % 4 === 2) hat(ctx, nextTime, 0.22, 0.09); else hat(ctx, nextTime, 0.05, 0.03);
    if (bass[s]) bassNote(ctx, nextTime, bass[s]);
    nextTime += step; stepIdx++;
  }
}
$('#pl-play').addEventListener('click', () => {
  const ctx = getAudio();
  const btn = $('#pl-play');
  playing = !playing;
  if (playing) {
    ctx.resume();
    nextTime = ctx.currentTime + 0.05; stepIdx = 0;
    timer = setInterval(schedule, 25);
  } else {
    clearInterval(timer);
  }
  btn.textContent = playing ? '❚❚' : '▶';
  btn.setAttribute('aria-pressed', String(playing));
  btn.setAttribute('aria-label', playing ? 'Pause beat' : 'Play beat');
  $('.player').classList.toggle('playing', playing);
  $('#pl-status').textContent = playing ? 'house beat, 124 BPM' : 'beat paused';
});

/* =========================================================
   Song switcher — official Spotify embeds (streamed from Spotify,
   no audio files copied into this site). Add or swap songs here:
   the ID is the part after /track/ in a Spotify song link.
   ========================================================= */
const SONGS = [
  { id: '3FqtduiaqnFYvBgKuc6QWQ', title: 'Winning Speech', artist: 'Karan Aujla' },
  { id: '2QsdTZ9STnD2NcuXj0ifgh', title: 'SICKO MODE', artist: 'Travis Scott' },
  { id: '3qAZJiKi15QQgqR1UcrAkc', title: 'After Party', artist: 'Don Toliver' },
];
let songIdx = -1;
const songBtn = $('#pl-song');
const panel = $('#song-panel');
function showSong(i) {
  songIdx = i;
  const s = SONGS[i];
  $('#song-now').innerHTML = `${s.title} · ${s.artist}<small>${i + 1} of ${SONGS.length}</small>`;
  $('#song-embed').innerHTML = `<iframe title="${s.title} by ${s.artist} on Spotify" src="https://open.spotify.com/embed/track/${s.id}?theme=0" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  $('#pl-status').textContent = `on deck: ${s.title} · ${s.artist}`;
  panel.hidden = false;
  songBtn.setAttribute('aria-expanded', 'true');
  if (playing) $('#pl-play').click(); // stop the beat so they don't clash
}
songBtn.addEventListener('click', () => showSong((songIdx + 1) % SONGS.length));
$('#song-close').addEventListener('click', () => {
  panel.hidden = true;
  $('#song-embed').innerHTML = ''; // stops playback
  songBtn.setAttribute('aria-expanded', 'false');
  $('#pl-status').textContent = 'beat paused';
});

/* =========================================================
   Stoppage time — the footer board counts your minutes here
   ========================================================= */
const arrived = Date.now();
const mins = () => Math.max(1, Math.round((Date.now() - arrived) / 60000));
const lines = [
  () => 'By the time you’ve read this, Real Madrid have already come back from 3–0 down. Relax.',
  () => `You’ve been here ${mins()} minute${mins() === 1 ? '' : 's'}. Madrid score in the 93rd anyway, so take your time.`,
  () => 'Somewhere, a Barça fan is still trying to click the “Yes” button.',
  () => 'This page has no VAR. Every goal stands.',
  () => 'If you scrolled this far, you’re officially part of the squad. Kit is in the post.',
  () => 'Full time: Sehaj 2–0 Boredom. Thanks for staying till the final whistle.',
];
let li = 0;
function nextLine() {
  li = (li + 1) % lines.length;
  const el = $('#footer-line');
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
  el.textContent = lines[li]();
}
$('#board').addEventListener('click', nextLine);
setInterval(nextLine, 7000);
setInterval(() => { $('#board-num').textContent = '+' + mins(); }, 1000);

/* =========================================================
   Night match mode — floodlights on/off (remembered per visitor)
   ========================================================= */
const floodBtn = $('#flood-toggle');
function setNight(on, animate) {
  document.body.classList.toggle('night', on);
  floodBtn.setAttribute('aria-pressed', String(on));
  $('#flood-label').textContent = on ? 'Night match: on' : 'Night match: off';
  if (on && animate) {
    document.body.classList.remove('lights-on'); void document.body.offsetWidth;
    document.body.classList.add('lights-on');
    setTimeout(() => document.body.classList.remove('lights-on'), 1700);
  }
  try { localStorage.setItem('night', on ? '1' : '0'); } catch (e) {}
}
floodBtn.addEventListener('click', () => setNight(!document.body.classList.contains('night'), true));
try { if (localStorage.getItem('night') === '1') setNight(true, false); } catch (e) {}

/* =========================================================
   Football cursor trail — laptops only, when you move fast
   ========================================================= */
if (matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let lx = 0, ly = 0, lt = 0;
  window.addEventListener('mousemove', (e) => {
    const now = performance.now(), dt = now - lt;
    if (dt < 24) return;
    const speed = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;
    lx = e.clientX; ly = e.clientY; lt = now;
    if (speed < 1.4) return;
    const d = document.createElement('span');
    d.className = 'trail';
    d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
    document.body.appendChild(d);
    d.animate([{ opacity: .8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.2)' }],
      { duration: 450, easing: 'ease-out' }).onfinish = () => d.remove();
  }, { passive: true });
}

/* =========================================================
   Ballon d'Or vote — the Messi button shrinks every time you go near it
   ========================================================= */
const lm = $('#vote-lm');
let lmScale = 1, voted = false;
function shrinkMessi() {
  if (voted) return;
  lmScale = Math.max(0.12, lmScale * 0.72);
  lm.style.transform = `scale(${lmScale})`;
}
lm.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') shrinkMessi(); });
let skipLmClick = false;
lm.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && lmScale > 0.2) { e.preventDefault(); shrinkMessi(); skipLmClick = true; } });
function showVote(pct, text) {
  voted = true;
  $('#vote-result').hidden = false;
  requestAnimationFrame(() => { $('#vote-fill').style.width = pct + '%'; });
  $('#vote-text').textContent = text;
}
$('#vote-cr').addEventListener('click', () => showVote(99.9, 'Correct. Ronaldo 99.9% — Messi 0.1%. The committee agrees.'));
lm.addEventListener('click', (e) => {
  if (skipLmClick) { skipLmClick = false; return; }
  if (lmScale > 0.2) { e.preventDefault(); shrinkMessi(); return; }
  showVote(99.9, 'Vote received… and quietly counted for Ronaldo. Ronaldo 99.9% — Messi 0.1%.');
});

/* =========================================================
   Penalty shootout — 5 kicks, score 3 to get scouted
   ========================================================= */
const keeper = $('#keeper'), ball = $('#ball'), penMsg = $('#pen-msg');
const shotBtns = [...document.querySelectorAll('#shoot-btns .btn')];
const pens = [...document.querySelectorAll('#pens span')];
let shot = 0, goals = 0, busy = false;
const targetsX = [0.16, 0.5, 0.84]; // across the goal
const saveLines = ['Saved! Wrong way.', 'Saved! The keeper read it.', 'Denied!'];
const goalLines = ['GOAL!', 'Top bins!', 'Back of the net!', 'Keeper sent the wrong way!'];

function shoot(dir) {
  if (busy || shot >= 5) return;
  busy = true; shotBtns.forEach((b) => (b.disabled = true));
  const keeperDir = Math.floor(Math.random() * 3);
  const goal = $('#goal').getBoundingClientRect();
  const b0 = ball.getBoundingClientRect();
  const tx = goal.left + goal.width * targetsX[dir] - (b0.left + b0.width / 2);
  const ty = goal.top + goal.height * (dir === 1 ? 0.35 : 0.45) - (b0.top + b0.height / 2);
  keeper.className = 'keeper dive-' + keeperDir;
  const saved = keeperDir === dir;
  const endX = saved ? tx * 0.85 : tx, endY = saved ? ty * 0.7 : ty;
  ball.animate(
    [{ transform: 'translate(0,0) scale(1) rotate(0)' },
     { transform: `translate(${endX}px, ${endY}px) scale(.62) rotate(540deg)` }],
    { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
  );
  setTimeout(() => {
    if (saved) {
      ball.animate([{ transform: `translate(${endX}px, ${endY}px) scale(.62)` },
                    { transform: `translate(${endX * 1.5}px, ${endY * 0.3}px) scale(.8) rotate(900deg)` }],
                   { duration: 400, easing: 'ease-out', fill: 'forwards' });
    }
    pens[shot].className = saved ? 'missed' : 'scored';
    if (!saved) goals++;
    shot++;
    penMsg.textContent = (saved ? saveLines : goalLines)[Math.floor(Math.random() * (saved ? saveLines : goalLines).length)];
    setTimeout(() => {
      ball.getAnimations().forEach((a) => a.cancel());
      keeper.className = 'keeper';
      if (shot === 5) return finish();
      busy = false; shotBtns.forEach((b) => (b.disabled = false));
      penMsg.textContent = `Penalty ${shot + 1} of 5. Pick a corner.`;
    }, 1100);
  }, 540);
}
function finish() {
  if (goals >= 3) {
    penMsg.textContent = `${goals}/5 — You've been scouted! Contract's in the transfer window.`;
    confetti();
  } else {
    penMsg.textContent = `${goals}/5 — The keeper wins this one.`;
  }
  $('#pen-again').hidden = false;
}
shotBtns.forEach((b) => b.addEventListener('click', () => shoot(+b.dataset.dir)));
$('#pen-again').addEventListener('click', () => {
  shot = 0; goals = 0; busy = false;
  pens.forEach((p) => (p.className = ''));
  shotBtns.forEach((b) => (b.disabled = false));
  $('#pen-again').hidden = true;
  penMsg.textContent = 'Pick a corner.';
});
