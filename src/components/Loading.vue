<template>
  <div class="flex items-center justify-center gap-2 text-gray-600">
    <span class="loading-spinner"></span>
    <span v-if="text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  text?: string;
}

withDefaults(defineProps<Props>(), {
  text: "加载中...",
});
</script>
