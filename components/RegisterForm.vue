<script setup lang="ts">
import { LucideLoader2 } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { useRouter, useRuntimeConfig } from "#app";
import * as z from "zod";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";

const isLoading = ref(false);
const store = useAuthStore();
const config = useRuntimeConfig();
const emit = defineEmits(["registration-success"]);

const formSchema = toTypedSchema(
  z.object({
    email: z.email(),
    password: z.string().min(8, "Must be at least 8 characters"),
  })
);

const form = useForm({
  validationSchema: formSchema,
});

const onSubmit = form.handleSubmit((values) => {
  console.log("Form submitted!", values);
  isLoading.value = true;
  store.register(values.email, values.password);
  toast({
    title: "Succesfully registered",
    variant: "success",
    duration: 3000,
  });
  emit("registration-success");
  //   Update the focus of the tabs to the login value in the login.vue page

  isLoading.value = false;
});
</script>
<template>
  <Card>
    <CardHeader>
      <CardTitle>Register</CardTitle>
      <CardDescription> Secure your passwords forever </CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <div class="space-y-1">
        <form class="space-y-2" @submit="onSubmit">
          <FormField
            class="grid gap-1"
            v-slot="{ componentField }"
            name="email"
          >
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField
            class="grid gap-1"
            v-slot="{ componentField }"
            name="password"
          >
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  placeholder="password"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <Button class="w-full" :disabled="isLoading">
            <LucideLoader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Log In
          </Button>
        </form>
      </div>
    </CardContent>
  </Card>
</template>
