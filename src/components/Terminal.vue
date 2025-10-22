<template>
  <!-- Teleport 清空按钮到顶部 tab 区域 -->
  <Teleport to="#tab-actions">
    <button
      v-if="route.path === '/terminal' && terminalStore.logs.length > 0"
      @click="terminalStore.clear()"
      class="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
    >
      清空日志
    </button>
  </Teleport>

  <div class="flex flex-col h-full bg-white overflow-hidden">
    <div
      ref="terminalRef"
      class="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs"
    >
      <div
        v-for="(log, index) in terminalStore.logs"
        :key="index"
        class="flex items-start gap-3"
        :class="getLogClass(log.type)"
      >
        <span class="opacity-60 flex-shrink-0 text-gray-500">{{
          log.time
        }}</span>
        <span class="flex-1 break-all">{{ log.message }}</span>
      </div>

      <div
        v-if="terminalStore.logs.length === 0"
        class="text-gray-400 text-center py-20"
      >
        暂无日志
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useTerminalStore } from "../stores/terminal";
import type { TerminalLog } from "../stores/terminal";

const route = useRoute();
const terminalStore = useTerminalStore();
const terminalRef = ref<HTMLElement>();

function getLogClass(type: TerminalLog["type"]) {
  const classes = {
    info: "text-blue-600",
    success: "text-green-600",
    warning: "text-amber-600",
    error: "text-red-600",
  };
  return classes[type];
}

// 自动滚动到底部
watch(
  () => terminalStore.logs.length,
  () => {
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
      }
    });
  }
);
</script>
