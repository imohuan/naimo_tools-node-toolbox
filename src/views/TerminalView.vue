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

  <div class="w-full h-full flex flex-col bg-white">
    <!-- 日志内容 -->
    <div
      ref="terminalRef"
      class="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-xs"
    >
      <!-- 统一的日志流 -->
      <template v-for="(log, index) in terminalStore.logs" :key="index">
        <!-- 普通日志 -->
        <div
          v-if="log.type !== 'command-group'"
          class="flex items-start gap-3"
          :class="getLogClass(log.type)"
        >
          <span class="opacity-60 flex-shrink-0 text-gray-500 select-none">
            {{ log.time }}
          </span>
          <span class="flex-1 break-all whitespace-pre-wrap">
            {{ log.message }}
          </span>
        </div>

        <!-- 命令组日志（可折叠） -->
        <div v-else class="my-1 bg-gray-100 rounded">
          <!-- 命令行头部 - 可点击折叠/展开 -->
          <div
            @click="
              log.commandLogs && log.commandLogs.length > 5
                ? terminalStore.toggleCommandCollapse(log.commandId!)
                : null
            "
            class="flex items-start gap-3 py-1 transition-colors sticky z-20"
            :class="[
              getCommandHeaderClass(log.status!),
              log.commandLogs && log.commandLogs.length > 5
                ? 'cursor-pointer'
                : '',
            ]"
            style="top: -1rem"
          >
            <span class="opacity-60 flex-shrink-0 text-gray-500 select-none">
              {{ log.time }}
            </span>

            <!-- 折叠图标 - 仅在内容超过5行时显示 -->
            <svg
              v-if="log.commandLogs && log.commandLogs.length > 5"
              class="w-3 h-3 flex-shrink-0 transition-transform mt-0.5 text-gray-600"
              :class="log.collapsed ? '' : 'rotate-90'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M9 5l7 7-7 7"
              />
            </svg>

            <!-- 状态图标 -->
            <span class="flex-shrink-0">
              <!-- 运行中 -->
              <svg
                v-if="log.status === 'running'"
                class="w-3.5 h-3.5 text-blue-600 animate-spin inline-block mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="3"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <!-- 成功 -->
              <span
                v-else-if="log.status === 'success'"
                class="text-green-600 font-bold"
                >✓</span
              >
              <!-- 失败 -->
              <span
                v-else-if="log.status === 'error'"
                class="text-red-600 font-bold"
                >✗</span
              >
            </span>

            <!-- 命令文本 -->
            <span class="flex-1 font-semibold text-gray-800">
              {{ log.command }}
              <span
                v-if="log.exitCode !== undefined"
                class="text-gray-500 font-normal text-xs ml-2"
              >
                (退出码: {{ log.exitCode }})
              </span>
              <span
                v-if="log.commandLogs && log.commandLogs.length > 5"
                class="text-gray-400 font-normal text-xs ml-2"
              >
                {{ log.commandLogs.length }} 行
              </span>
            </span>
          </div>

          <!-- 命令日志内容 -->
          <div v-if="log.commandLogs && log.commandLogs.length > 0">
            <div class="py-0.5 space-y-0.5">
              <!-- 内容少于等于5行时直接全部显示 -->
              <template v-if="log.commandLogs.length <= 5">
                <div
                  v-for="(cmdLog, cmdIndex) in log.commandLogs"
                  :key="`cmd-${cmdIndex}`"
                  class="flex items-start gap-3"
                  :class="getLogClass(cmdLog.type)"
                >
                  <span
                    class="opacity-60 flex-shrink-0 text-gray-500 select-none"
                  >
                    {{ cmdLog.time }}
                  </span>
                  <span class="flex-1 break-all whitespace-pre-wrap">
                    {{ cmdLog.message }}
                  </span>
                </div>
              </template>

              <!-- 内容超过5行时支持折叠 -->
              <template v-else>
                <!-- 折叠时只显示最后5行 -->
                <template v-if="log.collapsed">
                  <div
                    v-for="(cmdLog, cmdIndex) in getLastFewLogs(
                      log.commandLogs,
                      5
                    )"
                    :key="`cmd-${cmdIndex}`"
                    class="flex items-start gap-3"
                    :class="getLogClass(cmdLog.type)"
                  >
                    <span
                      class="opacity-60 flex-shrink-0 text-gray-500 select-none"
                    >
                      {{ cmdLog.time }}
                    </span>
                    <span class="flex-1 break-all whitespace-pre-wrap">
                      {{ cmdLog.message }}
                    </span>
                  </div>
                </template>

                <!-- 展开时显示全部 -->
                <template v-else>
                  <div
                    v-for="(cmdLog, cmdIndex) in log.commandLogs"
                    :key="`cmd-${cmdIndex}`"
                    class="flex items-start gap-3"
                    :class="getLogClass(cmdLog.type)"
                  >
                    <span
                      class="opacity-60 flex-shrink-0 text-gray-500 select-none"
                    >
                      {{ cmdLog.time }}
                    </span>
                    <span class="flex-1 break-all whitespace-pre-wrap">
                      {{ cmdLog.message }}
                    </span>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div
        v-if="terminalStore.logs.length === 0"
        class="text-gray-400 text-center py-20"
      >
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-sm">暂无日志</p>
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

function getLogClass(type: string) {
  const classes: Record<string, string> = {
    info: "text-gray-700",
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600",
    "command-group": "text-blue-700",
  };
  return classes[type] || "text-gray-700";
}

function getCommandHeaderClass(status: string) {
  const classes: Record<string, string> = {
    running: "bg-blue-50 hover:bg-blue-100",
    success: "bg-emerald-50 hover:bg-emerald-100",
    error: "bg-rose-50 hover:bg-rose-100",
  };
  return classes[status] || "bg-gray-100 hover:bg-gray-150";
}

function getLastFewLogs(logs: TerminalLog["commandLogs"], count: number) {
  if (!logs) return [];
  return logs.slice(-count);
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
  },
  { deep: true }
);
</script>
