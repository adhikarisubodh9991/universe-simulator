const canvas = document.getElementById('universe-canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081226);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 60, 220);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xbfd8ff, 1.1);
keyLight.position.set(160, 200, 120);
scene.add(keyLight);

const starsGeometry = new THREE.BufferGeometry();
const starCount = 2400;
const positions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i += 1) {
  const base = i * 3;
  positions[base] = (Math.random() - 0.5) * 2600;
  positions[base + 1] = (Math.random() - 0.5) * 1800;
  positions[base + 2] = (Math.random() - 0.5) * 2600;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const stars = new THREE.Points(
  starsGeometry,
  new THREE.PointsMaterial({ color: 0xd8e8ff, size: 2, sizeAttenuation: true })
);
scene.add(stars);

function animate() {
  requestAnimationFrame(animate);
  stars.rotation.y += 0.00015;
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
