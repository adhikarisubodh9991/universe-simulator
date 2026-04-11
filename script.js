const canvas = document.getElementById('universe-canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081226);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 140, 320);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const keyLight = new THREE.PointLight(0xffcf86, 1.6, 2800);
scene.add(keyLight);

const starsGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i += 1) {
  const idx = i * 3;
  positions[idx] = (Math.random() - 0.5) * 2600;
  positions[idx + 1] = (Math.random() - 0.5) * 1800;
  positions[idx + 2] = (Math.random() - 0.5) * 2600;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xd9e9ff, size: 1.8 }));
scene.add(stars);

const sun = {
  mass: 12000,
  mesh: new THREE.Mesh(
    new THREE.SphereGeometry(18, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffb867, emissive: 0xff8e47, emissiveIntensity: 0.8 })
  ),
  pos: new THREE.Vector3(0, 0, 0),
};
scene.add(sun.mesh);
keyLight.position.copy(sun.pos);

const planet = {
  mass: 12,
  mesh: new THREE.Mesh(
    new THREE.SphereGeometry(6, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0x7fa8ff, roughness: 0.85 })
  ),
  pos: new THREE.Vector3(140, 0, 0),
  vel: new THREE.Vector3(0, 0, 56),
};
scene.add(planet.mesh);

const trailMax = 420;
const trailPoints = [];
const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0x95b8ff, transparent: true, opacity: 0.75 });
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trailLine);

const G = 42;
let last = performance.now();

function step(dt) {
  const toSun = new THREE.Vector3().subVectors(sun.pos, planet.pos);
  const distSq = Math.max(toSun.lengthSq(), 60);
  const accel = toSun.normalize().multiplyScalar((G * sun.mass) / distSq);

  planet.vel.addScaledVector(accel, dt);
  planet.pos.addScaledVector(planet.vel, dt);

  planet.mesh.position.copy(planet.pos);

  trailPoints.push(planet.pos.clone());
  if (trailPoints.length > trailMax) trailPoints.shift();

  trailGeometry.setFromPoints(trailPoints);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.03);
  last = now;

  step(dt);
  sun.mesh.rotation.y += dt * 0.12;
  stars.rotation.y += dt * 0.003;

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(last);
