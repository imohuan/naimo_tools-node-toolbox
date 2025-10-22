<template>
  <button
    @click="handleDownload"
    :disabled="isDownloading"
    class="group flex-1 px-6 py-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 flex items-center gap-4 relative overflow-hidden"
    :class="buttonClasses"
  >
    <!-- 背景进度条 -->
    <div
      v-if="isDownloading"
      class="absolute inset-0 bg-gradient-to-r opacity-10 transition-all duration-300"
      :class="progressBgClass"
      :style="{ width: progress + '%' }"
    ></div>

    <!-- 左侧图标 -->
    <div
      class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform relative z-10"
      :class="iconClasses"
    >
      <svg
        class="w-6 h-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <slot name="icon">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </slot>
      </svg>
    </div>

    <!-- 右侧文字和标签 -->
    <div class="flex-1 flex items-center justify-between relative z-10">
      <div class="text-left">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm text-gray-500">{{ label }}</span>
          <span
            class="px-2 py-0.5 text-white text-xs font-bold rounded"
            :class="badgeClass"
          >
            {{ isDownloading ? "下载中" : badgeText }}
          </span>
        </div>
        <p class="text-xl font-bold text-gray-900 font-mono">
          {{ version }}
        </p>
        <p v-if="!isDownloading" class="text-xs text-gray-400 mt-0.5">
          {{ date }}
        </p>
        <!-- 下载信息 -->
        <div v-else class="text-xs text-gray-600 mt-1 space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="font-mono">{{ progress.toFixed(1) }}%</span>
            <span class="text-gray-400">•</span>
            <span class="font-mono">{{ formatBytes(downloadRate) }}/s</span>
          </div>
          <div class="text-gray-500">
            {{ formatBytes(bytesReceived) }} / {{ formatBytes(totalBytes) }}
          </div>
        </div>
      </div>

      <!-- 右侧下载图标 -->
      <svg
        v-if="!isDownloading"
        class="w-5 h-5 flex-shrink-0 transition-transform"
        :class="iconColor"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <!-- 加载状态图标 -->
      <svg
        v-else
        class="w-5 h-5 flex-shrink-0 animate-spin"
        :class="iconColor"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="3"
          fill="none"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  url: string;
  filename: string;
  version: string;
  date?: string;
  label?: string;
  badgeText?: string;
  variant?: "lts" | "current";
}

const props = withDefaults(defineProps<Props>(), {
  date: "",
  label: "版本",
  badgeText: "下载",
  variant: "lts",
});

const emit = defineEmits<{
  downloadStart: [version: string];
  downloadComplete: [filePath: string];
  downloadError: [error: string];
}>();

const isDownloading = ref(false);
const progress = ref(0);
const bytesReceived = ref(0);
const totalBytes = ref(0);
const downloadRate = ref(0);
const currentDownloadId = ref("");

const buttonClasses = computed(() => {
  if (isDownloading.value) {
    return "border-blue-400 cursor-wait";
  }
  return props.variant === "lts"
    ? "border-green-200 hover:border-green-400"
    : "border-blue-200 hover:border-blue-400";
});

const iconClasses = computed(() => {
  const base = "bg-gradient-to-br";
  return props.variant === "lts"
    ? `${base} from-green-400 to-emerald-500 group-hover:scale-110`
    : `${base} from-blue-400 to-indigo-500 group-hover:scale-110`;
});

const badgeClass = computed(() => {
  if (isDownloading.value) {
    return "bg-blue-500 animate-pulse";
  }
  return props.variant === "lts" ? "bg-green-500" : "bg-blue-500";
});

const iconColor = computed(() => {
  return props.variant === "lts" ? "text-green-500" : "text-blue-500";
});

const progressBgClass = computed(() => {
  return props.variant === "lts"
    ? "from-green-400 to-emerald-500"
    : "from-blue-400 to-indigo-500";
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function handleDownload() {
  if (isDownloading.value) return;

  isDownloading.value = true;
  progress.value = 0;
  bytesReceived.value = 0;
  totalBytes.value = 0;
  downloadRate.value = 0;
  currentDownloadId.value = "";

  emit("downloadStart", props.version);

  let unsubProgress: (() => void) | null = null;
  let unsubCompleted: (() => void) | null = null;
  let unsubError: (() => void) | null = null;

  const cleanup = () => {
    unsubProgress?.();
    unsubCompleted?.();
    unsubError?.();
    currentDownloadId.value = "";
  };

  try {
    // 先注册监听器，使用 ref 可以访问到最新的 downloadId
    unsubProgress = naimo.download.onDownloadProgress((status) => {
      console.log("Progress event:", currentDownloadId.value, status);
      if (currentDownloadId.value && status.id === currentDownloadId.value) {
        console.log("Updating progress:", status.progress);
        progress.value = status.progress;
        bytesReceived.value = status.bytesReceived;
        totalBytes.value = status.totalBytes;
        downloadRate.value = status.downloadRate;
      }
    });

    unsubCompleted = naimo.download.onDownloadCompleted(async (data) => {
      console.log("Completed event:", currentDownloadId.value, data);
      if (currentDownloadId.value && data.id === currentDownloadId.value) {
        progress.value = 100;
        isDownloading.value = false;

        cleanup();

        // 打开下载的文件
        try {
          await naimo.shell.openPath(data.filePath);
        } catch (err) {
          console.error("打开文件失败:", err);
        }

        emit("downloadComplete", data.filePath);
      }
    });

    unsubError = naimo.download.onDownloadError((data) => {
      console.log("Error event:", currentDownloadId.value, data);
      if (currentDownloadId.value && data.id === currentDownloadId.value) {
        isDownloading.value = false;

        cleanup();

        emit("downloadError", data.error);
      }
    });

    // 开始下载，等待获取 downloadId
    const downloadId = await naimo.download.startDownload({
      url: props.url,
      saveAsFilename: props.filename,
    });

    console.log("Download started with ID:", downloadId);

    // 如果 downloadId 为空，说明下载启动失败
    if (!downloadId) {
      throw new Error("下载启动失败：未获取到下载 ID");
    }

    // 将 downloadId 存储到 ref 中，这样监听器闭包可以访问到
    currentDownloadId.value = downloadId;
  } catch (error) {
    console.error("Download error:", error);
    isDownloading.value = false;
    cleanup();
    emit("downloadError", String(error));
  }
}
</script>
