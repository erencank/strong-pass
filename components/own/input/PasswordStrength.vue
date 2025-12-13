<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";
import PasswordEye from "./PasswordEye.vue";

const props = defineProps<{
  modelValue: string;
  id?: string;
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

// --- STRENGTH LOGIC --- //
const strengthScore = computed(() => {
  const password = props.modelValue || "";
  if (!password) return 0;

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/[^a-zA-Z\d]/.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;

  const entropy = password.length * Math.log2(poolSize);

  if (entropy < 50) return 1;
  if (entropy < 100) return 2;
  return 3;
});

const strengthColor = computed(() => {
  switch (strengthScore.value) {
    case 0:
      return "bg-border";
    case 1:
      return "bg-destructive";
    case 2:
      return "bg-amber-500";
    case 3:
      return "bg-green-500";
    default:
      return "bg-border";
  }
});
</script>

<template>
  <div class="w-full space-y-2">
    <PasswordEye
      :id="id"
      :placeholder="placeholder"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div class="flex h-1 w-full gap-1">
      <div
        v-for="index in 3"
        :key="index"
        :class="
          cn(
            'h-full flex-1 rounded-full transition-all duration-300 ease-out',
            index <= strengthScore ? strengthColor : 'bg-border'
          )
        "
      />
    </div>
  </div>
</template>
