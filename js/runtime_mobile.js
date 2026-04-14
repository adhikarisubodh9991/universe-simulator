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

function isFileProtocol() {
  return window.location.protocol === 'file:';
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

async function goFullscreen() {
  if (isFileProtocol()) return;
  const elem = document.documentElement;
  try {
    if (elem.requestFullscreen) await elem.requestFullscreen({ navigationUI: 'hide' });
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
  } catch (_) {
    // Ignore unsupported fullscreen APIs.
  }
}

window.addEventListener('load', () => {
  if (!isMobileDevice()) return;
  lockLandscapeOrientation();
  updateRotateOverlayVisibility();
  if (!isFileProtocol()) {
    setTimeout(goFullscreen, 500);
  }
});

window.addEventListener('resize', updateRotateOverlayVisibility);
window.addEventListener('orientationchange', updateRotateOverlayVisibility);

document.addEventListener('touchstart', () => {
  if (isMobileDevice() && !isFileProtocol()) goFullscreen();
}, { once: true });

document.addEventListener('click', () => {
  if (isMobileDevice() && !isFileProtocol()) goFullscreen();
}, { once: true });
