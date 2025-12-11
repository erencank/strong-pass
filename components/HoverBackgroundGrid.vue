<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number;
let particles: Particle[] = [];
let mouse = { x: -1000, y: -1000 }; // Start off-screen

// Configuration
const SPACING = 20; // Distance between dots
const RADIUS = 1; // Size of dots
const HOVER_RADIUS = 250; // Range of the repulsion effect
const FORCE = 0.8; // How hard the mouse pushes (0.1 to 1.0)
const EASE = 0.1; // How fast dots return home (0.01 to 0.2)
const DOT_COLOR = "#444444";

interface Particle {
  x: number; // Current X
  y: number; // Current Y
  originX: number; // Home X
  originY: number; // Home Y
}

// Initialize the grid of particles
const initParticles = (width: number, height: number) => {
  particles = [];
  for (let x = 0; x < width; x += SPACING) {
    for (let y = 0; y < height; y += SPACING) {
      particles.push({ x, y, originX: x, originY: y });
    }
  }
};

// Main Animation Loop
const animate = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Clear Screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Update and Draw each particle
  ctx.fillStyle = DOT_COLOR;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // --- Physics Calculation ---
    // Calculate distance between mouse and this particle
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let forceDirectionX = 0;
    let forceDirectionY = 0;

    // If mouse is close, calculate repulsion force
    if (distance < HOVER_RADIUS) {
      const force = (HOVER_RADIUS - distance) / HOVER_RADIUS;
      const angle = Math.atan2(dy, dx);
      forceDirectionX = -Math.cos(angle) * force * FORCE * 50;
      forceDirectionY = -Math.sin(angle) * force * FORCE * 50;
    }

    // Move particle towards target (Current Position + Force)
    // We use a simple ease function: current += (target - current) * ease
    const targetX = p.originX + forceDirectionX;
    const targetY = p.originY + forceDirectionY;

    p.x += (targetX - p.x) * EASE;
    p.y += (targetY - p.y) * EASE;

    // --- Drawing ---
    // Draw the dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  animationFrameId = requestAnimationFrame(animate);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
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
    animate();
  }
  window.addEventListener("resize", handleResize);
  window.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("mousemove", handleMouseMove);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 -z-10 h-full w-full bg-black block"
  />
</template>
