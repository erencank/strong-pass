<script setup lang="ts">
import { ref, computed } from "vue";
import { Eye, EyeOff } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const props = defineProps<{
  modelValue: string;
  id?: string;
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const isVisible = ref(false);
const isFocused = ref(false);

const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};

// --- DISPLAY LOGIC --- //

// FIXED: Priority is now:
// 1. If User wants to see (isVisible) -> Show Real Password
// 2. If Not Focused & Has Data -> Show Dummy Dots (Obfuscation)
// 3. Else (Focused or Empty) -> Show Real Password (masked by type="password")
const displayValue = computed(() => {
  if (isVisible.value) return props.modelValue;
  if (!isFocused.value && props.modelValue && props.modelValue.length > 0) {
    return "•".repeat(10);
  }
  return props.modelValue;
});

// FIXED: If isVisible is true, FORCE type "text" regardless of focus
const inputType = computed(() => {
  return isVisible.value ? "text" : "password";
});

// --- STRENGTH LOGIC (Unchanged) --- //
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
    <div class="relative">
      <Input
        :id="id"
        :type="inputType"
        :placeholder="placeholder || 'Password'"
        :model-value="displayValue"
        @update:model-value="emit('update:modelValue', $event)"
        @focus="isFocused = true"
        @blur="isFocused = false"
        class="pr-9 transition-all"
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        @click="toggleVisibility"
        @mousedown.prevent
        class="text-muted-foreground hover:bg-transparent absolute inset-y-0 right-0 h-full w-9 px-2"
      >
        <component :is="isVisible ? EyeOff : Eye" class="h-4 w-4" />
        <span class="sr-only">
          {{ isVisible ? "Hide password" : "Show password" }}
        </span>
      </Button>
    </div>

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
