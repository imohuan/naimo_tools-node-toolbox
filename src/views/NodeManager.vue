<template>
  <div class="w-full h-full relative tech-bg overflow-hidden">
    <!-- 科技感背景 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- 渐变背景 -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      ></div>

      <!-- 网格背景 -->
      <div
        class="absolute inset-0 opacity-40"
        style="
          background-image: linear-gradient(
              to right,
              #e0e7ff 1px,
              transparent 1px
            ),
            linear-gradient(to bottom, #e0e7ff 1px, transparent 1px);
          background-size: 40px 40px;
        "
      ></div>

      <!-- 动态光效 -->
      <div
        class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
      ></div>
      <div
        class="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"
      ></div>
    </div>

    <div class="w-full h-full overflow-auto relative z-10">
      <div
        class="relative z-10 p-6 min-h-full flex flex-col items-center justify-center"
      >
        <!-- 版本下载按钮组 -->
        <div class="w-full max-w-6xl flex flex-col gap-4">
          <!-- 上方：LTS 和最新版本横向布局 -->
          <div class="flex gap-4">
            <!-- LTS 版本按钮 -->
            <DownloadButton
              v-if="latestLTS"
              :url="nodeStore.getDownloadInfo(latestLTS.version).url"
              :filename="nodeStore.getDownloadInfo(latestLTS.version).filename"
              :version="latestLTS.version"
              :date="latestLTS.date"
              label="长期支持版本"
              badge-text="LTS 推荐"
              variant="lts"
              @download-start="handleDownloadStart"
              @download-complete="handleDownloadComplete"
              @download-error="handleDownloadError"
            >
              <template #icon>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </template>
            </DownloadButton>

            <!-- 最新版本按钮 -->
            <DownloadButton
              v-if="
                latestCurrent && latestCurrent.version !== latestLTS?.version
              "
              :url="nodeStore.getDownloadInfo(latestCurrent.version).url"
              :filename="
                nodeStore.getDownloadInfo(latestCurrent.version).filename
              "
              :version="latestCurrent.version"
              :date="latestCurrent.date"
              label="最新稳定版本"
              badge-text="最新"
              variant="current"
              @download-start="handleDownloadStart"
              @download-complete="handleDownloadComplete"
              @download-error="handleDownloadError"
            >
              <template #icon>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </template>
            </DownloadButton>
          </div>

          <!-- 本地版本信息卡片 -->
          <div
            class="w-full px-6 py-4 bg-white rounded-xl shadow-lg transition-all duration-300 border-2 border-gray-200"
          >
            <div class="flex items-start gap-4">
              <!-- 左侧图标 -->
              <div
                class="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <svg
                  class="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <!-- 右侧信息 -->
              <div class="flex-1">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500">本地安装版本</span>
                    <span
                      class="px-2 py-0.5 bg-gray-500 text-white text-xs font-bold rounded"
                    >
                      本地
                    </span>
                    <span
                      v-if="!nodeStore.nodeInfo.hasUpdate"
                      class="px-2.5 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      已是最新
                    </span>
                    <span
                      v-else
                      class="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      有新版本
                    </span>
                  </div>

                  <!-- 刷新按钮 -->
                  <button
                    @click="refreshNodeInfo"
                    :disabled="isRefreshing"
                    class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors group disabled:cursor-not-allowed disabled:opacity-50"
                    title="刷新版本信息"
                  >
                    <svg
                      v-if="!isRefreshing"
                      class="w-4 h-4 text-gray-500 group-hover:text-indigo-600 group-hover:rotate-180 transition-all duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <svg
                      v-else
                      class="w-4 h-4 text-indigo-600 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>

                <!-- 版本信息列表 -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">Node.js</span>
                    <span class="text-sm font-mono font-bold text-gray-900">
                      {{ nodeStore.nodeInfo.nodeVersion || "未安装" }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">npm</span>
                    <span class="text-sm font-mono font-bold text-gray-900">
                      {{ nodeStore.nodeInfo.npmVersion || "未安装" }}
                    </span>
                  </div>

                  <div class="pt-2 border-t border-gray-100">
                    <p class="text-xs text-gray-500 mb-1">安装路径</p>
                    <p class="text-xs font-mono text-gray-700 break-all">
                      {{ nodeStore.nodeInfo.nodePath || "未知" }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useNodeStore } from "../stores/node";
import { useTerminalStore } from "../stores/terminal";
import DownloadButton from "../components/DownloadButton.vue";

const nodeStore = useNodeStore();
const terminalStore = useTerminalStore();
const isRefreshing = ref(false);

const latestLTS = computed(() => {
  return nodeStore.versions.find((v) => v.lts);
});

const latestCurrent = computed(() => {
  return nodeStore.versions[0];
});

async function refreshNodeInfo() {
  isRefreshing.value = true;
  terminalStore.info("正在检测 Node 环境...");
  await nodeStore.fetchNodeInfo();
  terminalStore.success("环境检测完成");
  isRefreshing.value = false;
}

async function loadVersions() {
  terminalStore.info("正在获取 Node.js 版本列表...");
  await nodeStore.fetchVersions();
  terminalStore.success(`已加载 ${nodeStore.versions.length} 个版本`);
}

function handleDownloadStart(version: string) {
  terminalStore.info(`开始下载 ${version}...`);
}

function handleDownloadComplete(filePath: string) {
  terminalStore.success(`下载完成：${filePath}`);
}

function handleDownloadError(error: string) {
  terminalStore.error(`下载失败：${error}`);
}

onMounted(async () => {
  await refreshNodeInfo();
  await loadVersions();
});
</script>

<style scoped>
@keyframes blob {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
