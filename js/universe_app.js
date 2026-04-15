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

    this.els = this.collectEls();
    this.bindUI();
    this.bindInput();
    this.bindResize();
    updateRotateOverlayVisibility();

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

      eventMeteor: q('event-meteor'),
      eventPulse: q('event-pulse'),
      eventFlare: q('event-flare'),
      eventRogue: q('event-rogue'),

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
      zeroVelocity: q('zero-velocity'),
      cloneBody: q('clone-body'),

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

    if (this.els.eventMeteor) this.els.eventMeteor.addEventListener('click', () => this.engine.triggerMeteorStorm());
    if (this.els.eventPulse) this.els.eventPulse.addEventListener('click', () => this.engine.triggerGravityPulse());
    if (this.els.eventFlare) this.els.eventFlare.addEventListener('click', () => this.engine.triggerSolarFlare());
    if (this.els.eventRogue) this.els.eventRogue.addEventListener('click', () => this.engine.triggerRogueInfall());

    this.els.applyEdit.addEventListener('click', () => this.applyEditor());
    this.els.zeroVelocity.addEventListener('click', () => this.zeroSelectedVelocity());
    this.els.cloneBody.addEventListener('click', () => this.cloneSelectedBody());

    this.els.toggleLeftHud.addEventListener('click', () => {
      this.els.leftHud.classList.toggle('collapsed');
      const expanded = !this.els.leftHud.classList.contains('collapsed');
      this.els.toggleLeftHud.textContent = expanded ? '<' : '>';
      this.els.toggleLeftHud.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    this.els.toggleRightHud.addEventListener('click', () => {
      this.els.rightHud.classList.toggle('collapsed');
      const expanded = !this.els.rightHud.classList.contains('collapsed');
      this.els.toggleRightHud.textContent = expanded ? '>' : '<';
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

      if (this.cam.wasInteractingRecently(90) && moved > 2) {
        return;
      }

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
      if (e.code === 'Digit1') this.setToolMode('select');
      if (e.code === 'Digit2') this.setToolMode('spawn-planet');
      if (e.code === 'Digit3') this.setToolMode('spawn-star');
      if (e.code === 'Digit4') this.setToolMode('spawn-blackhole');
      if (e.code === 'Digit5') this.setToolMode('delete');
      if (e.code === 'Digit6') this.setToolMode('grab');
      if (e.code === 'Digit7') this.setToolMode('laser');
      if (e.code === 'KeyC') this.cam.reset();
      if (e.code === 'KeyV' && this.engine.selectedBody && this.engine.selectedBody.alive) {
        const b = this.engine.selectedBody;
        const desiredDistance = Math.max(60, Math.min(1400, b.radius * 34));
        this.cam.frameTarget(new THREE.Vector3(b.x, b.y, b.z), desiredDistance);
      }
      if (this.els.eventMeteor && e.code === 'KeyM') this.engine.triggerMeteorStorm();
      if (this.els.eventPulse && e.code === 'KeyG') this.engine.triggerGravityPulse();
      if (this.els.eventFlare && e.code === 'KeyF') this.engine.triggerSolarFlare();
      if (this.els.eventRogue && e.code === 'KeyR') this.engine.triggerRogueInfall();
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

    this.engine.updateBodyScale(body);

    this.engine.enableRing(body, this.els.editRing.checked);
    this.engine.enableAtmosphere(body, this.els.editAtmo.checked);
    this.updateInfo(body);
  }

  zeroSelectedVelocity() {
    const body = this.engine.selectedBody;
    if (!body || !body.alive) return;
    body.vx = 0;
    body.vy = 0;
    body.vz = 0;
    this.populateEditor(body);
    this.updateInfo(body);
  }

  cloneSelectedBody() {
    const body = this.engine.selectedBody;
    if (!body || !body.alive) return;

    const clone = this.engine.createBody({
      type: body.type,
      subtype: body.subtype,
      name: `${body.name}-copy`,
      mass: body.mass,
      radius: body.radius,
      color: body.color,
      atmosphere: body.atmosphere,
      temperature: body.temperature,
      x: body.x + body.radius * 2.8,
      y: body.y,
      z: body.z + body.radius * 1.6,
      vx: body.vx,
      vy: body.vy,
      vz: body.vz,
    });

    if (body.ring) this.engine.enableRing(clone, true);
    if (body.atmosphereMesh) this.engine.enableAtmosphere(clone, true);

    this.engine.selectedBody = clone;
    this.populateEditor(clone);
    this.updateInfo(clone);
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

    this.engine.tick(dt);
    this.syncStats();
    this.drawSpawnVectorHint();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
}
