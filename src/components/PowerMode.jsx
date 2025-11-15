import { onCleanup } from 'solid-js';

/**
 * Power Mode - Adds particle effects and screen shake on typing
 * Based on https://github.com/hoovercj/vscode-power-mode
 */
class PowerMode {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.shakeEnabled = options.shake !== false;
    this.particlesEnabled = options.particles !== false;
    this.maxParticles = options.maxParticles || 500;
    this.particleSize = options.particleSize || 8;
    this.particleRange = options.particleRange || 15;
    this.particleGravity = options.particleGravity || 1;
    this.particleDuration = options.particleDuration || 1000;
    this.shakeIntensity = options.shakeIntensity || 3;
    this.shakeDuration = options.shakeDuration || 300;

    this.colors = options.colors || [
      '#3ABFF8', // blue
      '#828DF8', // purple
      '#F471B5', // pink
      '#36D399', // green
      '#FBBD23', // yellow
      '#F87272', // red
    ];

    this.canvas = null;
    this.ctx = null;
    this.activeParticles = [];
    this.animationFrame = null;
    this.shakeTimeout = null;
    this.isShaking = false;
  }

  init(container) {
    if (!this.enabled) return;

    // Create canvas for particles
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';

    container.style.position = 'relative';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Handle resize
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(container);

    // Start animation loop
    this.animate();
  }

  resizeCanvas() {
    if (!this.canvas) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  createParticles(x, y) {
    if (!this.particlesEnabled || !this.ctx) return;

    const numParticles = 5 + Math.floor(Math.random() * 8);

    for (let i = 0; i < numParticles; i++) {
      if (this.activeParticles.length >= this.maxParticles) {
        this.activeParticles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * this.particleRange;

      this.activeParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 5,
        size: Math.random() * this.particleSize + 2,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        alpha: 1,
        life: this.particleDuration,
        decay: 1 / this.particleDuration
      });
    }
  }

  shake(element) {
    if (!this.shakeEnabled || this.isShaking) return;

    this.isShaking = true;
    const originalTransform = element.style.transform || '';

    const startTime = Date.now();
    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / this.shakeDuration;

      if (progress >= 1) {
        clearInterval(shakeInterval);
        element.style.transform = originalTransform;
        this.isShaking = false;
        return;
      }

      const intensity = this.shakeIntensity * (1 - progress);
      const x = (Math.random() - 0.5) * intensity * 2;
      const y = (Math.random() - 0.5) * intensity * 2;

      element.style.transform = `${originalTransform} translate(${x}px, ${y}px)`;
    }, 16);
  }

  animate() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += this.particleGravity * 0.1;
      particle.alpha -= particle.decay * 16;

      if (particle.alpha <= 0) {
        this.activeParticles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  dispose() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    this.activeParticles = [];
    this.canvas = null;
    this.ctx = null;
  }

  updateSettings(settings) {
    Object.assign(this, settings);
  }
}

/**
 * Hook to add power mode to Monaco editor
 */
export function usePowerMode(editorInstance, container, options = {}) {
  const powerMode = new PowerMode(options);

  if (editorInstance && container) {
    powerMode.init(container);

    // Listen to content changes
    const disposable = editorInstance.onDidChangeModelContent((e) => {
      if (!e.changes || e.changes.length === 0) return;

      // Get cursor position
      const position = editorInstance.getPosition();
      if (!position) return;

      // Convert editor position to screen coordinates
      const coords = editorInstance.getScrolledVisiblePosition(position);
      if (!coords) return;

      const containerRect = container.getBoundingClientRect();
      const editorDom = editorInstance.getDomNode();
      const editorRect = editorDom.getBoundingClientRect();

      const x = coords.left + editorRect.left - containerRect.left;
      const y = coords.top + editorRect.top - containerRect.top + coords.height / 2;

      // Create particles at cursor position
      powerMode.createParticles(x, y);

      // Shake the editor
      powerMode.shake(container);
    });

    onCleanup(() => {
      disposable.dispose();
      powerMode.dispose();
    });
  }

  return powerMode;
}

export default PowerMode;
