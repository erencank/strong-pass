<script setup lang="ts">
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
import { Spinner } from "@/components/ui/spinner";
import { ButtonGroup } from "@/components/ui/button-group";
import { DownloadIcon } from "lucide-vue-next";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const recoveryCode = ref<string | null>(null);
const isSubmitting = ref(false);
const router = useRouter();

const formSchema = toTypedSchema(
  z
    .object({
      email: z.email(),
      password: z
        .string()
        .min(10, "Password must be at least 10 characters.")
        .max(120, "Password must be at most 120 characters."),
      confirmPassword: z.string(),
    })
    .refine(
      (values) => {
        return values.password === values.confirmPassword;
      },
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }
    )
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: "",
    password: "",
    confirmPassword: "",
  },
});

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  isSubmitting.value = true;
  try {
    // 1. Perform Registration (SRP + Key Generation)
    const code = await auth.register(values.email, values.password);

    // 2. On Success, show the recovery code UI
    recoveryCode.value = code;
    toast.success("Account created successfully!");
  } catch (error: any) {
    console.error("Registration Failed:", error);
    toast.error(error.message || "Registration failed");

    // Map backend errors to form fields if possible
    if (error.message.toLowerCase().includes("exists")) {
      setErrors({ email: "This email is already registered" });
    } else {
      setErrors({ email: error.message }); // Fallback error on email field
    }
  } finally {
    isSubmitting.value = false;
  }
});

const copyRecoveryCode = () => {
  if (recoveryCode.value) {
    navigator.clipboard.writeText(recoveryCode.value);
    toast.success("Recovery code copied to clipboard");
  }
};

const downloadRecoveryCode = () => {
  if (!recoveryCode.value) return;
  const element = document.createElement("a");
  const file = new Blob([recoveryCode.value], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = "strong-pass-recovery-code.txt";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  toast.success("Recovery code downloaded");
};

const finishRegistration = () => {
  // Reload/Navigate to force fresh state for login
  router.replace("/login");
};
</script>

<template>
  <!-- SUCCESS STATE: RECOVERY CODE DISPLAY -->
  <Card v-if="recoveryCode" class="border-green-500/50 shadow-lg">
    <CardHeader>
      <CardTitle class="text-green-600 flex items-center gap-2">
        Account Created
      </CardTitle>
      <CardDescription>
        Your secure vault is ready. Please save your recovery code.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Warning Banner -->
      <div
        class="rounded-md bg-amber-500/10 p-4 border border-amber-500/20 text-amber-700 dark:text-amber-500 text-sm"
      >
        <div class="flex items-center gap-2 font-bold mb-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-shield-alert"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          IMPORTANT
        </div>
        <p>
          We operate on a <strong>Zero-Knowledge</strong> architecture. We
          <strong>cannot</strong> reset your password for you. This code is the
          <strong>only way</strong> to recover your account if you forget your
          master password.
        </p>
      </div>

      <!-- Code Display -->
      <div class="relative group">
        <div
          class="p-4 bg-muted/50 rounded-md border font-mono text-center text-lg tracking-wider break-all selection:bg-primary selection:text-primary-foreground"
        >
          {{ recoveryCode }}
        </div>
      </div>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <ButtonGroup class="flex w-full">
        <Button
          class="flex-1 rounded-r-none focus-visible:z-10"
          variant="outline"
          @click="copyRecoveryCode"
        >
          <Copy class="mr-2 h-4 w-4" />
          Copy Recovery Code
        </Button>
        <Button
          class="rounded-l-none border-l-0 px-3 focus-visible:z-10"
          variant="outline"
          @click="downloadRecoveryCode"
          title="Download as text file"
        >
          <DownloadIcon class="h-4 w-4" />
        </Button>
      </ButtonGroup>

      <Button class="w-full" @click="finishRegistration">
        I have saved it, continue to Login
      </Button>
    </CardFooter>
  </Card>

  <Card v-else>
    <CardHeader>
      <CardTitle>Create an account</CardTitle>
      <CardDescription>
        Enter your information below to create your account
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form id="signup-form" @submit="onSubmit">
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
              <FieldLabel for="password"> Master Password </FieldLabel>
              <InputPasswordStrength
                v-model="password"
                v-bind="field"
                required
                :aria-invalid="!!errors.length"
              />
              <FieldError v-if="errors.length" :errors="errors" />
            </Field>
          </VeeField>
          <VeeField v-slot="{ field, errors }" name="confirmPassword">
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="confirmPassword">
                Confirm Master Password
              </FieldLabel>
              <InputPasswordEye
                v-model="confirmPassword"
                v-bind="field"
                required
                :aria-invalid="!!errors.length"
              />
              <FieldError v-if="errors.length" :errors="errors" />
            </Field>
          </VeeField>
          <FieldGroup>
            <Field>
              <Button
                type="submit"
                form="signup-form"
                class="w-full"
                :disabled="isSubmitting"
              >
                <Spinner v-if="isSubmitting" />
                {{ isSubmitting ? "Creating Account..." : "Create Account" }}
              </Button>
              <FieldDescription class="px-6 text-center">
                Already have an account?
                <NuxtLink to="/login">Sign in</NuxtLink>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldGroup>
      </form>
    </CardContent>
  </Card>
</template>
