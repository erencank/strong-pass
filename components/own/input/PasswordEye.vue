<script setup lang="ts">
import { ref } from "vue";
import { Eye, EyeOff } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import Hidden from "./Hidden.vue";

const props = defineProps<{
  modelValue: string;
  id?: string;
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const isVisible = ref(false);

const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};
</script>

<template>
  <div class="relative">
    <Hidden
      :id="id"
      :placeholder="placeholder"
      :model-value="modelValue"
      :revealed="isVisible"
      @update:model-value="emit('update:modelValue', $event)"
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
</template>
