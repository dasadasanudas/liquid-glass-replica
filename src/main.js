import { BackgroundPass } from './gl/background-pass.js';
import { ForegroundPass } from './gl/foreground-pass.js';
import { createTexture, updateTexture } from './gl/webgl-utils.js';
import { computeGlassParameters } from './parameters.js';

const canvas = document.getElementById('gl-canvas');
const hitbox = document.getElementById('panel-hitbox');
const resizeHandle = hitbox.querySelector('.resize-handle');

const controls = {
  theme: document.getElementById('theme'),
  style: document.getElementById('style'),
  reduceTransparency: document.getElementById('reduceTransparency'),
  increaseContrast: document.getElementById('increaseContrast'),
  radius: document.getElementById('radius'),
  blurRadius: document.getElementById('blurRadius'),
  shadowAmount: document.getElementById('shadowAmount')
};

const state = {
  panel: { x: 140, y: 120, w: 300, h: 200 },
  theme: 'light',
  style: 'regular',
  reduceTransparency: false,
  increaseContrast: false,
  tuneRadius: null,
  tuneBlurRadius: null,
  tuneShadowAmount: null
};

const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true });
if (!gl) {
  throw new Error('WebGL2 is required for this demo.');
}

const backgroundPass = new BackgroundPass(gl);
const foregroundPass = new ForegroundPass(gl);

const backdropCanvas = document.createElement('canvas');
const backdropCtx = backdropCanvas.getContext('2d');
const foregroundCanvas = document.createElement('canvas');
const foregroundCtx = foregroundCanvas.getContext('2d');
let backdropTexture;
let foregroundTexture;

function makeWallpaper(width, height) {
  backdropCanvas.width = width;
  backdropCanvas.height = height;
  const grad = backdropCtx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#3566f2');
  grad.addColorStop(0.5, '#7f5be8');
  grad.addColorStop(1, '#f6638f');
  backdropCtx.fillStyle = grad;
  backdropCtx.fillRect(0, 0, width, height);

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 40 + Math.random() * 200;
    const alpha = 0.03 + Math.random() * 0.06;
    backdropCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    backdropCtx.beginPath();
    backdropCtx.arc(x, y, r, 0, Math.PI * 2);
    backdropCtx.fill();
  }
}

function makeForegroundTexture() {
  foregroundCanvas.width = Math.max(64, Math.floor(state.panel.w));
  foregroundCanvas.height = Math.max(64, Math.floor(state.panel.h));
  const w = foregroundCanvas.width;
  const h = foregroundCanvas.height;

  const grad = foregroundCtx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(120,190,255,0.1)');
  foregroundCtx.fillStyle = grad;
  foregroundCtx.fillRect(0, 0, w, h);

  foregroundCtx.strokeStyle = 'rgba(255,255,255,0.24)';
  foregroundCtx.lineWidth = 1;
  for (let y = 8; y < h; y += 16) {
    foregroundCtx.beginPath();
    foregroundCtx.moveTo(0, y);
    foregroundCtx.lineTo(w, y);
    foregroundCtx.stroke();
  }
}

function syncHitbox() {
  hitbox.style.left = `${state.panel.x}px`;
  hitbox.style.top = `${state.panel.y}px`;
  hitbox.style.width = `${state.panel.w}px`;
  hitbox.style.height = `${state.panel.h}px`;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  gl.viewport(0, 0, canvas.width, canvas.height);
  makeWallpaper(canvas.width, canvas.height);
  if (backdropTexture) {
    updateTexture(gl, backdropTexture, backdropCanvas);
  } else {
    backdropTexture = createTexture(gl, backdropCanvas);
  }
}

function readParams() {
  const params = computeGlassParameters({
    width: state.panel.w,
    height: state.panel.h,
    theme: state.theme,
    style: state.style,
    reduceTransparency: state.reduceTransparency,
    increaseContrast: state.increaseContrast
  });

  if (state.tuneRadius !== null) params.radius = state.tuneRadius;
  if (state.tuneBlurRadius !== null) params.blurRadius = state.tuneBlurRadius;
  if (state.tuneShadowAmount !== null) params.shadowAmount = state.tuneShadowAmount;

  controls.radius.value = params.radius;
  controls.blurRadius.value = params.blurRadius;
  controls.shadowAmount.value = params.shadowAmount;

  return params;
}

function render() {
  makeForegroundTexture();
  if (foregroundTexture) {
    updateTexture(gl, foregroundTexture, foregroundCanvas);
  } else {
    foregroundTexture = createTexture(gl, foregroundCanvas);
  }

  const params = readParams();
  const panelRect = {
    x: state.panel.x * (window.devicePixelRatio || 1),
    y: (window.innerHeight - state.panel.y - state.panel.h) * (window.devicePixelRatio || 1),
    w: state.panel.w * (window.devicePixelRatio || 1),
    h: state.panel.h * (window.devicePixelRatio || 1)
  };

  backgroundPass.render({
    resolution: [canvas.width, canvas.height],
    panelRect,
    backdropTexture,
    params
  });

  foregroundPass.render({
    resolution: [canvas.width, canvas.height],
    panelRect,
    foregroundTexture,
    params
  });

  requestAnimationFrame(render);
}

function setupControls() {
  controls.theme.addEventListener('change', () => {
    state.theme = controls.theme.value;
    document.body.style.background = state.theme === 'dark' ? '#0a0c16' : '#dce3ff';
  });

  controls.style.addEventListener('change', () => {
    state.style = controls.style.value;
  });

  controls.reduceTransparency.addEventListener('change', () => {
    state.reduceTransparency = controls.reduceTransparency.checked;
  });

  controls.increaseContrast.addEventListener('change', () => {
    state.increaseContrast = controls.increaseContrast.checked;
  });

  controls.radius.addEventListener('input', () => {
    state.tuneRadius = Number(controls.radius.value);
  });

  controls.blurRadius.addEventListener('input', () => {
    state.tuneBlurRadius = Number(controls.blurRadius.value);
  });

  controls.shadowAmount.addEventListener('input', () => {
    state.tuneShadowAmount = Number(controls.shadowAmount.value);
  });
}

function setupInteraction() {
  let drag = null;

  hitbox.addEventListener('pointerdown', (event) => {
    if (event.target === resizeHandle) return;
    drag = {
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      panelX: state.panel.x,
      panelY: state.panel.y
    };
    hitbox.setPointerCapture(event.pointerId);
  });

  resizeHandle.addEventListener('pointerdown', (event) => {
    drag = {
      mode: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      width: state.panel.w,
      height: state.panel.h
    };
    resizeHandle.setPointerCapture(event.pointerId);
    event.stopPropagation();
  });

  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.mode === 'move') {
      state.panel.x = Math.max(0, Math.min(window.innerWidth - state.panel.w, drag.panelX + dx));
      state.panel.y = Math.max(0, Math.min(window.innerHeight - state.panel.h, drag.panelY + dy));
    } else {
      state.panel.w = Math.max(160, Math.min(window.innerWidth - state.panel.x, drag.width + dx));
      state.panel.h = Math.max(120, Math.min(window.innerHeight - state.panel.y, drag.height + dy));
    }
    syncHitbox();
  });

  window.addEventListener('pointerup', () => {
    drag = null;
  });
}

setupControls();
setupInteraction();
syncHitbox();
resize();
window.addEventListener('resize', resize);
render();
