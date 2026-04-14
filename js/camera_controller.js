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
      rotateSpeed: 0.0042,
      panSpeed: 0.00125,
      zoomSpeed: 0.28,
      dragLeft: false,
      dragRight: false,
      lastX: 0,
      lastY: 0,
      lastInteractionAt: 0,
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
        this.state.azimuth -= dx * this.state.rotateSpeed;
        this.state.polar -= dy * (this.state.rotateSpeed * 0.85);
        this.state.polar = Math.max(0.08, Math.min(Math.PI - 0.08, this.state.polar));
        this.state.lastInteractionAt = performance.now();
        this.update();
      }

      if (this.state.dragRight) {
        this.camera.getWorldDirection(this.forward).normalize();
        this.right.crossVectors(this.forward, this.up).normalize();
        const pan = Math.max(0.08, this.state.distance * this.state.panSpeed);
        this.target.addScaledVector(this.right, -dx * pan);
        this.target.y += dy * pan;
        this.state.lastInteractionAt = performance.now();
        this.update();
      }
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.state.distance += e.deltaY * this.state.zoomSpeed;
      this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, this.state.distance));
      this.state.lastInteractionAt = performance.now();
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
        this.state.azimuth -= dx * this.state.rotateSpeed;
        this.state.polar -= dy * (this.state.rotateSpeed * 0.85);
        this.state.polar = Math.max(0.08, Math.min(Math.PI - 0.08, this.state.polar));
        this.state.lastInteractionAt = performance.now();
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
        const pan = Math.max(0.08, this.state.distance * this.state.panSpeed);
        this.target.addScaledVector(this.right, -dx * pan);
        this.target.y += dy * pan;

        const pdx = e.touches[0].clientX - e.touches[1].clientX;
        const pdy = e.touches[0].clientY - e.touches[1].clientY;
        const pinchDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (this.state.lastPinchDist) {
          this.state.distance -= (pinchDist - this.state.lastPinchDist) * 0.72;
          this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, this.state.distance));
        }
        this.state.lastPinchDist = pinchDist;
        this.state.lastInteractionAt = performance.now();
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
    this.state.lastInteractionAt = performance.now();
    this.update();
  }

  frameTarget(point, distance = null) {
    if (!point) return;
    this.target.copy(point);
    if (distance != null && Number.isFinite(distance)) {
      this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, distance));
    }
    this.state.lastInteractionAt = performance.now();
    this.update();
  }

  wasInteractingRecently(ms = 120) {
    return performance.now() - this.state.lastInteractionAt <= ms;
  }
}

  
