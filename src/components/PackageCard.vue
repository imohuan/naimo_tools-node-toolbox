<template>
  <div
    class="p-3 bg-white border-2 rounded-lg hover:shadow transition-all group"
    :class="[
      variant === 'recommended'
        ? 'bg-gradient-to-br from-white to-indigo-50/30 border-indigo-200 hover:border-indigo-400'
        : variant === 'search' && 'installed' in data && data.installed
        ? 'border-green-200 bg-green-50/30'
        : 'border-gray-200 hover:border-indigo-400',
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <!-- 标题行 -->
        <div class="flex items-center gap-1.5 mb-1">
          <h4 class="text-sm font-semibold text-gray-900 truncate">
            {{
              ("displayName" in data ? data.displayName : undefined) ||
              data.name
            }}
          </h4>

          <!-- 徽章 -->
          <span
            v-if="'recommended' in data && data.recommended"
            class="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0"
          >
            推荐
          </span>
          <span
            v-else-if="
              'installed' in data && data.installed && variant === 'search'
            "
            class="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0"
          >
            已安装
          </span>
          <span
            v-else-if="
              'category' in data && data.category && variant === 'recommended'
            "
            class="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0"
          >
            {{ data.category }}
          </span>
        </div>

        <!-- 描述 -->
        <p
          v-if="data.description"
          class="text-xs text-gray-600 mb-1.5 leading-tight"
          :class="variant === 'search' ? 'line-clamp-2' : 'line-clamp-1'"
        >
          {{ data.description }}
        </p>

        <!-- 标签信息（横向布局） -->
        <div class="flex items-center gap-1.5 text-xs flex-wrap">
          <!-- 版本信息 - 蓝色 -->
          <span
            v-if="
              ('currentVersion' in data && data.currentVersion) ||
              ('version' in data && data.version)
            "
            class="px-1.5 py-0.5 font-mono text-blue-700 bg-blue-50 rounded border border-blue-200"
          >
            {{
              "currentVersion" in data && data.currentVersion
                ? data.currentVersion
                : "version" in data && data.version
                ? `v${data.version}`
                : ""
            }}
          </span>

          <!-- 更新提示 -->
          <template
            v-if="
              'hasUpdate' in data &&
              data.hasUpdate &&
              'latestVersion' in data &&
              data.latestVersion
            "
          >
            <span class="flex items-center gap-0.5 text-amber-600 font-medium">
              <span>→</span>
              <span
                class="px-1.5 py-0.5 font-mono bg-amber-50 rounded border border-amber-200"
                >{{ data.latestVersion }}</span
              >
            </span>
            <span
              class="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full"
            >
              可更新
            </span>
          </template>
          <span
            v-else-if="
              'latestVersion' in data &&
              data.latestVersion &&
              'hasUpdate' in data &&
              !data.hasUpdate
            "
            class="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full"
          >
            最新
          </span>

          <!-- 作者信息（搜索结果） - 灰色 -->
          <span
            v-if="'author' in data && data.author && variant === 'search'"
            class="px-1.5 py-0.5 text-gray-600 bg-gray-100 rounded"
          >
            {{ data.author }}
          </span>

          <!-- 关键词（搜索结果） - 灰色，横向布局 -->
          <template
            v-if="
              'keywords' in data &&
              data.keywords &&
              data.keywords.length > 0 &&
              variant === 'search'
            "
          >
            <span
              v-for="keyword in data.keywords.slice(0, 3)"
              :key="keyword"
              class="px-1.5 py-0.5 text-gray-600 bg-gray-100 rounded"
            >
              {{ keyword }}
            </span>
          </template>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div
        class="flex items-center gap-1 transition-opacity flex-shrink-0"
        :class="
          operation?.updating ||
          operation?.uninstalling ||
          operation?.installing
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        "
      >
        <!-- 打开链接按钮 -->
        <button
          @click="$emit('open-link', data.name)"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105"
          :class="
            variant === 'recommended'
              ? 'text-indigo-600 hover:bg-indigo-100'
              : 'text-indigo-600 hover:bg-indigo-50'
          "
          title="打开 npm 页面"
        >
          <Icon name="link" size="xs" />
        </button>

        <!-- 更新按钮（仅已安装且有更新） -->
        <button
          v-if="
            'hasUpdate' in data && data.hasUpdate && variant === 'installed'
          "
          @click="$emit('update', data.name)"
          :disabled="operation?.updating || operation?.uninstalling"
          class="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="更新"
        >
          <Icon v-if="!operation?.updating" name="upload" size="xs" />
          <div
            v-else
            class="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"
          ></div>
        </button>

        <!-- 安装按钮（未安装） -->
        <button
          v-if="
            variant === 'recommended' ||
            (variant === 'search' &&
              (!('installed' in data) || !data.installed))
          "
          @click="$emit('install', data.name)"
          :disabled="
            operation?.installing ||
            operation?.updating ||
            operation?.uninstalling
          "
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          :class="
            variant === 'recommended'
              ? 'text-indigo-600 hover:bg-indigo-100'
              : 'text-green-600 hover:bg-green-50'
          "
          title="安装"
        >
          <Icon v-if="!operation?.installing" name="download" size="xs" />
          <div
            v-else
            class="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
            :class="
              variant === 'recommended'
                ? 'border-indigo-600'
                : 'border-green-600'
            "
          ></div>
        </button>

        <!-- 已安装版本提示（搜索结果中已安装的包） -->
        <span
          v-else-if="
            variant === 'search' &&
            'installed' in data &&
            data.installed &&
            'currentVersion' in data &&
            data.currentVersion
          "
          class="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded"
        >
          v{{ data.currentVersion }}
        </span>

        <!-- 卸载按钮（仅已安装） -->
        <button
          v-if="variant === 'installed'"
          @click="$emit('uninstall', data.name)"
          :disabled="operation?.updating || operation?.uninstalling"
          class="w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="卸载"
        >
          <Icon v-if="!operation?.uninstalling" name="trash" size="xs" />
          <div
            v-else
            class="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
          ></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GlobalPackage, RecommendedTool, SearchPackage } from "../types";
import Icon from "./Icon.vue";

interface Props {
  data: GlobalPackage | RecommendedTool | SearchPackage;
  variant?: "installed" | "recommended" | "search";
  operation?: {
    installing: boolean;
    updating: boolean;
    uninstalling: boolean;
  };
}

withDefaults(defineProps<Props>(), {
  variant: "installed",
});

defineEmits<{
  install: [name: string];
  update: [name: string];
  uninstall: [name: string];
  "open-link": [name: string];
}>();
</script>
