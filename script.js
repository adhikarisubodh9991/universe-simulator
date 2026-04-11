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

const G = 42;
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
  const radius = isMoon ? 3.2 : 5.6;
  const mass = isMoon ? 5 : 12;
  const dist = isMoon ? 110 + Math.random() * 40 : 140 + Math.random() * 80;
  const angle = Math.random() * Math.PI * 2;

  const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  const speed = Math.sqrt((G * center.mass) / Math.max(dist, 1));
  const vel = new THREE.Vector3(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({ color: isMoon ? 0xb8c4d9 : 0x7fa8ff, roughness: 0.85 })
  );

  scene.add(mesh);
  bodies.push({ type, mass, pos, vel, mesh });
}

addBody('planet');

function step(dt) {
  for (const body of bodies) {
    const toCenter = new THREE.Vector3().subVectors(center.pos, body.pos);
    const d2 = Math.max(toCenter.lengthSq(), 70);
    const accel = toCenter.normalize().multiplyScalar((G * center.mass) / d2);
    body.vel.addScaledVector(accel, dt);
    body.pos.addScaledVector(body.vel, dt);
    body.mesh.position.copy(body.pos);
  }
}

function clearDynamicBodies() {
  while (bodies.length > 0) {
    const body = bodies.pop();
    scene.remove(body.mesh);
  }
}

document.getElementById('spawn-planet').addEventListener('click', () => addBody('planet'));
document.getElementById('spawn-moon').addEventListener('click', () => addBody('moon'));
document.getElementById('clear-all').addEventListener('click', () => {
  clearDynamicBodies();
  addBody('planet');
});

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.03);
  last = now;

  step(dt);
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
