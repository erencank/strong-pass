<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";

const store = useAuthStore();
const email = ref("");
const password = ref("");
</script>

<template>
  <div>
    <!-- Step 1: Email -->
    <form
      v-if="store.loginStep === 'email'"
      @submit.prevent="store.loginStep1_getChallenge(email)"
    >
      <div class="grid w-full items-center gap-4">
        <div class="flex flex-col space-y-1.5">
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <!-- 
          In a real app, you'd get the device ID from localStorage.
          We are using a mock one in the store for this example.
        -->
        <Button :disabled="store.isLoading" type="submit">
          {{ store.isLoading ? "Loading..." : "Continue" }}
        </Button>
      </div>
    </form>

    <!-- Step 2: Password -->
    <form
      v-if="store.loginStep === 'password'"
      @submit.prevent="store.loginStep2_solveChallenge(password)"
    >
      <div class="grid w-full items-center gap-4">
        <p class="text-sm text-muted-foreground">
          <!-- --- FIX: The closing tag was broken --- -->
          Logging in as <strong>{{ store.loginEmail }}</strong
          >.
        </p>
        <div class="flex flex-col space-y-1.5">
          <Label for="password">Master Password</Label>
          <Input id="password" v-model="password" type="password" required />
        </div>
        <div class="flex flex-col space-y-2">
          <Button :disabled="store.isLoading" type="submit">
            {{ store.isLoading ? "Logging in..." : "Log In" }}
          </Button>
          <Button
            variant="link"
            size="sm"
            class="px-0"
            @click="store.resetLoginFlow()"
          >
            Not you? Go back
          </Button>
        </div>
      </div>
    </form>
    <p v-if="store.error" class="mt-4 text-sm text-red-500">
      {{ store.error }}
    </p>
  </div>
</template>
