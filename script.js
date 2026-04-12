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

function lockLandscapeOrientation() {
  if (isFileProtocol()) return;
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape-primary').catch(() => {});
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
  if (!isFileProtocol()) {
    setTimeout(goFullscreen, 500);
  }
});

document.addEventListener('touchstart', () => {
  if (isMobileDevice() && !isFileProtocol()) goFullscreen();
}, { once: true });

document.addEventListener('click', () => {
  if (isMobileDevice() && !isFileProtocol()) goFullscreen();
}, { once: true });

(() => {
  const BODY_TYPES = {
    STAR: 'star',
    PLANET: 'planet',
    MOON: 'moon',
    ASTEROID: 'asteroid',
    COMET: 'comet',
    BLACKHOLE: 'blackhole',
    FRAGMENT: 'fragment',
    SHIP: 'ship',
    PROJECTILE: 'projectile',
  };

  const STAR_TYPES = [
    { name: 'Red Dwarf', color: 0xff6f61, radius: [10, 16], massScale: 1200, glow: 1.5 },
    { name: 'Blue Giant', color: 0x86bcff, radius: [20, 34], massScale: 2300, glow: 2.3 },
    { name: 'Neutron Star', color: 0xd6deff, radius: [6, 10], massScale: 4200, glow: 2.8 },
  ];

  const PLANET_TYPES = [
    { kind: 'Rocky', color: 0xae8966, radius: [2.2, 5.8], massScale: 14, atmosphere: 'thin', temp: [180, 420] },
    { kind: 'Gas Giant', color: 0xd7b58f, radius: [8, 16], massScale: 5, atmosphere: 'thick', temp: [90, 240] },
    { kind: 'Ice', color: 0x9fd8ff, radius: [3.3, 8], massScale: 8, atmosphere: 'frozen haze', temp: [30, 130] },
    { kind: 'Lava', color: 0xff6f3b, radius: [3, 7], massScale: 16, atmosphere: 'toxic', temp: [700, 1600] },
  ];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  class CameraController {
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;
      this.target = new THREE.Vector3(0, 0, 0);
      this.up = new THREE.Vector3(0, 1, 0);
      this.forward = new THREE.Vector3();
      this.right = new THREE.Vector3();

      this.state = {
        distance: 520,
        minDistance: 20,
        maxDistance: 5200,
        azimuth: 0,
        polar: 1.12,
        dragLeft: false,
        dragRight: false,
        lastX: 0,
        lastY: 0,
      };

      this.bind();
      this.reset();
    }

    bind() {
      const el = this.domElement;
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('mousedown', (e) => {
        if (e.button === 0) this.state.dragLeft = true;
        if (e.button === 2) this.state.dragRight = true;
        this.state.lastX = e.clientX;
        this.state.lastY = e.clientY;
      });

      const stop = () => {
        this.state.dragLeft = false;
        this.state.dragRight = false;
      };
      window.addEventListener('mouseup', stop);
      el.addEventListener('mouseleave', stop);

      el.addEventListener('mousemove', (e) => {
        const dx = e.clientX - this.state.lastX;
        const dy = e.clientY - this.state.lastY;
        this.state.lastX = e.clientX;
        this.state.lastY = e.clientY;

        if (this.state.dragLeft) {
          this.state.azimuth -= dx * 0.005;
          this.state.polar -= dy * 0.004;
          this.state.polar = Math.max(0.08, Math.min(Math.PI - 0.08, this.state.polar));
          this.update();
        }

        if (this.state.dragRight) {
          this.camera.getWorldDirection(this.forward).normalize();
          this.right.crossVectors(this.forward, this.up).normalize();
          const pan = Math.max(0.08, this.state.distance * 0.0015);
          this.target.addScaledVector(this.right, -dx * pan);
          this.target.y += dy * pan;
          this.update();
        }
      });

      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.state.distance += e.deltaY * 0.35;
        this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, this.state.distance));
        this.update();
      }, { passive: false });

      el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.state.dragLeft = true;
          this.state.dragRight = false;
          this.state.lastX = e.touches[0].clientX;
          this.state.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          this.state.dragLeft = false;
          this.state.dragRight = true;
          this.state.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          this.state.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.state.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        }
      }, { passive: true });

      el.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && this.state.dragLeft) {
          const x = e.touches[0].clientX;
          const y = e.touches[0].clientY;
          const dx = x - this.state.lastX;
          const dy = y - this.state.lastY;
          this.state.lastX = x;
          this.state.lastY = y;
          this.state.azimuth -= dx * 0.005;
          this.state.polar -= dy * 0.004;
          this.state.polar = Math.max(0.08, Math.min(Math.PI - 0.08, this.state.polar));
          this.update();
        } else if (e.touches.length === 2) {
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const dx = cx - this.state.lastX;
          const dy = cy - this.state.lastY;
          this.state.lastX = cx;
          this.state.lastY = cy;

          this.camera.getWorldDirection(this.forward).normalize();
          this.right.crossVectors(this.forward, this.up).normalize();
          const pan = Math.max(0.08, this.state.distance * 0.0015);
          this.target.addScaledVector(this.right, -dx * pan);
          this.target.y += dy * pan;

          const pdx = e.touches[0].clientX - e.touches[1].clientX;
          const pdy = e.touches[0].clientY - e.touches[1].clientY;
          const pinchDist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (this.state.lastPinchDist) {
            this.state.distance -= (pinchDist - this.state.lastPinchDist) * 0.8;
            this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, this.state.distance));
          }
          this.state.lastPinchDist = pinchDist;
          this.update();
        }
      }, { passive: true });

      el.addEventListener('touchend', () => {
        this.state.dragLeft = false;
        this.state.dragRight = false;
        this.state.lastPinchDist = null;
      }, { passive: true });
    }

    update() {
      const s = this.state;
      const sinP = Math.sin(s.polar);
      const x = s.distance * sinP * Math.sin(s.azimuth);
      const y = s.distance * Math.cos(s.polar);
      const z = s.distance * sinP * Math.cos(s.azimuth);
      this.camera.position.set(this.target.x + x, this.target.y + y, this.target.z + z);
      this.camera.lookAt(this.target);
    }

    reset() {
      this.target.set(0, 0, 0);
      this.state.distance = 520;
      this.state.azimuth = 0;
      this.state.polar = 1.12;
      this.update();
    }
  }

  class UniverseEngine {
    constructor(scene) {
      this.scene = scene;
      this.bodies = [];
      this.idToBody = new Map();
      this.nextId = 1;

      this.G = 22;
      this.gravityScale = 1;
      this.timeScale = 1;
      this.sizeScale = 1;
      this.softening = 65;

      this.collisionEnabled = true;
      this.trailsEnabled = true;
      this.labelsEnabled = false;
      this.nebulaEnabled = true;

      this.paused = false;
      this.stepOnce = false;
      this.simYears = 0;

      this.selectedBody = null;
      this.ship = null;
      this.projectilesToRemove = [];

      this.starfield = null;
      this.nebula = null;

      this.snapshotBuffer = [];
      this.snapshotLimit = 180;
      this.snapshotAccumulator = 0;

      this.effectParticles = [];
      this.shockwaves = [];

      this.supernovaClock = 0;
      this.randomSupernovaEnabled = false;

      this.stats = {
        bodies: 0,
        planets: 0,
        moons: 0,
        stars: 0,
        asteroids: 0,
      };
    }

    createPlanetTexture(baseColor) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const ctx = c.getContext('2d');
      const rgb = new THREE.Color(baseColor);
      ctx.fillStyle = `rgb(${Math.floor(rgb.r * 255)},${Math.floor(rgb.g * 255)},${Math.floor(rgb.b * 255)})`;
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
        const y = Math.random() * c.height;
        const h = 2 + Math.random() * 9;
        ctx.fillRect(0, y, c.width, h);
      }
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        const x = Math.random() * c.width;
        const y = Math.random() * c.height;
        const r = 1 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(c);
    }

    createStarTexture(baseColor) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      const color = new THREE.Color(baseColor);
      grad.addColorStop(0, `rgba(${Math.floor(color.r * 255)},${Math.floor(color.g * 255)},${Math.floor(color.b * 255)},1)`);
      grad.addColorStop(0.5, 'rgba(255,220,160,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    createBody(config) {
      const body = {
        id: this.nextId++,
        type: config.type,
        subtype: config.subtype || null,
        name: config.name || `${config.type}-${this.nextId}`,
        mass: config.mass,
        radius: config.radius,
        color: config.color || 0xffffff,
        atmosphere: config.atmosphere || 'none',
        temperature: config.temperature || 0,
        x: config.x || 0,
        y: config.y || 0,
        z: config.z || 0,
        vx: config.vx || 0,
        vy: config.vy || 0,
        vz: config.vz || 0,
        unstable: !!config.unstable,
        moonCount: 0,
        alive: true,
        mesh: null,
        glow: null,
        ring: null,
        atmosphereMesh: null,
        trail: [],
        trailLine: null,
        label: null,
      };

      this.createVisual(body, config.glow || 0);
      this.bodies.push(body);
      this.idToBody.set(body.id, body);
      return body;
    }

    createVisual(body, glowIntensity) {
      const geo = new THREE.SphereGeometry(Math.max(0.6, body.radius), 28, 28);
      const mat = new THREE.MeshStandardMaterial({
        color: body.color,
        roughness: body.type === BODY_TYPES.STAR ? 0.5 : 0.8,
        metalness: body.type === BODY_TYPES.PLANET ? 0.12 : 0.03,
      });

      if (body.type === BODY_TYPES.STAR) {
        mat.map = this.createStarTexture(body.color);
        mat.emissive = new THREE.Color(body.color);
        mat.emissiveIntensity = Math.max(1.0, glowIntensity);
      }

      if (body.type === BODY_TYPES.PLANET || body.type === BODY_TYPES.MOON) {
        mat.map = this.createPlanetTexture(body.color);
      }

      if (body.type === BODY_TYPES.BLACKHOLE) {
        mat.color.setHex(0x090909);
        mat.emissive.setHex(0x2b0a58);
        mat.emissiveIntensity = 0.5;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(body.x, body.y, body.z);
      mesh.userData.bodyId = body.id;
      this.scene.add(mesh);
      body.mesh = mesh;

      if (body.type === BODY_TYPES.STAR) {
        const light = new THREE.PointLight(body.color, Math.max(1.2, glowIntensity), 3000, 2);
        light.position.copy(mesh.position);
        this.scene.add(light);
        body.glow = light;
      }

      if (body.type === BODY_TYPES.PLANET && body.subtype === 'Gas Giant' && Math.random() < 0.3) {
        this.enableRing(body, true);
      }

      if (body.type === BODY_TYPES.PLANET && body.atmosphere !== 'none') {
        this.enableAtmosphere(body, true);
      }

      if (body.type !== BODY_TYPES.ASTEROID && body.type !== BODY_TYPES.FRAGMENT && body.type !== BODY_TYPES.PROJECTILE) {
        const line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0x72a7ff, transparent: true, opacity: 0.45 })
        );
        line.visible = this.trailsEnabled;
        this.scene.add(line);
        body.trailLine = line;
      }
    }

    enableRing(body, enabled) {
      if (!body.mesh) return;
      if (!enabled) {
        if (body.ring) {
          this.scene.remove(body.ring);
          body.ring.geometry.dispose();
          body.ring.material.dispose();
          body.ring = null;
        }
        return;
      }

      if (body.ring) return;
      const rg = new THREE.RingGeometry(body.radius * 1.25, body.radius * 1.95, 72);
      const rm = new THREE.MeshBasicMaterial({
        color: 0xd5c0a1,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(rg, rm);
      ring.rotation.x = -Math.PI / 2.2;
      ring.position.copy(body.mesh.position);
      this.scene.add(ring);
      body.ring = ring;
    }

    enableAtmosphere(body, enabled) {
      if (!body.mesh) return;
      if (!enabled) {
        if (body.atmosphereMesh) {
          this.scene.remove(body.atmosphereMesh);
          body.atmosphereMesh.geometry.dispose();
          body.atmosphereMesh.material.dispose();
          body.atmosphereMesh = null;
        }
        return;
      }

      if (body.atmosphereMesh) return;
      const ag = new THREE.SphereGeometry(body.radius * 1.12, 24, 24);
      const am = new THREE.MeshBasicMaterial({
        color: body.subtype === 'Lava' ? 0xff7b5c : 0x7cc8ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const at = new THREE.Mesh(ag, am);
      at.position.copy(body.mesh.position);
      this.scene.add(at);
      body.atmosphereMesh = at;
    }

    removeBody(body) {
      body.alive = false;
      this.idToBody.delete(body.id);

      if (body.mesh) {
        this.scene.remove(body.mesh);
        body.mesh.geometry.dispose();
        body.mesh.material.dispose();
      }
      if (body.glow) this.scene.remove(body.glow);
      if (body.ring) {
        this.scene.remove(body.ring);
        body.ring.geometry.dispose();
        body.ring.material.dispose();
      }
      if (body.atmosphereMesh) {
        this.scene.remove(body.atmosphereMesh);
        body.atmosphereMesh.geometry.dispose();
        body.atmosphereMesh.material.dispose();
      }
      if (body.trailLine) {
        this.scene.remove(body.trailLine);
        body.trailLine.geometry.dispose();
        body.trailLine.material.dispose();
      }

      if (this.selectedBody === body) this.selectedBody = null;
      if (this.ship === body) this.ship = null;
    }

    clearAll() {
      for (const b of this.bodies) this.removeBody(b);
      this.bodies = [];
      this.idToBody.clear();
      this.selectedBody = null;
      this.ship = null;
      this.simYears = 0;
      this.snapshotBuffer = [];
      this.clearEffects();
    }

    clearEffects() {
      for (const p of this.effectParticles) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      this.effectParticles.length = 0;

      for (const s of this.shockwaves) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
      }
      this.shockwaves.length = 0;
    }

    buildBackground() {
      if (this.starfield) {
        this.scene.remove(this.starfield);
        this.starfield.geometry.dispose();
        this.starfield.material.dispose();
        this.starfield = null;
      }
      if (this.nebula) {
        this.scene.remove(this.nebula);
        this.nebula.geometry.dispose();
        this.nebula.material.dispose();
        this.nebula = null;
      }

      const count = 3400;
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const r = rand(1200, 5200);
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        pos[i3] = r * Math.sin(p) * Math.cos(t);
        pos[i3 + 1] = r * Math.cos(p);
        pos[i3 + 2] = r * Math.sin(p) * Math.sin(t);
        const c = rand(0.72, 1);
        col[i3] = c;
        col[i3 + 1] = c;
        col[i3 + 2] = c;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.starfield = new THREE.Points(g, new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      this.scene.add(this.starfield);

      const nCount = 1000;
      const np = new Float32Array(nCount * 3);
      const nc = new Float32Array(nCount * 3);
      for (let i = 0; i < nCount; i++) {
        const i3 = i * 3;
        const r = rand(300, 1650);
        const t = Math.random() * Math.PI * 2;
        np[i3] = Math.cos(t) * r;
        np[i3 + 1] = rand(-260, 260);
        np[i3 + 2] = Math.sin(t) * r;
        const cc = new THREE.Color().setHSL(rand(0.52, 0.82), rand(0.35, 0.78), rand(0.34, 0.62));
        nc[i3] = cc.r;
        nc[i3 + 1] = cc.g;
        nc[i3 + 2] = cc.b;
      }
      const ng = new THREE.BufferGeometry();
      ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
      ng.setAttribute('color', new THREE.BufferAttribute(nc, 3));
      this.nebula = new THREE.Points(ng, new THREE.PointsMaterial({
        size: 18,
        vertexColors: true,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      this.nebula.visible = this.nebulaEnabled;
      this.scene.add(this.nebula);
    }

    createStar(x, z, variant = null) {
      const s = variant || STAR_TYPES[randInt(0, STAR_TYPES.length - 1)];
      const radius = rand(s.radius[0], s.radius[1]);
      const mass = radius * radius * s.massScale;
      return this.createBody({
        type: BODY_TYPES.STAR,
        subtype: s.name,
        name: s.name,
        mass,
        radius,
        color: s.color,
        glow: s.glow,
        x,
        y: 0,
        z,
      });
    }

    createPlanet(star, orbitRadius, tilt = 0) {
      const pType = PLANET_TYPES[randInt(0, PLANET_TYPES.length - 1)];
      const radius = Math.max(1.1, rand(pType.radius[0], pType.radius[1]) * this.sizeScale);
      const mass = radius * radius * radius * pType.massScale;
      const theta = rand(0, Math.PI * 2);

      const x = star.x + Math.cos(theta) * orbitRadius;
      const z = star.z + Math.sin(theta) * orbitRadius;
      const y = Math.sin(tilt) * orbitRadius * 0.03;

      const vc = Math.sqrt((this.G * this.gravityScale * star.mass) / Math.max(orbitRadius, 40));
      const body = this.createBody({
        type: BODY_TYPES.PLANET,
        subtype: pType.kind,
        name: `${pType.kind} ${this.nextId}`,
        mass,
        radius,
        color: pType.color,
        atmosphere: pType.atmosphere,
        temperature: rand(pType.temp[0], pType.temp[1]),
        x,
        y,
        z,
        vx: -Math.sin(theta) * vc,
        vy: rand(-0.03, 0.03),
        vz: Math.cos(theta) * vc,
        unstable: Math.random() < 0.08,
      });
      return body;
    }

    createMoon(planet) {
      const r = rand(0, Math.PI * 2);
      const dist = planet.radius * rand(3.2, 6.4);
      const radius = Math.max(0.8, planet.radius * rand(0.2, 0.35));
      const mass = radius * radius * radius * 2.8;
      const v = Math.sqrt((this.G * this.gravityScale * planet.mass) / Math.max(dist, 8));

      const moon = this.createBody({
        type: BODY_TYPES.MOON,
        subtype: 'Moon',
        name: `Moon ${this.nextId}`,
        mass,
        radius,
        color: 0xd0d5df,
        atmosphere: 'none',
        temperature: rand(40, 230),
        x: planet.x + Math.cos(r) * dist,
        y: planet.y + rand(-2, 2),
        z: planet.z + Math.sin(r) * dist,
        vx: planet.vx - Math.sin(r) * v,
        vy: planet.vy + rand(-0.04, 0.04),
        vz: planet.vz + Math.cos(r) * v,
      });

      planet.moonCount += 1;
      return moon;
    }

    createAsteroidBelt(star, innerR, outerR, count = 65) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const r = rand(innerR, outerR);
        const radius = rand(0.35, 1.15) * this.sizeScale;
        const mass = radius * radius * radius * rand(0.7, 2.4);
        const v = Math.sqrt((this.G * this.gravityScale * star.mass) / Math.max(r, 40));
        this.createBody({
          type: BODY_TYPES.ASTEROID,
          subtype: 'Belt Rock',
          name: `Asteroid ${this.nextId}`,
          mass,
          radius,
          color: 0x8b909d,
          x: star.x + Math.cos(a) * r,
          y: rand(-8, 8),
          z: star.z + Math.sin(a) * r,
          vx: -Math.sin(a) * v + rand(-0.18, 0.18),
          vy: rand(-0.03, 0.03),
          vz: Math.cos(a) * v + rand(-0.18, 0.18),
        });
      }
    }

    createComet(star) {
      const dist = rand(560, 920);
      const a = rand(0, Math.PI * 2);
      const x = star.x + Math.cos(a) * dist;
      const z = star.z + Math.sin(a) * dist;
      const y = rand(-130, 130);
      const dir = new THREE.Vector3(star.x - x, star.y - y, star.z - z).normalize();
      const speed = rand(38, 62);
      this.createBody({
        type: BODY_TYPES.COMET,
        subtype: 'Comet',
        name: `Comet ${this.nextId}`,
        mass: rand(4, 12),
        radius: rand(1.2, 2.4),
        color: 0xbfe6ff,
        atmosphere: 'ion tail',
        temperature: rand(20, 140),
        x,
        y,
        z,
        vx: dir.x * speed,
        vy: dir.y * speed,
        vz: dir.z * speed,
        unstable: true,
      });
    }

    spawnBlackHole(x, y, z) {
      this.createBody({
        type: BODY_TYPES.BLACKHOLE,
        subtype: 'Singularity',
        name: `Black Hole ${this.nextId}`,
        mass: rand(300000, 700000),
        radius: rand(4, 8),
        color: 0x070707,
        atmosphere: 'accretion disk',
        temperature: rand(1000000, 5000000),
        x,
        y,
        z,
      });
    }

    spawnShip(x = 0, y = 20, z = 0) {
      if (this.ship && this.ship.alive) return this.ship;
      const ship = this.createBody({
        type: BODY_TYPES.SHIP,
        subtype: 'Player Ship',
        name: 'Ship',
        mass: 120,
        radius: 1.8,
        color: 0x9ff2ff,
        atmosphere: 'none',
        temperature: 300,
        x,
        y,
        z,
      });
      this.ship = ship;
      return ship;
    }

    fireProjectile() {
      if (!this.ship || !this.ship.alive) return;
      const dir = new THREE.Vector3(0, 0, -1);
      dir.applyQuaternion(this.ship.mesh.quaternion);
      const speed = 120;
      const proj = this.createBody({
        type: BODY_TYPES.PROJECTILE,
        subtype: 'Projectile',
        name: `Projectile ${this.nextId}`,
        mass: 1,
        radius: 0.55,
        color: 0xffd27f,
        x: this.ship.x + dir.x * (this.ship.radius + 1.5),
        y: this.ship.y + dir.y * (this.ship.radius + 1.5),
        z: this.ship.z + dir.z * (this.ship.radius + 1.5),
        vx: this.ship.vx + dir.x * speed,
        vy: this.ship.vy + dir.y * speed,
        vz: this.ship.vz + dir.z * speed,
      });
      proj.life = 6;
    }

    generateSystem() {
      this.clearAll();
      this.buildBackground();
      this.randomSupernovaEnabled = false;

      const binary = Math.random() < 0.25;
      const s1 = this.createStar(0, 0, null);

      if (binary) {
        const s2 = this.createStar(rand(80, 130), rand(-45, 45), STAR_TYPES[randInt(0, 1)]);
        const sep = Math.hypot(s2.x - s1.x, s2.z - s1.z);
        const total = s1.mass + s2.mass;
        const v = Math.sqrt((this.G * this.gravityScale * total) / Math.max(sep, 30));
        s1.vz = v * (s2.mass / total);
        s2.vz = -v * (s1.mass / total);
      }

      let orbit = rand(70, 120);
      const pCount = randInt(5, 10);
      for (let i = 0; i < pCount; i++) {
        const p = this.createPlanet(s1, orbit, rand(-0.3, 0.3));
        const moons = Math.random() < 0.72 ? randInt(0, 3) : 0;
        for (let m = 0; m < moons; m++) this.createMoon(p);
        orbit += rand(55, 105);
      }

      this.createAsteroidBelt(s1, orbit * 0.7, orbit * 0.92, 44);
      const comets = randInt(0, 1);
      for (let i = 0; i < comets; i++) this.createComet(s1);

      this.updateStats();
      this.saveSnapshot();
    }

    scenarioChaosCluster() {
      this.clearAll();
      this.buildBackground();
      this.randomSupernovaEnabled = true;
      for (let i = 0; i < 3; i++) this.createStar(rand(-120, 120), rand(-120, 120));
      for (let i = 0; i < 36; i++) {
        this.createBody({
          type: BODY_TYPES.PLANET,
          subtype: PLANET_TYPES[randInt(0, PLANET_TYPES.length - 1)].kind,
          name: `Chaos ${this.nextId}`,
          mass: rand(50, 600),
          radius: rand(1.2, 6),
          color: randInt(0x4477aa, 0xff8855),
          x: rand(-260, 260),
          y: rand(-120, 120),
          z: rand(-260, 260),
          vx: rand(-55, 55),
          vy: rand(-35, 35),
          vz: rand(-55, 55),
          unstable: true,
          temperature: rand(150, 2000),
        });
      }
      this.updateStats();
      this.saveSnapshot();
    }

    scenarioBinaryDance() {
      this.clearAll();
      this.buildBackground();
      this.randomSupernovaEnabled = false;
      const a = this.createStar(-70, 0, STAR_TYPES[1]);
      const b = this.createStar(70, 0, STAR_TYPES[0]);
      const sep = 140;
      const total = a.mass + b.mass;
      const v = Math.sqrt((this.G * this.gravityScale * total) / sep);
      a.vz = v * (b.mass / total);
      b.vz = -v * (a.mass / total);
      for (let i = 0; i < 8; i++) {
        const host = i % 2 === 0 ? a : b;
        const p = this.createPlanet(host, rand(85, 180), rand(-0.2, 0.2));
        if (Math.random() < 0.6) this.createMoon(p);
      }
      this.updateStats();
      this.saveSnapshot();
    }

    scenarioImpactTest() {
      this.clearAll();
      this.buildBackground();
      this.randomSupernovaEnabled = false;
      const star = this.createStar(0, 0, STAR_TYPES[0]);
      const p1 = this.createPlanet(star, 140, 0);
      const p2 = this.createPlanet(star, 140, 0);
      p2.x = p1.x + 70;
      p2.z = p1.z;
      p2.vx = p1.vx - 45;
      p2.vz = p1.vz;
      this.updateStats();
      this.saveSnapshot();
    }

    scenarioRingWorld() {
      this.clearAll();
      this.buildBackground();
      this.randomSupernovaEnabled = false;
      const star = this.createStar(0, 0, STAR_TYPES[2]);
      const giant = this.createBody({
        type: BODY_TYPES.PLANET,
        subtype: 'Gas Giant',
        name: 'Ring King',
        mass: 9000,
        radius: 18,
        color: 0xcdb089,
        atmosphere: 'thick',
        temperature: 140,
        x: 180,
        y: 0,
        z: 0,
        vx: 0,
        vz: Math.sqrt((this.G * this.gravityScale * star.mass) / 180),
      });
      this.enableRing(giant, true);
      for (let i = 0; i < 24; i++) {
        const a = rand(0, Math.PI * 2);
        const r = rand(26, 42);
        this.createBody({
          type: BODY_TYPES.ASTEROID,
          subtype: 'Ring Debris',
          name: `RingDebris ${this.nextId}`,
          mass: rand(2, 8),
          radius: rand(0.4, 1.1),
          color: 0xbcb8aa,
          x: giant.x + Math.cos(a) * r,
          y: rand(-1.5, 1.5),
          z: giant.z + Math.sin(a) * r,
          vx: giant.vx - Math.sin(a) * rand(22, 30),
          vz: giant.vz + Math.cos(a) * rand(22, 30),
        });
      }
      this.updateStats();
      this.saveSnapshot();
    }

    updateStats() {
      const stats = { bodies: 0, planets: 0, moons: 0, stars: 0, asteroids: 0 };
      for (const b of this.bodies) {
        if (!b.alive) continue;
        stats.bodies += 1;
        if (b.type === BODY_TYPES.PLANET) stats.planets += 1;
        if (b.type === BODY_TYPES.MOON) stats.moons += 1;
        if (b.type === BODY_TYPES.STAR) stats.stars += 1;
        if (b.type === BODY_TYPES.ASTEROID || b.type === BODY_TYPES.FRAGMENT) stats.asteroids += 1;
      }
      this.stats = stats;
    }

    getGravityScaleFor(body) {
      if (body.type === BODY_TYPES.BLACKHOLE) return this.gravityScale * 4.3;
      if (body.type === BODY_TYPES.STAR) return this.gravityScale * 1.15;
      return this.gravityScale;
    }

    applyNBody(dt) {
      const arr = this.bodies;
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (!a.alive) continue;

        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          if (!b.alive) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dz = b.z - a.z;
          const distSq = dx * dx + dy * dy + dz * dz + this.softening;
          const dist = Math.sqrt(distSq);
          if (dist < 0.00001) continue;

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const g = Math.max(this.getGravityScaleFor(a), this.getGravityScaleFor(b));
          const force = (this.G * g * a.mass * b.mass) / distSq;

          const ax = (force / a.mass) * nx;
          const ay = (force / a.mass) * ny;
          const az = (force / a.mass) * nz;

          const bx = (force / b.mass) * nx;
          const by = (force / b.mass) * ny;
          const bz = (force / b.mass) * nz;

          a.vx += ax * dt;
          a.vy += ay * dt;
          a.vz += az * dt;

          b.vx -= bx * dt;
          b.vy -= by * dt;
          b.vz -= bz * dt;
        }
      }
    }

    applyDecayAndInstability(dt) {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        b.age = (b.age || 0) + dt;

        const decay = b.type === BODY_TYPES.COMET ? 0.00024 : 0.00006;
        b.vx *= 1 - decay;
        b.vy *= 1 - decay;
        b.vz *= 1 - decay;

        if (b.unstable) {
          const n = 0.0015;
          b.vx += rand(-n, n);
          b.vy += rand(-n, n);
          b.vz += rand(-n, n);
        }

        if (b.type === BODY_TYPES.PROJECTILE) {
          b.life = (b.life || 5) - dt;
          if (b.life <= 0) this.projectilesToRemove.push(b);
        }
      }
    }

    integrate(dt) {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
      }
    }

    createExplosionFX(x, y, z, color = 0xffa96b, energy = 1) {
      const count = Math.floor(28 * energy);
      for (let i = 0; i < count; i++) {
        const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
        const speed = rand(8, 42) * energy;
        const g = new THREE.SphereGeometry(rand(0.15, 0.42), 8, 8);
        const m = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.effectParticles.push({ mesh, vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed, life: rand(0.4, 1.2) });
      }

      const ringGeo = new THREE.RingGeometry(0.5, 1.2, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffc082,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(x, y, z);
      ring.lookAt(this.scene.position);
      this.scene.add(ring);
      this.shockwaves.push({ mesh: ring, radius: 1, speed: 38 * energy, life: 0.8 });
    }

    updateEffects(dt) {
      for (let i = this.effectParticles.length - 1; i >= 0; i--) {
        const p = this.effectParticles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 4 * dt;
        p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.effectParticles.splice(i, 1);
        }
      }

      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const s = this.shockwaves[i];
        s.life -= dt;
        s.radius += s.speed * dt;
        s.mesh.scale.setScalar(s.radius);
        s.mesh.material.opacity = Math.max(0, s.life * 0.8);
        if (s.life <= 0) {
          this.scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          s.mesh.material.dispose();
          this.shockwaves.splice(i, 1);
        }
      }
    }

    merge(a, b) {
      const total = a.mass + b.mass;
      const nx = (a.x * a.mass + b.x * b.mass) / total;
      const ny = (a.y * a.mass + b.y * b.mass) / total;
      const nz = (a.z * a.mass + b.z * b.mass) / total;

      const nvx = (a.vx * a.mass + b.vx * b.mass) / total;
      const nvy = (a.vy * a.mass + b.vy * b.mass) / total;
      const nvz = (a.vz * a.mass + b.vz * b.mass) / total;

      const survivor = a.mass >= b.mass ? a : b;
      const removed = survivor === a ? b : a;

      survivor.mass = total;
      survivor.radius = Math.cbrt(Math.max(1, total / 8));
      survivor.x = nx;
      survivor.y = ny;
      survivor.z = nz;
      survivor.vx = nvx;
      survivor.vy = nvy;
      survivor.vz = nvz;
      survivor.mesh.scale.setScalar(Math.max(0.5, survivor.radius / survivor.mesh.geometry.parameters.radius));

      this.removeBody(removed);
      this.createExplosionFX(nx, ny, nz, 0xffd17a, 0.65);
    }

    explode(a, b) {
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;
      const cz = (a.z + b.z) * 0.5;
      const total = a.mass + b.mass;
      const fragCount = randInt(4, 10);

      for (let i = 0; i < fragCount; i++) {
        const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
        const speed = rand(10, 36);
        const radius = rand(0.45, 1.4) * this.sizeScale;
        const mass = radius * radius * radius * rand(1.3, 3.2);
        this.createBody({
          type: BODY_TYPES.FRAGMENT,
          subtype: 'Fragment',
          name: `Frag ${this.nextId}`,
          mass,
          radius,
          color: 0xffa66f,
          x: cx + dir.x * rand(0.2, 1.3),
          y: cy + dir.y * rand(0.2, 1.3),
          z: cz + dir.z * rand(0.2, 1.3),
          vx: ((a.vx + b.vx) * 0.5) + dir.x * speed,
          vy: ((a.vy + b.vy) * 0.5) + dir.y * speed,
          vz: ((a.vz + b.vz) * 0.5) + dir.z * speed,
          unstable: true,
          temperature: rand(300, 1300),
        });
      }

      this.removeBody(a);
      this.removeBody(b);
      this.createExplosionFX(cx, cy, cz, 0xff8f62, 1.3);

      if (total > 360000 && Math.random() < 0.2) {
        this.spawnBlackHole(cx, cy, cz);
      }
    }

    handleCollisions() {
      if (!this.collisionEnabled) return;

      const arr = this.bodies;
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (!a.alive) continue;

        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          if (!b.alive) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dz = b.z - a.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const r = a.radius + b.radius;
          if (distSq > r * r) continue;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const rvz = b.vz - a.vz;
          const rel = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);

          const involvesSmallBody =
            a.type === BODY_TYPES.ASTEROID ||
            b.type === BODY_TYPES.ASTEROID ||
            a.type === BODY_TYPES.FRAGMENT ||
            b.type === BODY_TYPES.FRAGMENT ||
            a.type === BODY_TYPES.COMET ||
            b.type === BODY_TYPES.COMET;
          const highImpact =
            a.type === BODY_TYPES.BLACKHOLE ||
            b.type === BODY_TYPES.BLACKHOLE ||
            a.type === BODY_TYPES.PROJECTILE ||
            b.type === BODY_TYPES.PROJECTILE ||
            (involvesSmallBody && rel > 72);
          if (highImpact) this.explode(a, b); else this.merge(a, b);

          break;
        }
      }

      this.bodies = this.bodies.filter((b) => b.alive);
      if (this.projectilesToRemove.length > 0) {
        for (const p of this.projectilesToRemove) {
          if (p.alive) this.removeBody(p);
        }
        this.projectilesToRemove.length = 0;
      }
    }

    triggerSupernovaOn(body) {
      if (!body || !body.alive || body.type !== BODY_TYPES.STAR) return;
      const cx = body.x, cy = body.y, cz = body.z;
      this.removeBody(body);

      for (let i = 0; i < 22; i++) {
        const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
        const radius = rand(0.9, 2.2) * this.sizeScale;
        const mass = radius * radius * radius * 4;
        this.createBody({
          type: BODY_TYPES.FRAGMENT,
          subtype: 'Supernova Fragment',
          name: `NovaFrag ${this.nextId}`,
          mass,
          radius,
          color: 0xffbf87,
          x: cx + dir.x * 2,
          y: cy + dir.y * 2,
          z: cz + dir.z * 2,
          vx: dir.x * rand(30, 85),
          vy: dir.y * rand(30, 85),
          vz: dir.z * rand(30, 85),
          unstable: true,
          temperature: rand(6000, 26000),
        });
      }

      this.createBody({
        type: BODY_TYPES.STAR,
        subtype: 'Neutron Star',
        name: 'Neutron Remnant',
        mass: 165000,
        radius: 5.4,
        color: 0xc5d6ff,
        glow: 2.7,
        x: cx,
        y: cy,
        z: cz,
      });

      this.createExplosionFX(cx, cy, cz, 0xffc07d, 2.1);
    }

    maybeRandomSupernova(dt) {
      if (!this.randomSupernovaEnabled) return;
      this.supernovaClock += dt;
      if (this.supernovaClock < 1.4) return;
      this.supernovaClock = 0;
      const star = this.bodies.find((b) => b.alive && b.type === BODY_TYPES.STAR && b.subtype === 'Blue Giant' && b.mass > 220000);
      if (!star) return;
      if (Math.random() > 0.004) return;
      this.triggerSupernovaOn(star);
    }

    updateVisuals() {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        if (b.mesh) {
          b.mesh.position.set(b.x, b.y, b.z);
          b.mesh.rotation.y += 0.0025;
        }
        if (b.glow) b.glow.position.set(b.x, b.y, b.z);
        if (b.ring) b.ring.position.set(b.x, b.y, b.z);
        if (b.atmosphereMesh) b.atmosphereMesh.position.set(b.x, b.y, b.z);

        if (b.trailLine) {
          b.trailLine.visible = this.trailsEnabled;
          if (this.trailsEnabled) {
            b.trail.push(new THREE.Vector3(b.x, b.y, b.z));
            if (b.trail.length > 90) b.trail.shift();
            b.trailLine.geometry.setFromPoints(b.trail);
          }
        }
      }

      if (this.nebula) this.nebula.visible = this.nebulaEnabled;
    }

    saveSnapshot() {
      const snap = {
        simYears: this.simYears,
        bodies: this.bodies.filter((b) => b.alive).map((b) => ({
          id: b.id,
          type: b.type,
          subtype: b.subtype,
          name: b.name,
          mass: b.mass,
          radius: b.radius,
          color: b.color,
          atmosphere: b.atmosphere,
          temperature: b.temperature,
          x: b.x,
          y: b.y,
          z: b.z,
          vx: b.vx,
          vy: b.vy,
          vz: b.vz,
          unstable: b.unstable,
          moonCount: b.moonCount,
          hasRing: !!b.ring,
          hasAtmo: !!b.atmosphereMesh,
        })),
      };

      this.snapshotBuffer.push(snap);
      if (this.snapshotBuffer.length > this.snapshotLimit) this.snapshotBuffer.shift();
    }

    rewindStep() {
      if (this.snapshotBuffer.length < 2) return;
      this.snapshotBuffer.pop();
      const snap = this.snapshotBuffer[this.snapshotBuffer.length - 1];
      if (!snap) return;

      this.clearAll();
      this.buildBackground();
      this.simYears = snap.simYears;

      for (const s of snap.bodies) {
        const b = this.createBody(s);
        b.id = s.id;
        b.moonCount = s.moonCount || 0;
        if (s.hasRing) this.enableRing(b, true);
        if (s.hasAtmo) this.enableAtmosphere(b, true);
      }

      this.nextId = Math.max(1, ...this.bodies.map((b) => b.id + 1));
      this.updateStats();
    }

    tick(dt, shipControl) {
      if (this.paused && !this.stepOnce) return;

      const step = Math.min(dt * this.timeScale, 0.05);
      this.simYears += (step * 40) / 365;

      this.applyNBody(step);
      this.applyDecayAndInstability(step);

      if (this.ship && this.ship.alive && shipControl) {
        shipControl(this.ship, step);
      }

      this.integrate(step);
      this.handleCollisions();
      this.maybeRandomSupernova(step);
      this.updateVisuals();
      this.updateEffects(step);
      this.updateStats();

      this.snapshotAccumulator += step;
      if (this.snapshotAccumulator >= 0.2) {
        this.saveSnapshot();
        this.snapshotAccumulator = 0;
      }

      this.stepOnce = false;
    }

    pickBody(raycaster) {
      const meshes = [];
      for (const b of this.bodies) if (b.alive && b.mesh) meshes.push(b.mesh);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit) return null;
      return this.idToBody.get(hit.object.userData.bodyId) || null;
    }
  }

  class UniverseApp {
    constructor() {
      this.canvas = document.getElementById('universe-canvas');
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.scene.add(new THREE.AmbientLight(0x3e4e67, 0.42));
      const fill = new THREE.DirectionalLight(0x6b90cc, 0.28);
      fill.position.set(320, 410, 240);
      this.scene.add(fill);

      this.cam = new CameraController(this.camera, this.canvas);
      this.engine = new UniverseEngine(this.scene);

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.pointerDown = { x: 0, y: 0 };

      this.toolMode = 'select';
      this.dragSpawn = null;
      this.grabbedBody = null;
      this.grabPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.lastGrabPoint = null;
      this.lastGrabVelocity = new THREE.Vector3();

      this.shipKeys = {
        KeyW: false, KeyS: false, KeyA: false, KeyD: false,
        KeyQ: false, KeyE: false, KeyR: false, KeyF: false,
      };

      this.els = this.collectEls();
      this.bindUI();
      this.bindInput();
      this.bindResize();

      this.engine.generateSystem();
      this.prev = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    collectEls() {
      const q = (id) => document.getElementById(id);
      return {
        toolMode: q('tool-mode'),
        toolSelect: q('tool-select'),
        toolSpawnPlanet: q('tool-spawn-planet'),
        toolSpawnStar: q('tool-spawn-star'),
        toolSpawnBlackHole: q('tool-spawn-blackhole'),
        toolDelete: q('tool-delete'),
        toolGrab: q('tool-grab'),
        toolLaser: q('tool-laser'),

        pause: q('btn-pause'),
        step: q('btn-step'),
        rewind: q('btn-rewind'),
        reset: q('btn-reset'),
        random: q('btn-random'),
        supernova: q('btn-supernova'),

        gravity: q('gravity-slider'),
        gravityVal: q('gravity-value'),
        time: q('time-slider'),
        timeVal: q('time-value'),
        size: q('size-slider'),
        sizeVal: q('size-value'),

        collisions: q('toggle-collisions'),
        trails: q('toggle-trails'),
        labels: q('toggle-labels'),
        nebula: q('toggle-nebula'),

        scenarioChaos: q('scenario-chaos'),
        scenarioBinary: q('scenario-binary'),
        scenarioImpact: q('scenario-impact'),
        scenarioRings: q('scenario-rings'),

        spawnShip: q('spawn-ship'),
        fireProjectile: q('fire-projectile'),

        statBodies: q('stat-bodies'),
        statPlanets: q('stat-planets'),
        statMoons: q('stat-moons'),
        statStars: q('stat-stars'),
        statAsteroids: q('stat-asteroids'),
        statTime: q('stat-time'),

        selectionPanel: q('selection-panel'),
        infoName: q('info-name'),
        infoType: q('info-type'),
        infoMass: q('info-mass'),
        infoRadius: q('info-radius'),
        infoVelocity: q('info-velocity'),
        infoDistance: q('info-distance'),
        infoMoons: q('info-moons'),
        infoTemp: q('info-temp'),

        editMass: q('edit-mass'),
        editRadius: q('edit-radius'),
        editVx: q('edit-vx'),
        editVy: q('edit-vy'),
        editVz: q('edit-vz'),
        editRing: q('edit-ring'),
        editAtmo: q('edit-atmo'),
        applyEdit: q('apply-edit'),

        leftHud: document.querySelector('.hud-left'),
        rightHud: document.querySelector('.hud-right'),
        toggleLeftHud: q('toggle-hud-left'),
        toggleRightHud: q('toggle-hud-right'),
        closeSelection: q('close-selection'),
      };
    }

    clearSelectionPanel() {
      this.engine.selectedBody = null;
      this.els.selectionPanel.classList.add('hidden');
    }

    setToolMode(mode) {
      this.toolMode = mode;
      this.els.toolMode.textContent = `Mode: ${mode}`;

      const toolButtons = [
        [this.els.toolSelect, 'select'],
        [this.els.toolSpawnPlanet, 'spawn-planet'],
        [this.els.toolSpawnStar, 'spawn-star'],
        [this.els.toolSpawnBlackHole, 'spawn-blackhole'],
        [this.els.toolDelete, 'delete'],
        [this.els.toolGrab, 'grab'],
        [this.els.toolLaser, 'laser'],
      ];
      toolButtons.forEach(([button, key]) => {
        if (!button) return;
        button.classList.toggle('tool-active', key === mode);
      });

      if (mode !== 'select') {
        this.clearSelectionPanel();
      }
    }

    bindUI() {
      this.els.toolSelect.addEventListener('click', () => this.setToolMode('select'));
      this.els.toolSpawnPlanet.addEventListener('click', () => this.setToolMode('spawn-planet'));
      this.els.toolSpawnStar.addEventListener('click', () => this.setToolMode('spawn-star'));
      this.els.toolSpawnBlackHole.addEventListener('click', () => this.setToolMode('spawn-blackhole'));
      this.els.toolDelete.addEventListener('click', () => this.setToolMode('delete'));
      this.els.toolGrab.addEventListener('click', () => this.setToolMode('grab'));
      this.els.toolLaser.addEventListener('click', () => this.setToolMode('laser'));

      this.els.pause.addEventListener('click', () => {
        this.engine.paused = !this.engine.paused;
        this.els.pause.textContent = this.engine.paused ? 'Resume' : 'Pause';
      });
      this.els.step.addEventListener('click', () => {
        this.engine.stepOnce = true;
      });
      this.els.rewind.addEventListener('click', () => {
        this.engine.rewindStep();
        this.clearSelectionPanel();
      });
      this.els.reset.addEventListener('click', () => {
        this.engine.generateSystem();
        this.cam.reset();
        this.clearSelectionPanel();
      });
      this.els.random.addEventListener('click', () => {
        this.engine.generateSystem();
        this.clearSelectionPanel();
      });
      this.els.supernova.addEventListener('click', () => {
        const target = this.engine.selectedBody && this.engine.selectedBody.type === 'star'
          ? this.engine.selectedBody
          : this.engine.bodies.find((b) => b.alive && b.type === 'star');
        if (target) this.engine.triggerSupernovaOn(target);
      });

      this.els.gravity.addEventListener('input', () => {
        this.engine.gravityScale = parseFloat(this.els.gravity.value);
        this.els.gravityVal.textContent = `${this.engine.gravityScale.toFixed(2)}x`;
      });
      this.els.time.addEventListener('input', () => {
        this.engine.timeScale = parseFloat(this.els.time.value);
        this.els.timeVal.textContent = `${this.engine.timeScale.toFixed(1)}x`;
      });
      this.els.size.addEventListener('input', () => {
        this.engine.sizeScale = parseFloat(this.els.size.value);
        this.els.sizeVal.textContent = `${this.engine.sizeScale.toFixed(2)}x`;
      });

      this.els.collisions.addEventListener('change', () => {
        this.engine.collisionEnabled = this.els.collisions.checked;
      });
      this.els.trails.addEventListener('change', () => {
        this.engine.trailsEnabled = this.els.trails.checked;
      });
      this.els.labels.addEventListener('change', () => {
        this.engine.labelsEnabled = this.els.labels.checked;
      });
      this.els.nebula.addEventListener('change', () => {
        this.engine.nebulaEnabled = this.els.nebula.checked;
      });

      this.els.scenarioChaos.addEventListener('click', () => { this.engine.scenarioChaosCluster(); this.clearSelectionPanel(); });
      this.els.scenarioBinary.addEventListener('click', () => { this.engine.scenarioBinaryDance(); this.clearSelectionPanel(); });
      this.els.scenarioImpact.addEventListener('click', () => { this.engine.scenarioImpactTest(); this.clearSelectionPanel(); });
      this.els.scenarioRings.addEventListener('click', () => { this.engine.scenarioRingWorld(); this.clearSelectionPanel(); });

      this.els.spawnShip.addEventListener('click', () => {
        this.engine.spawnShip(0, 30, 0);
      });
      this.els.fireProjectile.addEventListener('click', () => {
        this.engine.fireProjectile();
      });

      this.els.applyEdit.addEventListener('click', () => this.applyEditor());

      this.els.toggleLeftHud.addEventListener('click', () => {
        this.els.leftHud.classList.toggle('collapsed');
        const expanded = !this.els.leftHud.classList.contains('collapsed');
        this.els.toggleLeftHud.textContent = expanded ? '❮' : '❯';
        this.els.toggleLeftHud.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });

      this.els.toggleRightHud.addEventListener('click', () => {
        this.els.rightHud.classList.toggle('collapsed');
        const expanded = !this.els.rightHud.classList.contains('collapsed');
        this.els.toggleRightHud.textContent = expanded ? '❯' : '❮';
        this.els.toggleRightHud.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });

      this.els.closeSelection.addEventListener('click', () => this.clearSelectionPanel());

      this.setToolMode(this.toolMode);
    }

    bindInput() {
      this.canvas.addEventListener('pointerdown', (e) => {
        this.pointerDown.x = e.clientX;
        this.pointerDown.y = e.clientY;

        const body = this.pickAt(e.clientX, e.clientY);
        if (this.toolMode === 'grab' && body) {
          this.grabbedBody = body;
          this.lastGrabPoint = this.getPointerPlanePoint(e.clientX, e.clientY, body.y);
          this.lastGrabVelocity.set(0, 0, 0);
          return;
        }

        if (this.toolMode.startsWith('spawn')) {
          const p = this.getPointerPlanePoint(e.clientX, e.clientY, 0);
          if (p) this.dragSpawn = { start: p.clone(), end: p.clone() };
        }
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (this.dragSpawn) {
          const p = this.getPointerPlanePoint(e.clientX, e.clientY, 0);
          if (p) this.dragSpawn.end.copy(p);
        }

        if (this.grabbedBody && this.grabbedBody.alive) {
          const p = this.getPointerPlanePoint(e.clientX, e.clientY, this.grabbedBody.y);
          if (!p) return;
          if (this.lastGrabPoint) {
            this.lastGrabVelocity.copy(p).sub(this.lastGrabPoint).multiplyScalar(8);
          }
          this.lastGrabPoint = p.clone();
          this.grabbedBody.x = p.x;
          this.grabbedBody.y = p.y;
          this.grabbedBody.z = p.z;
          this.grabbedBody.vx = 0;
          this.grabbedBody.vy = 0;
          this.grabbedBody.vz = 0;
        }
      });

      this.canvas.addEventListener('pointerup', (e) => {
        const moved = Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y);

        if (this.grabbedBody) {
          this.grabbedBody.vx += this.lastGrabVelocity.x;
          this.grabbedBody.vy += this.lastGrabVelocity.y;
          this.grabbedBody.vz += this.lastGrabVelocity.z;
          this.grabbedBody = null;
          return;
        }

        if (this.dragSpawn) {
          const d = this.dragSpawn.end.clone().sub(this.dragSpawn.start);
          const vel = d.multiplyScalar(0.8);
          this.spawnByTool(this.dragSpawn.start, vel);
          this.dragSpawn = null;
          return;
        }

        if (moved > 5) return;

        const body = this.pickAt(e.clientX, e.clientY);

        if (this.toolMode === 'delete' && body) {
          this.engine.removeBody(body);
          this.clearSelectionPanel();
          return;
        }

        if (this.toolMode === 'laser' && body) {
          this.laserDestroy(body);
          this.clearSelectionPanel();
          return;
        }

        if (this.toolMode === 'select' && body) {
          this.engine.selectedBody = body;
          this.updateInfo(body);
          this.populateEditor(body);
          return;
        }

        if (this.toolMode === 'select' && !body) {
          this.clearSelectionPanel();
        }
      });

      window.addEventListener('keydown', (e) => {
        if (e.code in this.shipKeys) this.shipKeys[e.code] = true;
        if (e.code === 'KeyJ') this.engine.fireProjectile();
        if (e.code === 'Digit1') this.setToolMode('select');
        if (e.code === 'Digit2') this.setToolMode('spawn-planet');
        if (e.code === 'Digit3') this.setToolMode('spawn-star');
        if (e.code === 'Digit4') this.setToolMode('spawn-blackhole');
        if (e.code === 'Digit5') this.setToolMode('delete');
        if (e.code === 'Digit6') this.setToolMode('grab');
        if (e.code === 'Digit7') this.setToolMode('laser');
      });

      window.addEventListener('keyup', (e) => {
        if (e.code in this.shipKeys) this.shipKeys[e.code] = false;
      });
    }

    getPointerPlanePoint(clientX, clientY, yLevel = 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -yLevel);
      const point = new THREE.Vector3();
      const hit = this.raycaster.ray.intersectPlane(plane, point);
      return hit ? point : null;
    }

    pickAt(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this.engine.pickBody(this.raycaster);
    }

    spawnByTool(position, velocity) {
      if (!position) return;

      if (this.toolMode === 'spawn-planet') {
        const star = this.engine.bodies.find((b) => b.alive && b.type === BODY_TYPES.STAR) || this.engine.createStar(0, 0, STAR_TYPES[0]);
        const p = this.engine.createPlanet(star, Math.max(80, Math.hypot(position.x - star.x, position.z - star.z)), 0);
        p.x = position.x; p.y = position.y; p.z = position.z;
        p.vx = velocity.x; p.vy = velocity.y; p.vz = velocity.z;
      }

      if (this.toolMode === 'spawn-star') {
        const s = this.engine.createStar(position.x, position.z, null);
        s.y = position.y;
        s.vx = velocity.x * 0.2;
        s.vy = velocity.y * 0.2;
        s.vz = velocity.z * 0.2;
      }

      if (this.toolMode === 'spawn-blackhole') {
        this.engine.spawnBlackHole(position.x, position.y, position.z);
      }
    }

    laserDestroy(body) {
      const center = { x: body.x, y: body.y, z: body.z };
      this.engine.removeBody(body);
      this.engine.createExplosionFX(center.x, center.y, center.z, 0xff3d3d, 1.4);
      const near = this.engine.bodies.filter((b) => b.alive && Math.hypot(b.x - center.x, b.y - center.y, b.z - center.z) < 120);
      for (const b of near) {
        const dir = new THREE.Vector3(b.x - center.x, b.y - center.y, b.z - center.z).normalize();
        const push = 45 / Math.max(1, b.mass * 0.03);
        b.vx += dir.x * push;
        b.vy += dir.y * push;
        b.vz += dir.z * push;
      }
    }

    populateEditor(body) {
      this.els.selectionPanel.classList.remove('hidden');
      this.els.editMass.value = body.mass.toFixed(1);
      this.els.editRadius.value = body.radius.toFixed(2);
      this.els.editVx.value = body.vx.toFixed(2);
      this.els.editVy.value = body.vy.toFixed(2);
      this.els.editVz.value = body.vz.toFixed(2);
      this.els.editRing.checked = !!body.ring;
      this.els.editAtmo.checked = !!body.atmosphereMesh;
    }

    applyEditor() {
      const body = this.engine.selectedBody;
      if (!body || !body.alive) return;

      body.mass = Math.max(1, parseFloat(this.els.editMass.value) || body.mass);
      body.radius = Math.max(0.5, parseFloat(this.els.editRadius.value) || body.radius);
      body.vx = parseFloat(this.els.editVx.value) || 0;
      body.vy = parseFloat(this.els.editVy.value) || 0;
      body.vz = parseFloat(this.els.editVz.value) || 0;

      if (body.mesh) {
        body.mesh.scale.setScalar(Math.max(0.5, body.radius / body.mesh.geometry.parameters.radius));
      }

      this.engine.enableRing(body, this.els.editRing.checked);
      this.engine.enableAtmosphere(body, this.els.editAtmo.checked);
      this.updateInfo(body);
    }

    updateInfo(body) {
      this.els.selectionPanel.classList.remove('hidden');
      this.els.infoName.textContent = body.name;
      this.els.infoType.textContent = `Type: ${body.type}${body.subtype ? ` (${body.subtype})` : ''}`;
      this.els.infoMass.textContent = `Mass: ${body.mass.toFixed(2)}`;
      this.els.infoRadius.textContent = `Radius: ${body.radius.toFixed(2)}`;
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
      this.els.infoVelocity.textContent = `Velocity: ${speed.toFixed(2)} u/s`;
      const dist = Math.sqrt(body.x * body.x + body.y * body.y + body.z * body.z);
      this.els.infoDistance.textContent = `Distance from center: ${dist.toFixed(2)}`;
      this.els.infoMoons.textContent = `Moons: ${body.moonCount || 0}`;
      this.els.infoTemp.textContent = `Temperature: ${(body.temperature || 0).toFixed(0)} K`;
    }

    shipController(ship, dt) {
      const thrust = 34;
      const yawSpeed = 2.4;

      if (ship.mesh) {
        if (this.shipKeys.KeyQ) ship.mesh.rotation.y += yawSpeed * dt;
        if (this.shipKeys.KeyE) ship.mesh.rotation.y -= yawSpeed * dt;
      }

      const fwd = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);
      if (ship.mesh) {
        fwd.applyQuaternion(ship.mesh.quaternion);
        right.applyQuaternion(ship.mesh.quaternion);
      }

      if (this.shipKeys.KeyW) {
        ship.vx += fwd.x * thrust * dt;
        ship.vy += fwd.y * thrust * dt;
        ship.vz += fwd.z * thrust * dt;
      }
      if (this.shipKeys.KeyS) {
        ship.vx -= fwd.x * thrust * dt;
        ship.vy -= fwd.y * thrust * dt;
        ship.vz -= fwd.z * thrust * dt;
      }
      if (this.shipKeys.KeyA) {
        ship.vx -= right.x * thrust * 0.7 * dt;
        ship.vy -= right.y * thrust * 0.7 * dt;
        ship.vz -= right.z * thrust * 0.7 * dt;
      }
      if (this.shipKeys.KeyD) {
        ship.vx += right.x * thrust * 0.7 * dt;
        ship.vy += right.y * thrust * 0.7 * dt;
        ship.vz += right.z * thrust * 0.7 * dt;
      }
      if (this.shipKeys.KeyR) ship.vy += thrust * 0.8 * dt;
      if (this.shipKeys.KeyF) ship.vy -= thrust * 0.8 * dt;
    }

    bindResize() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    syncStats() {
      const s = this.engine.stats;
      this.els.statBodies.textContent = String(s.bodies);
      this.els.statPlanets.textContent = String(s.planets);
      this.els.statMoons.textContent = String(s.moons);
      this.els.statStars.textContent = String(s.stars);
      this.els.statAsteroids.textContent = String(s.asteroids);
      this.els.statTime.textContent = `${this.engine.simYears.toFixed(1)}y`;

      if (this.engine.selectedBody && this.engine.selectedBody.alive) {
        this.updateInfo(this.engine.selectedBody);
      } else {
        this.els.selectionPanel.classList.add('hidden');
      }
    }

    drawSpawnVectorHint() {
      if (!this.dragSpawn) return;
      const p = this.dragSpawn.start;
      const e = this.dragSpawn.end;
      const dir = new THREE.Vector3().subVectors(e, p);
      const len = dir.length();
      if (len < 0.001) return;

      const g = new THREE.BufferGeometry().setFromPoints([p, e]);
      const m = new THREE.LineBasicMaterial({ color: 0xffe08a });
      const line = new THREE.Line(g, m);
      this.scene.add(line);
      setTimeout(() => {
        this.scene.remove(line);
        g.dispose();
        m.dispose();
      }, 20);
    }

    animate = (now) => {
      const dt = Math.min((now - (this.prev || now)) / 1000, 0.04);
      this.prev = now;

      this.engine.tick(dt, (ship, stepDt) => this.shipController(ship, stepDt));
      this.syncStats();
      this.drawSpawnVectorHint();

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.animate);
    };
  }

  const app = new UniverseApp();
  app.engine.generateSystem();
})();
