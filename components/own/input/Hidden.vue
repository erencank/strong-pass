<script setup lang="ts">
import { ref, computed } from "vue";
import { Input } from "@/components/ui/input";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    id?: string;
    placeholder?: string;
    revealed?: boolean; // Parent can force text to show (Eye open)
    class?: string;
  }>(),
  {
    revealed: false,
  }
);

const emit = defineEmits(["update:modelValue", "focus", "blur"]);

const isFocused = ref(false);

// --- DISPLAY LOGIC --- //
const displayValue = computed(() => {
  // 1. If parent says "revealed" (Eye Open), show raw password
  if (props.revealed) return props.modelValue;

  // 2. If NOT focused & has data -> Obfuscate with 10 fixed dots
  if (!isFocused.value && props.modelValue && props.modelValue.length > 0) {
    return "•".repeat(10);
  }

  // 3. Otherwise (Focused or Empty) -> Show raw password (masked by type="password")
  return props.modelValue;
});

const inputType = computed(() => {
  return props.revealed ? "text" : "password";
});

const handleFocus = (e: FocusEvent) => {
  isFocused.value = true;
  emit("focus", e);
};

const handleBlur = (e: FocusEvent) => {
  isFocused.value = false;
  emit("blur", e);
};
</script>

<template>
  <Input
    :id="id"
    :type="inputType"
    :placeholder="placeholder || 'Password'"
    :model-value="displayValue"
    @update:model-value="emit('update:modelValue', $event)"
    @focus="handleFocus"
    @blur="handleBlur"
    :class="props.class"
  />
</template>
