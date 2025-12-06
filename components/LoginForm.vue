<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";
import { LucideLoader2 } from "lucide-vue-next";
import * as z from "zod";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { useRouter } from "vue-router";

const store = useAuthStore();
const router = useRouter();

const isLoading = ref(false);
const error = ref<string | null>(null);

// --- Single Schema for both fields ---
const formSchema = toTypedSchema(
  z.object({
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Master password is required" }),
  })
);

// --- Single Form Context ---
const { handleSubmit } = useForm({
  validationSchema: formSchema,
});

const onSubmit = handleSubmit(async (values) => {
  error.value = null;
  isLoading.value = true;

  try {
    // Perform the full SRP Handshake (Init + Verify)
    await store.login(values.email, values.password);

    // Redirect on success
    router.push("/");
  } catch (err: any) {
    console.error("Login failed:", err);
    error.value = err.message || "Invalid email or password.";
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="grid gap-6">
    <form class="space-y-4" @submit="onSubmit">
      <!-- Email Field -->
      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="m@example.com"
              v-bind="componentField"
              :disabled="isLoading"
              autofocus
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Password Field -->
      <FormField v-slot="{ componentField }" name="password">
        <FormItem>
          <FormLabel>Master Password</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder="••••••••"
              v-bind="componentField"
              :disabled="isLoading"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Submit Button -->
      <Button :disabled="isLoading" type="submit" class="w-full">
        <LucideLoader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
        {{ isLoading ? "Verifying..." : "Log In" }}
      </Button>
    </form>

    <!-- Error Message -->
    <div
      v-if="error"
      class="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200"
    >
      {{ error }}
    </div>
  </div>
</template>
