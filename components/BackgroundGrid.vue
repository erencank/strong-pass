<script setup lang="ts">
import { useMouse } from "@vueuse/core";

// We track the mouse coordinates here
const { x, y } = useMouse();
</script>

<template>
  <div
    class="absolute inset-0 z-0 h-full w-full bg-[#000000] pointer-events-none"
  >
    <div
      class="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff33_1px,transparent_1px)] bg-[size:20px_20px]"
    ></div>

    <ClientOnly>
      <div
        class="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:20px_20px]"
        :style="{
          maskImage: `radial-gradient(200px circle at ${x}px ${y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(200px circle at ${x}px ${y}px, black, transparent)`,
        }"
      ></div>
    </ClientOnly>
  </div>
</template>
