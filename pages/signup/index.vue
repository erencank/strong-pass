<script setup lang="ts">
import SignupForm from "@/components/signup-01/components/SignupForm.vue";
</script>

<template>
  <div
    class="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10"
  >
    <div
      class="absolute inset-0 z-0 h-full w-full bg-background bg-[radial-gradient(theme(colors.foreground/.2)_1px,transparent_1px)] bg-[size:20px_20px]"
    ></div>
    <div class="relative z-10 w-full max-w-sm">
      <SignupForm />
    </div>
  </div>
</template>
