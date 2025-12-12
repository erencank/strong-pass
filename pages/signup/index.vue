<script setup lang="ts">
import SignupForm from "@/components/signup-01/components/SignupForm.vue";
</script>

<template>
  <div
    class="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10"
  >
    <BackgroundGridWave />

    <div class="relative z-10 w-full max-w-sm">
      <SignupForm />
    </div>
  </div>
</template>
