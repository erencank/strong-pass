<script lang="ts">
export const description = "A simple login form.";
</script>

<script setup lang="ts">
import LoginForm from "@/components/login-01/components/LoginForm.vue";
</script>

<template>
  <div
    class="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10"
  >
    <BackgroundGridWave />
    <div class="relative z-10 w-full max-w-sm">
      <LoginForm />
    </div>
  </div>
</template>
