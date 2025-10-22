<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-gray-700">{{ title }}</h3>
      <div class="flex gap-2">
        <Button variant="outline" @click="copyToClipboard">
          复制到剪贴板
        </Button>
        <Button v-if="showApply" variant="success" @click="emit('apply')">
          应用到全局配置
        </Button>
      </div>
    </div>
    <pre class="code-preview">{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
import Button from "./Button.vue";

interface Props {
  title?: string;
  content: string;
  showApply?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: "预览",
  showApply: false,
});

const emit = defineEmits<{
  apply: [];
}>();

async function copyToClipboard() {
  try {
    await window.naimo.system.copyText(props.content);
    await window.naimo.system.notify("复制成功", "内容已复制到剪贴板");
  } catch (error) {
    await window.naimo.system.notify("复制失败", "无法复制到剪贴板");
  }
}
</script>
