<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toTypedSchema } from "@vee-validate/zod";
import z from "zod";
import { useForm, Field as VeeField } from "vee-validate";
import { toast } from "vue-sonner";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const auth = useAuthStore();
const isSubmitting = ref(false);

const formSchema = toTypedSchema(
  z.object({
    email: z.email(),
    password: z.string(),
  })
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: "",
    password: "",
  },
});

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  isSubmitting.value = true;
  try {
    await auth.login(values.email, values.password);
  } catch (error: any) {
    console.error("Login Failed:", error);
    toast.error(error.message || "Login failed");
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" @submit="onSubmit">
          <FieldGroup>
            <VeeField v-slot="{ field, errors }" name="email">
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="email"> Email </FieldLabel>
                <Input
                  v-bind="field"
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  :aria-invalid="!!errors.length"
                />
                <FieldError v-if="errors.length" :errors="errors" />
              </Field>
            </VeeField>
            <VeeField v-slot="{ field, errors }" name="password">
              <Field :data-invalid="!!errors.length">
                <div class="flex items-center">
                  <FieldLabel for="password"> Password </FieldLabel>
                  <a
                    href="#"
                    class="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <InputHidden
                  v-model="password"
                  v-bind="field"
                  required
                  :aria-invalid="!!errors.length"
                />
                <FieldError v-if="errors.length" :errors="errors" />
              </Field>
            </VeeField>
            <Field>
              <Button
                type="submit"
                form="login-form"
                class="w-full"
                :disabled="isSubmitting"
              >
                <Spinner v-if="isSubmitting" />
                {{ isSubmitting ? "Logging in..." : "Login" }}
              </Button>
              <FieldDescription class="text-center">
                Don't have an account?
                <NuxtLink to="/signup">Sign up</NuxtLink>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
