<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number;
let particles: Particle[] = [];

// --- Configuration ---
const SPACING = 20; // Distance between dots
const RADIUS = 1; // Base radius of dots
const WAVE_SPEED = 0.0003; // How fast the wave moves
const WAVE_AMP = 2; // How far the dots move (pixels)
const WAVE_FREQ = 0.005; // Tightness of the wave (lower = wider waves)
const DOT_COLOR = "#333333";

// Global time tracker for the animation
let time = 0;

interface Particle {
  originX: number; // Home X
  originY: number; // Home Y
}

// Initialize the grid of particles
const initParticles = (width: number, height: number) => {
  particles = [];
  // Add extra padding so waves entering/leaving edges don't show gaps
  for (let x = -50; x < width + 50; x += SPACING) {
    for (let y = -50; y < height + 50; y += SPACING) {
      particles.push({ originX: x, originY: y });
    }
  }
};

// Main Animation Loop
const animate = (timestamp: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Clear Screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Update Time
  // Using timestamp ensures consistent speed on different refresh rates
  time += WAVE_SPEED * 16; // Approx 16ms per frame reference

  ctx.fillStyle = DOT_COLOR;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // --- Wave Calculation ---
    // "x + y" creates a diagonal gradient value from top-left to bottom-right.
    // We subtract 'time' to make the wave flow forward.
    const waveValue = Math.sin((p.originX + p.originY) * WAVE_FREQ - time);

    // Calculate new position based on the wave
    // We move them slightly in X and Y to create a circular "floating" motion
    const x = p.originX + Math.sin(waveValue) * WAVE_AMP;
    const y = p.originY + Math.cos(waveValue) * WAVE_AMP;

    // Optional: Vary size slightly based on wave height for depth
    // Map waveValue (-1 to 1) to a radius multiplier (0.5 to 1.5)
    const currentRadius = RADIUS + waveValue * 0.5;

    // --- Drawing ---
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, currentRadius), 0, Math.PI * 2);
    ctx.fill();
  }

  animationFrameId = requestAnimationFrame(() => animate(performance.now()));
};

const handleResize = () => {
  if (!canvasRef.value) return;
  canvasRef.value.width = window.innerWidth;
  canvasRef.value.height = window.innerHeight;
  initParticles(window.innerWidth, window.innerHeight);
};

onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
    initParticles(window.innerWidth, window.innerHeight);
    animate(performance.now());
  }
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 -z-10 h-full w-full bg-black block"
  />
</template>
