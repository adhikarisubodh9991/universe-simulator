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

  getSpeedLimitFor(body) {
    if (!body) return 420;
    if (body.type === BODY_TYPES.PROJECTILE) return 560;
    if (body.type === BODY_TYPES.COMET) return 420;
    if (body.type === BODY_TYPES.ASTEROID || body.type === BODY_TYPES.FRAGMENT) return 360;
    if (body.type === BODY_TYPES.SHIP) return 300;
    if (body.type === BODY_TYPES.BLACKHOLE) return 140;
    return 260;
  }

  sanitizeBodyState(body) {
    if (!body || !body.alive) return;

    if (!Number.isFinite(body.mass) || body.mass <= 0) body.mass = 1;
    if (!Number.isFinite(body.radius) || body.radius <= 0) body.radius = 0.5;

    body.mass = Math.min(2_000_000_000, Math.max(1, body.mass));
    body.radius = Math.min(1200, Math.max(0.4, body.radius));

    if (!Number.isFinite(body.x)) body.x = 0;
    if (!Number.isFinite(body.y)) body.y = 0;
    if (!Number.isFinite(body.z)) body.z = 0;
    if (!Number.isFinite(body.vx)) body.vx = 0;
    if (!Number.isFinite(body.vy)) body.vy = 0;
    if (!Number.isFinite(body.vz)) body.vz = 0;

    const speedSq = body.vx * body.vx + body.vy * body.vy + body.vz * body.vz;
    if (Number.isFinite(speedSq) && speedSq > 0) {
      const limit = this.getSpeedLimitFor(body);
      const limitSq = limit * limit;
      if (speedSq > limitSq) {
        const scale = limit / Math.sqrt(speedSq);
        body.vx *= scale;
        body.vy *= scale;
        body.vz *= scale;
      }
    }
  }

  runStabilityPass() {
    for (const b of this.bodies) {
      if (!b.alive) continue;
      this.sanitizeBodyState(b);
    }
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

    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (safeDt <= 0) {
      this.stepOnce = false;
      return;
    }

    const step = Math.max(0.0002, Math.min(safeDt * this.timeScale, 0.05));
    this.simYears += (step * 40) / 365;

    this.runStabilityPass();

    this.applyNBody(step);
    this.runStabilityPass();
    this.applyDecayAndInstability(step);

    if (this.ship && this.ship.alive && shipControl) {
      shipControl(this.ship, step);
      this.sanitizeBodyState(this.ship);
    }

    this.integrate(step);
    this.runStabilityPass();
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

  
