const runtimeErrorEl = document.getElementById('runtime-error');

function showRuntimeError(message) {
  if (!runtimeErrorEl) return;
  runtimeErrorEl.textContent = `Runtime Error:\n${message}`;
  runtimeErrorEl.classList.remove('hidden');
}

window.addEventListener('error', (event) => {
  const msg = event?.error?.stack || event?.message || 'Unknown error';
  showRuntimeError(String(msg));
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = reason?.stack || reason?.message || String(reason || 'Unhandled promise rejection');
  showRuntimeError(String(msg));
});

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
}

const TOOL_LABELS = {
  select: 'Select',
  'spawn-planet': 'Spawn Planet',
  'spawn-star': 'Spawn Star',
  'spawn-blackhole': 'Spawn Black Hole',
  delete: 'Delete',
  grab: 'Grab and Throw',
  laser: 'Laser',
};

const mobileRoot = document.documentElement;
let mobileFullscreenPending = false;
let mobileFullscreenInFlight = false;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFileProtocol() {
  return window.location.protocol === 'file:';
}

function updateMobileLayoutScale() {
  if (!mobileRoot) return;

  if (!isMobileDevice()) {
    const props = [
      '--mobile-ui-scale',
      '--mobile-panel-width',
      '--mobile-panel-width-tight',
      '--mobile-selection-width',
      '--mobile-selection-width-tight',
      '--mobile-button-height',
      '--mobile-button-height-tight',
      '--mobile-button-font',
      '--mobile-button-font-tight',
      '--mobile-text-font',
      '--mobile-text-font-tight',
      '--mobile-handle-width',
      '--mobile-handle-height',
      '--mobile-handle-width-tight',
      '--mobile-handle-height-tight',
      '--mobile-panel-pad-y',
      '--mobile-panel-pad-x',
      '--mobile-panel-pad-y-tight',
      '--mobile-panel-pad-x-tight',
    ];
    for (const prop of props) {
      mobileRoot.style.removeProperty(prop);
    }
    return;
  }

  const vw = Math.max(window.innerWidth || 0, 1);
  const vh = Math.max(window.innerHeight || 0, 1);
  const shortSide = Math.min(vw, vh);
  const longSide = Math.max(vw, vh);

  const uiScale = clampNumber((shortSide / 430) * 0.75 + (longSide / 900) * 0.25, 0.72, 1);
  const panelWidth = Math.round(clampNumber(shortSide * 0.52, 166, 226));
  const panelWidthTight = Math.round(clampNumber(shortSide * 0.49, 156, 194));
  const selectionWidth = Math.round(clampNumber(shortSide * 0.58, 192, 252));
  const selectionWidthTight = Math.round(clampNumber(shortSide * 0.56, 176, 224));
  const buttonHeight = Math.round(clampNumber(23 * uiScale + 2, 20, 25));
  const buttonHeightTight = Math.round(clampNumber(buttonHeight - 2, 18, 23));
  const buttonFont = clampNumber(0.6 * uiScale + 0.06, 0.56, 0.66);
  const buttonFontTight = clampNumber(buttonFont - 0.04, 0.52, 0.62);
  const textFont = clampNumber(0.61 * uiScale + 0.05, 0.56, 0.68);
  const textFontTight = clampNumber(textFont - 0.04, 0.52, 0.64);
  const handleWidth = Math.round(clampNumber(20 * uiScale + 2, 18, 22));
  const handleHeight = Math.round(clampNumber(48 * uiScale + 2, 40, 50));
  const handleWidthTight = Math.max(16, handleWidth - 2);
  const handleHeightTight = Math.max(38, handleHeight - 4);
  const panelPadY = Math.round(clampNumber(8 * uiScale, 6, 9));
  const panelPadX = Math.round(clampNumber(7 * uiScale, 5, 8));
  const panelPadYTight = Math.max(5, panelPadY - 1);
  const panelPadXTight = Math.max(4, panelPadX - 1);

  mobileRoot.style.setProperty('--mobile-ui-scale', uiScale.toFixed(3));
  mobileRoot.style.setProperty('--mobile-panel-width', `${panelWidth}px`);
  mobileRoot.style.setProperty('--mobile-panel-width-tight', `${panelWidthTight}px`);
  mobileRoot.style.setProperty('--mobile-selection-width', `${selectionWidth}px`);
  mobileRoot.style.setProperty('--mobile-selection-width-tight', `${selectionWidthTight}px`);
  mobileRoot.style.setProperty('--mobile-button-height', `${buttonHeight}px`);
  mobileRoot.style.setProperty('--mobile-button-height-tight', `${buttonHeightTight}px`);
  mobileRoot.style.setProperty('--mobile-button-font', `${buttonFont.toFixed(3)}rem`);
  mobileRoot.style.setProperty('--mobile-button-font-tight', `${buttonFontTight.toFixed(3)}rem`);
  mobileRoot.style.setProperty('--mobile-text-font', `${textFont.toFixed(3)}rem`);
  mobileRoot.style.setProperty('--mobile-text-font-tight', `${textFontTight.toFixed(3)}rem`);
  mobileRoot.style.setProperty('--mobile-handle-width', `${handleWidth}px`);
  mobileRoot.style.setProperty('--mobile-handle-height', `${handleHeight}px`);
  mobileRoot.style.setProperty('--mobile-handle-width-tight', `${handleWidthTight}px`);
  mobileRoot.style.setProperty('--mobile-handle-height-tight', `${handleHeightTight}px`);
  mobileRoot.style.setProperty('--mobile-panel-pad-y', `${panelPadY}px`);
  mobileRoot.style.setProperty('--mobile-panel-pad-x', `${panelPadX}px`);
  mobileRoot.style.setProperty('--mobile-panel-pad-y-tight', `${panelPadYTight}px`);
  mobileRoot.style.setProperty('--mobile-panel-pad-x-tight', `${panelPadXTight}px`);
}

function updateRotateOverlayVisibility() {
  const overlay = document.getElementById('rotate-overlay');
  if (!overlay) return;
  const showRotateHint = isMobileDevice() && window.innerHeight > window.innerWidth;
  overlay.classList.toggle('hidden', !showRotateHint);
}

function lockLandscapeOrientation() {
  if (isFileProtocol()) return;
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape-primary').catch(() => {
      // Ignore unsupported orientation locks and permission failures.
    });
  }
}

function isLandscapeViewport() {
  return window.innerWidth >= window.innerHeight;
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

async function requestFullscreenForElement(element) {
  if (!element) return false;

  if (typeof element.requestFullscreen === 'function') {
    try {
      await element.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } catch (_) {
      try {
        await element.requestFullscreen();
        return true;
      } catch (_) {
        // Continue to prefixed fallbacks.
      }
    }
  }

  if (typeof element.webkitRequestFullscreen === 'function') {
    try {
      const result = element.webkitRequestFullscreen();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (_) {
      // Ignore and continue.
    }
  }

  if (typeof element.msRequestFullscreen === 'function') {
    try {
      const result = element.msRequestFullscreen();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (_) {
      // Ignore and continue.
    }
  }

  return false;
}

async function goFullscreen() {
  if (isFileProtocol()) return false;
  if (getFullscreenElement()) return true;
  if (mobileFullscreenInFlight) return false;

  mobileFullscreenInFlight = true;
  const candidates = [
    document.documentElement,
    document.body,
    document.getElementById('universe-canvas'),
  ];

  let entered = false;
  for (const element of candidates) {
    entered = await requestFullscreenForElement(element);
    if (entered || getFullscreenElement()) break;
  }

  mobileFullscreenInFlight = false;
  return entered || !!getFullscreenElement();
}

function requestMobileFullscreenIfReady(forceLandscape = false) {
  if (!isMobileDevice() || isFileProtocol()) return;
  if (!forceLandscape && !isLandscapeViewport()) return;
  if (getFullscreenElement()) {
    mobileFullscreenPending = false;
    return;
  }

  mobileFullscreenPending = true;
  void goFullscreen().then((entered) => {
    if (entered || getFullscreenElement()) {
      mobileFullscreenPending = false;
    }
  });
}

function handleMobileGestureFullscreen() {
  if (!isMobileDevice() || !isLandscapeViewport()) return;
  if (getFullscreenElement()) {
    mobileFullscreenPending = false;
    return;
  }
  if (!mobileFullscreenPending) {
    mobileFullscreenPending = true;
  }
  requestMobileFullscreenIfReady(true);
}

function handleMobileViewportChange() {
  updateMobileLayoutScale();
  updateRotateOverlayVisibility();

  if (!isMobileDevice()) return;
  if (isLandscapeViewport()) {
    mobileFullscreenPending = true;
    requestMobileFullscreenIfReady(true);
  }
}

window.addEventListener('load', () => {
  updateMobileLayoutScale();
  if (!isMobileDevice()) return;
  lockLandscapeOrientation();
  handleMobileViewportChange();
  if (!isLandscapeViewport()) {
    mobileFullscreenPending = true;
  }
});

window.addEventListener('resize', handleMobileViewportChange);
window.addEventListener('orientationchange', () => {
  handleMobileViewportChange();
  window.setTimeout(() => {
    handleMobileViewportChange();
    if (isLandscapeViewport()) {
      requestMobileFullscreenIfReady(true);
    }
  }, 180);
});
document.addEventListener('fullscreenchange', () => {
  if (getFullscreenElement()) mobileFullscreenPending = false;
});
document.addEventListener('webkitfullscreenchange', () => {
  if (getFullscreenElement()) mobileFullscreenPending = false;
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isMobileDevice() && isLandscapeViewport()) {
    mobileFullscreenPending = true;
  }
});
document.addEventListener('pointerdown', handleMobileGestureFullscreen, { passive: true, capture: true });
document.addEventListener('pointerup', handleMobileGestureFullscreen, { passive: true, capture: true });
document.addEventListener('touchstart', handleMobileGestureFullscreen, { passive: true, capture: true });
document.addEventListener('touchend', handleMobileGestureFullscreen, { passive: true, capture: true });
document.addEventListener('click', handleMobileGestureFullscreen, { passive: true, capture: true });
document.addEventListener('keydown', handleMobileGestureFullscreen, { capture: true });
