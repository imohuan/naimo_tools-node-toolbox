<template>
  <div class="progress-bar">
    <div
      class="progress-fill flex items-center justify-center text-xs text-white font-medium"
      :style="{ width: `${progress}%` }"
    >
      <span v-if="showText && progress > 10">{{ progress }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  progress: number;
  showText?: boolean;
}

withDefaults(defineProps<Props>(), {
  showText: true,
});
</script>
