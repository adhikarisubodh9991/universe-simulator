const canvas = document.getElementById('universe-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081226);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 180, 360);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.add(new THREE.AmbientLight(0xffffff, 0.42));
const sunLight = new THREE.PointLight(0xffd092, 1.8, 3200);
scene.add(sunLight);

const stars = new THREE.Points(
  (() => {
    const g = new THREE.BufferGeometry();
    const n = 2300;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const k = i * 3;
      arr[k] = (Math.random() - 0.5) * 2800;
      arr[k + 1] = (Math.random() - 0.5) * 1800;
      arr[k + 2] = (Math.random() - 0.5) * 2800;
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  })(),
  new THREE.PointsMaterial({ color: 0xdde9ff, size: 1.7 })
);
scene.add(stars);

const BASE_G = 42;
let gravityScale = 1;
let timeScale = 1;
let paused = false;
let stepOnce = false;
let mode = 'planet';
const center = { mass: 12000, pos: new THREE.Vector3(0, 0, 0) };

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(18, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xffb56a, emissive: 0xff8a3f, emissiveIntensity: 0.8 })
);
scene.add(sun);
sunLight.position.copy(center.pos);

const bodies = [];

function addBody(type = 'planet') {
  const isMoon = type === 'moon';
  const isStar = type === 'star';
  const isBlackHole = type === 'blackhole';
  const radius = isBlackHole ? 8 : isStar ? 10 : isMoon ? 3.2 : 5.6;
  const mass = isBlackHole ? 240 : isStar ? 90 : isMoon ? 5 : 12;
  const dist = isMoon ? 110 + Math.random() * 40 : 140 + Math.random() * 80;
  const angle = Math.random() * Math.PI * 2;

  const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  const speed = Math.sqrt((BASE_G * center.mass) / Math.max(dist, 1));
  const vel = new THREE.Vector3(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);

  const color = isBlackHole ? 0x221133 : isStar ? 0xffb46c : isMoon ? 0xb8c4d9 : 0x7fa8ff;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  if (isStar) {
    mat.emissive = new THREE.Color(0xff8a3f);
    mat.emissiveIntensity = 0.55;
  }
  if (isBlackHole) {
    mat.emissive = new THREE.Color(0x5a2a87);
    mat.emissiveIntensity = 0.5;
  }

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), mat);

  scene.add(mesh);
  bodies.push({ type, mass, pos, vel, mesh });
}

addBody('planet');

function step(dt) {
  const scaledDt = dt * timeScale;
  for (const body of bodies) {
    const toCenter = new THREE.Vector3().subVectors(center.pos, body.pos);
    const d2 = Math.max(toCenter.lengthSq(), 70);
    const accel = toCenter.normalize().multiplyScalar((BASE_G * gravityScale * center.mass) / d2);
    body.vel.addScaledVector(accel, scaledDt);
    body.pos.addScaledVector(body.vel, scaledDt);
    body.mesh.position.copy(body.pos);
  }
}

function clearDynamicBodies() {
  while (bodies.length > 0) {
    const body = bodies.pop();
    scene.remove(body.mesh);
  }
}

document.getElementById('spawn-moon').addEventListener('click', () => addBody('moon'));
document.getElementById('clear-all').addEventListener('click', () => {
  clearDynamicBodies();
  addBody('planet');
});

function setMode(next) {
  mode = next;
  document.getElementById('mode-text').textContent = `Mode: ${next.charAt(0).toUpperCase()}${next.slice(1)}`;
}

document.getElementById('mode-planet').addEventListener('click', () => setMode('planet'));
document.getElementById('mode-star').addEventListener('click', () => setMode('star'));
document.getElementById('mode-blackhole').addEventListener('click', () => setMode('blackhole'));
document.getElementById('mode-delete').addEventListener('click', () => setMode('delete'));

canvas.addEventListener('click', (event) => {
  if (mode === 'delete') {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bodies.map((b) => b.mesh));
    if (intersects.length > 0) {
      const target = intersects[0].object;
      const idx = bodies.findIndex((b) => b.mesh === target);
      if (idx >= 0) {
        scene.remove(bodies[idx].mesh);
        bodies.splice(idx, 1);
      }
    }
    return;
  }

  addBody(mode);
});

document.getElementById('spawn-planet').addEventListener('click', () => addBody(mode));

document.getElementById('gravity-slider').addEventListener('input', (e) => {
  gravityScale = parseFloat(e.target.value);
});

document.getElementById('time-slider').addEventListener('input', (e) => {
  timeScale = parseFloat(e.target.value);
});

document.getElementById('pause-btn').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('pause-btn').textContent = paused ? 'Resume' : 'Pause';
});

document.getElementById('step-btn').addEventListener('click', () => {
  stepOnce = true;
});

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.03);
  last = now;

  if (!paused || stepOnce) {
    step(dt);
    stepOnce = false;
  }
  stars.rotation.y += dt * 0.0025;
  sun.rotation.y += dt * 0.12;

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(last);
