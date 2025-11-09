<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";

const store = useAuthStore();
const email = ref("");
const password = ref("");
const deviceName = ref("");
</script>

<template>
  <form @submit.prevent="store.register(email, password, deviceName)">
    <div class="grid w-full items-center gap-4">
      <div class="flex flex-col space-y-1.5">
        <Label for="reg-email">Email</Label>
        <Input id="reg-email" v-model="email" type="email" placeholder="m@example.com" required />
      </div>
      <div class="flex flex-col space-y-1.5">
        <Label for="reg-password">Master Password</Label>
        <Input id="reg-password" v-model="password" type="password" required />
      </div>
      <div class="flex flex-col space-y-1.5">
        <Label for="reg-device">Device Name</Label>
        <Input id="reg-device" v-model="deviceName" type="text" placeholder="My Laptop" required />
      </div>
      <Button :disabled="store.isLoading" type="submit">
        {{ store.isLoading ? 'Registering...' : 'Register' }}
      </Button>
      <p v-if="store.error" class="mt-2 text-sm text-red-500">
        {{ store.error }}
      </p>
    </div>
  </form>
</template>