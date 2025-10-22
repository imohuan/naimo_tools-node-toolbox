<template>
  <div :class="['card', { 'hover:shadow-none hover:translate-y-0': noHover }]">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  noHover?: boolean;
}

withDefaults(defineProps<Props>(), {
  noHover: false,
});
</script>
