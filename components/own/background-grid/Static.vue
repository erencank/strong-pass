<script setup lang="ts">
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    :class="
      cn(
        'absolute inset-0 z-0 h-full w-full bg-[#000000] pointer-events-none',
        props.class
      )
    "
  >
    <div
      class="absolute inset-0 z-0 h-full w-full bg-background bg-[radial-gradient(theme(colors.foreground/.2)_1px,transparent_1px)] bg-size-[20px_20px]"
    ></div>
  </div>
</template>
