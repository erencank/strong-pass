<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { LucideLoader2 } from "lucide-vue-next";
import * as z from "zod";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";

const store = useAuthStore();

// --- Form 1: Email Step ---
const emailSchema = toTypedSchema(
  z.object({
    email: z.email(),
  })
);

const { handleSubmit: handleEmailSubmit } = useForm({
  validationSchema: emailSchema,
});

// This function will only be called if email validation passes
const onEmailSubmit = handleEmailSubmit((values) => {
  store.loginStep1_getChallenge(values.email);
});

// --- Form 2: Password Step ---
const passwordSchema = toTypedSchema(
  z.object({
    password: z.string(),
  })
);

const { handleSubmit: handlePasswordSubmit } = useForm({
  validationSchema: passwordSchema,
});

// This function will only be called if password validation passes
const onPasswordSubmit = handlePasswordSubmit((values) => {
  store.loginStep2_solveChallenge(values.password);
});
</script>

<template>
  <div>
    <!-- Step 1: Email Form -->
    <form
      v-if="store.loginStep === 'email'"
      class="space-y-4"
      @submit="onEmailSubmit"
    >
      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="m@example.com"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <Button :disabled="store.isLoading" type="submit" class="w-full">
        <LucideLoader2
          v-if="store.isLoading"
          class="mr-2 h-4 w-4 animate-spin"
        />
        {{ store.isLoading ? "Loading..." : "Continue" }}
      </Button>
    </form>

    <!-- Step 2: Password Form -->
    <form
      v-if="store.loginStep === 'password'"
      class="space-y-4"
      @submit="onPasswordSubmit"
    >
      <p class="text-sm text-muted-foreground">
        Logging in as <strong>{{ store.loginEmail }}</strong
        >.
      </p>

      <FormField v-slot="{ componentField }" name="password">
        <FormItem>
          <FormLabel>Master Password</FormLabel>
          <FormControl>
            <Input type="password" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <div class="flex flex-col space-y-2">
        <Button :disabled="store.isLoading" type="submit" class="w-full">
          <LucideLoader2
            v-if="store.isLoading"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ store.isLoading ? "Logging in..." : "Log In" }}
        </Button>
        <Button
          variant="link"
          size="sm"
          class="px-0"
          @click.prevent="store.resetLoginFlow()"
        >
          Not you? Go back
        </Button>
      </div>
    </form>

    <!-- Global Error Message -->
    <p v-if="store.error" class="mt-4 text-sm text-red-500">
      {{ store.error }}
    </p>
  </div>
</template>
