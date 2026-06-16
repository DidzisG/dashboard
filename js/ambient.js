// Ambient Background — animated mesh gradient + optional particle field
// Renders a slow-moving, colour-shifting gradient canvas behind the workspace

let ambientEnabled = false;
let ambientMode = 'gradient'; // 'gradient' | 'particles'
let animFrameId = null;
let canvas = null;
let ctx = null;
let saveCallback = null;

// ── Gradient mode ────────────────────────────────────────────────────────────
const GRAD_ORBS = [
  { x: 0.2, y: 0.2, r: 0.55, color: [100, 60, 200],  speed: 0.00018 },
  { x: 0.8, y: 0.6, r: 0.50, color: [30,  140, 200],  speed: 0.00022 },
  { x: 0.5, y: 0.9, r: 0.45, color: [160, 30,  140],  speed: 0.00014 },
  { x: 0.1, y: 0.8, r: 0.40, color: [20,  160, 160],  speed: 0.00025 },
];

let gradStartTime = 0;

function drawGradient(ts) {
  if (!ctx || !canvas) return;
  const w = canvas.width;
  const h = canvas.height;
  const t = (ts - gradStartTime) * 0.001;

  ctx.clearRect(0, 0, w, h);

  GRAD_ORBS.forEach((orb, i) => {
    const ox = (orb.x + Math.sin(t * orb.speed * 1000 + i * 2.1) * 0.25) * w;
    const oy = (orb.y + Math.cos(t * orb.speed * 1000 + i * 1.7) * 0.20) * h;
    const r  = orb.r * Math.max(w, h);

    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    const [r0, g0, b0] = orb.color;
    grad.addColorStop(0,   `rgba(${r0},${g0},${b0},0.18)`);
    grad.addColorStop(0.6, `rgba(${r0},${g0},${b0},0.04)`);
    grad.addColorStop(1,   `rgba(${r0},${g0},${b0},0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// ── Particle mode ─────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 60;
let particles = [];

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    });
  }
}

function drawParticles() {
  if (!ctx || !canvas) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Update + draw particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
    ctx.fill();
  });

  // Draw connecting lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────
function loop(ts) {
  if (!ambientEnabled) return;
  if (ambientMode === 'gradient') {
    drawGradient(ts);
  } else {
    drawParticles();
  }
  animFrameId = requestAnimationFrame(loop);
}

function startAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (ambientMode === 'particles') initParticles();
  gradStartTime = performance.now();
  animFrameId = requestAnimationFrame(loop);
}

function stopAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function resize() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (ambientMode === 'particles') initParticles();
}

// ── Public API ────────────────────────────────────────────────────────────────
export function setAmbientMode(mode) {
  ambientMode = mode;
  if (ambientEnabled) {
    startAnimation();
  }
  if (saveCallback) saveCallback('ambientMode', mode);
}

export function toggleAmbient(enabled) {
  ambientEnabled = enabled;
  if (!canvas) return;
  canvas.style.opacity = enabled ? '1' : '0';
  if (enabled) {
    startAnimation();
  } else {
    stopAnimation();
  }
  if (saveCallback) saveCallback('ambientEnabled', enabled);
}

export function initAmbient(state, onSave) {
  saveCallback = onSave;
  ambientEnabled = state.ambientEnabled ?? false;
  ambientMode    = state.ambientMode ?? 'gradient';

  // Create canvas
  canvas = document.createElement('canvas');
  canvas.id = 'ambient-canvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: ${ambientEnabled ? '1' : '0'};
    transition: opacity 0.6s ease;
  `;
  document.body.prepend(canvas);

  resize();
  window.addEventListener('resize', resize);

  if (ambientEnabled) startAnimation();

  // Wire toggle button
  const toggleBtn = document.getElementById('ambient-toggle-btn');
  if (toggleBtn) {
    toggleBtn.checked = ambientEnabled;
    toggleBtn.addEventListener('change', () => toggleAmbient(toggleBtn.checked));
  }

  // Wire mode radio buttons
  document.querySelectorAll('[name="ambient-mode"]').forEach(radio => {
    radio.checked = radio.value === ambientMode;
    radio.addEventListener('change', () => {
      if (radio.checked) setAmbientMode(radio.value);
    });
  });
}
