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
const password = ref("");

const formSchema = toTypedSchema(
  z.object({
    email: z.email(),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .max(120, "Password must be at most 120 characters."),
    confirm_password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .max(120, "Password must be at most 120 characters."),
  })
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: "",
    password: "",
    confirm_password: "",
  },
});

const onSubmit = handleSubmit((data) => {
  toast("You submitted the following values:", {
    description: h(
      "pre",
      {
        class:
          "bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4",
      },
      h("code", JSON.stringify(data, null, 2))
    ),
    position: "bottom-right",
    class: "flex flex-col gap-2",
    style: {
      "--border-radius": "calc(var(--radius)  + 4px)",
    },
  });
});
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Create an account</CardTitle>
      <CardDescription>
        Enter your information below to create your account
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form>
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
              <FieldLabel for="password"> Password </FieldLabel>
              <InputPasswordStrength
                v-model="password"
                v-bind="field"
                required
                :aria-invalid="!!errors.length"
              />
              <FieldError v-if="errors.length" :errors="errors" />
            </Field>
          </VeeField>
          <Field>
            <FieldLabel for="confirm-password"> Confirm Password </FieldLabel>
            <Input id="confirm-password" type="password" required />
            <FieldDescription>Please confirm your password.</FieldDescription>
          </Field>
          <FieldGroup>
            <Field>
              <Button type="submit"> Create Account </Button>
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
