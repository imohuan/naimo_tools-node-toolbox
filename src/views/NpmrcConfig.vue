<template>
  <div class="w-full h-full flex flex-col">
    <!-- Teleport 到顶部的自定义区域 -->
    <Teleport to="#tab-actions">
      <template v-if="route.path === '/npmrc'">
        <!-- 方案选择 -->
        <div class="flex items-center gap-2 border-r border-gray-200 pr-4">
          <span class="text-xs text-gray-600 font-medium">方案</span>
          <Select
            v-model="currentPreset"
            :options="presetOptions"
            @update:modelValue="applyPreset"
            size="sm"
          />
        </div>

        <!-- 显示过滤按钮 -->
        <div class="flex items-center border-r border-gray-200 pr-4">
          <button
            @click="showOnlyConfigured = !showOnlyConfigured"
            :class="[
              'px-2.5 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5',
              showOnlyConfigured
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
            :title="showOnlyConfigured ? '显示所有配置项' : '只显示已配置项'"
          >
            <svg
              v-if="showOnlyConfigured"
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <svg
              v-else
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>{{ showOnlyConfigured ? "已配置" : "全部" }}</span>
          </button>
        </div>

        <!-- 视图切换按钮组 -->
        <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            @click="viewMode = mode.value as ViewMode"
            :class="[
              'w-8 h-8 flex items-center justify-center rounded-md transition-all',
              viewMode === mode.value
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ]"
            :title="mode.label"
          >
            <Icon :name="mode.icon" size="sm" />
          </button>
        </div>
      </template>
    </Teleport>

    <!-- 主内容区 -->
    <div class="flex-1 flex min-h-0">
      <!-- 配置编辑区 -->
      <div
        v-show="viewMode === 'dual' || viewMode === 'edit'"
        :class="
          viewMode === 'dual' ? 'w-1/2 border-r border-gray-200' : 'w-full'
        "
        class="overflow-y-auto overflow-x-hidden"
      >
        <div class="p-2 space-y-2">
          <!-- 按分类显示配置项 -->
          <div
            v-for="category in categories"
            :key="category"
            class="border border-gray-200 rounded-lg"
          >
            <!-- 分类标题栏 -->
            <div
              @click="toggleCategory(category)"
              class="flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors select-none sticky top-0 z-10 border-gray-200"
              :class="{
                'border-b': !isCategoryCollapsed(category),
                'rounded-lg': isCategoryCollapsed(category),
                'rounded-t-lg': !isCategoryCollapsed(category),
              }"
            >
              <div class="flex items-center gap-1.5">
                <!-- 展开/折叠箭头 -->
                <div
                  class="text-gray-500 flex-shrink-0 transition-transform duration-200"
                  :class="{
                    'rotate-0': !isCategoryCollapsed(category),
                    '-rotate-90': isCategoryCollapsed(category),
                  }"
                >
                  <Icon name="chevron-down" size="xs" />
                </div>

                <!-- 分类名称 -->
                <span class="text-xs font-semibold text-gray-700">{{
                  category
                }}</span>

                <!-- 配置项数量 -->
                <span class="text-xs text-gray-400">
                  ({{ getFieldsByCategory(category).length }})
                </span>
              </div>
            </div>

            <!-- 分类内容 -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-[2000px] opacity-100"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="max-h-[2000px] opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <div
                v-show="!isCategoryCollapsed(category)"
                class="bg-white border-0"
              >
                <div class="p-2 space-y-1">
                  <div
                    v-for="field in getFieldsByCategory(category)"
                    :key="field.key"
                    class="flex flex-col gap-1 py-1.5 px-2 hover:bg-gray-50 rounded transition-all group"
                  >
                    <!-- 第一层：左右布局（标题 + 组件） -->
                    <div class="flex items-center gap-2">
                      <!-- 左侧标题 -->
                      <label
                        class="w-36 flex-shrink-0 text-xs font-medium text-gray-700 truncate"
                        :title="field.label"
                      >
                        {{ field.label }}
                      </label>

                      <!-- 右侧组件 -->
                      <div
                        class="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden"
                      >
                        <!-- 带下拉的输入框（用于镜像源等） -->
                        <Combobox
                          v-if="field.type === 'text' && field.options"
                          v-model="config[field.key]"
                          :options="getComboboxOptions(field)"
                          :placeholder="field.placeholder"
                          class="flex-1"
                        />

                        <!-- 纯文本输入 -->
                        <input
                          v-else-if="field.type === 'text'"
                          v-model="config[field.key]"
                          type="text"
                          class="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition-all min-w-0"
                          :placeholder="field.placeholder"
                        />

                        <!-- 下拉选择 -->
                        <Select
                          v-else-if="field.type === 'select'"
                          v-model="config[field.key]"
                          :options="[
                            { label: '不设置', value: '' },
                            ...(field.options || []),
                          ]"
                          size="sm"
                          class="flex-1"
                        />

                        <!-- 布尔值 -->
                        <label
                          v-else-if="field.type === 'boolean'"
                          class="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            v-model="config[field.key]"
                            type="checkbox"
                            class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <span class="text-xs text-gray-700">启用</span>
                        </label>

                        <!-- 打开文件夹按钮（仅针对路径类型） -->
                        <button
                          v-if="
                            field.type === 'text' &&
                            (['prefix', 'cache'].includes(field.key) ||
                              field.key.endsWith('-dir'))
                          "
                          @click="selectFolder(field.key)"
                          class="w-5 h-5 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                          title="选择文件夹"
                        >
                          <Icon name="folder" size="xs" />
                        </button>

                        <!-- 删除按钮 -->
                        <button
                          v-if="
                            config[field.key] !== undefined &&
                            config[field.key] !== ''
                          "
                          @click="delete config[field.key]"
                          class="w-5 h-5 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                          title="清除此项"
                        >
                          <Icon name="x" size="xs" />
                        </button>
                      </div>
                    </div>

                    <!-- 第二层：描述 -->
                    <p
                      class="text-xs text-gray-400 leading-tight pl-0"
                      :title="field.description"
                    >
                      {{ field.description }}
                    </p>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- 预览区 -->
      <div
        v-show="viewMode === 'dual' || viewMode === 'preview'"
        :class="viewMode === 'dual' ? 'w-1/2' : 'w-full'"
        class="flex flex-col overflow-hidden"
      >
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <!-- 生成的配置 -->
          <div
            class="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200"
          >
            <!-- 头部 -->
            <div
              class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200"
            >
              <span class="text-xs text-gray-700 font-mono font-semibold"
                >.npmrc</span
              >
              <div class="flex gap-1.5">
                <button
                  @click="copyToClipboard"
                  :disabled="copyStatus === 'copying'"
                  :class="[
                    'w-6 h-6 flex items-center justify-center rounded transition-all',
                    copyStatus === 'copying'
                      ? 'text-indigo-400 cursor-not-allowed'
                      : copyStatus === 'success'
                      ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      : copyStatus === 'error'
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50',
                  ]"
                  :title="
                    copyStatus === 'copying'
                      ? '复制中...'
                      : copyStatus === 'success'
                      ? '复制成功'
                      : copyStatus === 'error'
                      ? '复制失败'
                      : '复制'
                  "
                >
                  <Icon
                    :name="
                      copyStatus === 'copying'
                        ? 'refresh'
                        : copyStatus === 'success'
                        ? 'check'
                        : copyStatus === 'error'
                        ? 'x'
                        : 'copy'
                    "
                    size="xs"
                    :class="{ 'animate-spin': copyStatus === 'copying' }"
                  />
                </button>
                <button
                  @click="applyToGlobal"
                  class="w-6 h-6 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded transition-all"
                  title="应用到全局"
                >
                  <Icon name="save" size="xs" />
                </button>
              </div>
            </div>

            <!-- 内容 -->
            <textarea
              v-model="editableNpmrc"
              spellcheck="false"
              class="w-full p-3 text-xs text-gray-800 font-mono leading-relaxed bg-white resize-none focus:outline-none min-h-[300px]"
              placeholder="# 在此编辑 .npmrc 配置"
            ></textarea>
          </div>

          <!-- 当前系统配置对比 -->
          <div
            class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
          >
            <div class="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span class="text-xs font-semibold text-gray-700"
                >当前系统 .npmrc</span
              >
            </div>
            <pre
              v-if="currentNpmrcContent"
              class="p-3 text-xs text-gray-700 font-mono leading-relaxed max-h-96 overflow-auto select-text"
              >{{ currentNpmrcContent }}</pre
            >
            <div v-else class="p-3 text-xs text-gray-500 text-center">
              未找到配置文件
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { npmrcFields, presetConfigs } from "../data/npmrc-fields";
import { useTerminalStore } from "../stores/terminal";
import Select from "../components/Select.vue";
import Combobox from "../components/Combobox.vue";
import Icon from "../components/Icon.vue";

type ViewMode = "dual" | "edit" | "preview";

const route = useRoute();
const terminalStore = useTerminalStore();
const collapsedCategories = ref<Set<string>>(new Set());

const viewMode = ref<ViewMode>("dual");
const currentPreset = ref("current");
const config = reactive<Record<string, any>>({});
const currentNpmrcContent = ref("");
const editableNpmrc = ref("");
const showOnlyConfigured = ref(false);
const isParsingFromText = ref(false); // 防止循环更新的标志
const copyStatus = ref<"idle" | "copying" | "success" | "error">("idle"); // 复制状态

const viewModes = [
  { label: "双屏", value: "dual", icon: "layout-split" },
  { label: "编辑", value: "edit", icon: "edit" },
  { label: "预览", value: "preview", icon: "eye" },
];

const presetOptions = [
  { label: "当前全局配置", value: "current" },
  { label: "淘宝镜像", value: "taobao" },
  { label: "Electron 专用", value: "electron" },
  { label: "官方源", value: "official" },
  { label: "PNPM配置", value: "pnpm" },
];

const categories = computed(() => {
  const cats = new Set<string>();
  npmrcFields.forEach((field) => cats.add(field.category));
  const allCategories = Array.from(cats);

  // 如果开启了"只显示已配置"，过滤掉没有配置项的分类
  if (showOnlyConfigured.value) {
    return allCategories.filter((category) => {
      return getFieldsByCategory(category).length > 0;
    });
  }

  return allCategories;
});

function getFieldsByCategory(category: string) {
  const fields = npmrcFields.filter((field) => field.category === category);

  if (showOnlyConfigured.value) {
    return fields.filter((field) => {
      const value = config[field.key];
      return value !== undefined && value !== null && value !== "";
    });
  }

  return fields;
}

function toggleCategory(category: string) {
  if (collapsedCategories.value.has(category)) {
    collapsedCategories.value.delete(category);
  } else {
    collapsedCategories.value.add(category);
  }
}

function isCategoryCollapsed(category: string) {
  return collapsedCategories.value.has(category);
}

// 获取配置项的组件选项（用于 Combobox）
function getComboboxOptions(field: any) {
  if (!field.options) return [];
  return field.options;
}

// 变量替换函数
function resolveVariables(
  value: string,
  context: Record<string, any>,
  visited = new Set<string>()
): string {
  if (typeof value !== "string") return value;

  // 匹配 {{变量名}} 的正则表达式
  return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    // 防止循环引用
    if (visited.has(varName)) {
      return match; // 保持原样
    }

    if (
      context[varName] !== undefined &&
      context[varName] !== null &&
      context[varName] !== ""
    ) {
      visited.add(varName);
      const resolved = resolveVariables(
        String(context[varName]),
        context,
        new Set(visited)
      );
      visited.delete(varName);
      return resolved;
    }

    return match; // 如果变量不存在，保持原样
  });
}

const generatedNpmrc = computed(() => {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null || value === "") continue;

    let finalValue = value;

    // 如果是字符串，进行变量替换
    if (typeof value === "string") {
      finalValue = resolveVariables(value, config);
    }

    if (typeof finalValue === "boolean") {
      lines.push(`${key}=${finalValue}`);
    } else {
      lines.push(`${key}=${finalValue}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "# 暂无配置";
});

// 监听配置变化，同步到可编辑文本框
watch(
  generatedNpmrc,
  (newValue) => {
    if (!isParsingFromText.value) {
      editableNpmrc.value = newValue;
    }
  },
  { immediate: true }
);

// 解析文本内容到配置对象
function parseNpmrcText(text: string) {
  if (!text || text.trim() === "" || text === "# 暂无配置") {
    return;
  }

  isParsingFromText.value = true;

  try {
    const lines = text.split("\n");
    const newConfig: Record<string, any> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
        continue;
      }

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();

        // 查找对应的字段定义
        const field = npmrcFields.find((f) => f.key === key);
        if (field) {
          if (field.type === "boolean") {
            newConfig[key] = value === "true";
          } else {
            newConfig[key] = value;
          }
        } else {
          // 即使没有定义的字段，也保存下来
          newConfig[key] = value;
        }
      }
    }

    // 清空现有配置并应用新配置
    Object.keys(config).forEach((key) => delete config[key]);
    Object.assign(config, newConfig);
  } finally {
    // 使用 nextTick 确保在下一个事件循环中重置标志
    setTimeout(() => {
      isParsingFromText.value = false;
    }, 0);
  }
}

// 防抖监听可编辑文本框的变化
let parseTimer: number | null = null;
watch(editableNpmrc, (newValue) => {
  if (isParsingFromText.value) {
    return;
  }

  // 防抖处理
  if (parseTimer) {
    clearTimeout(parseTimer);
  }

  parseTimer = window.setTimeout(() => {
    parseNpmrcText(newValue);
  }, 500); // 500ms 防抖
});

async function applyPreset() {
  if (currentPreset.value === "current") {
    // 加载当前全局配置
    await loadCurrentNpmrc();
    return;
  }

  const preset =
    presetConfigs[currentPreset.value as keyof typeof presetConfigs];
  if (preset) {
    Object.keys(config).forEach((key) => delete config[key]);
    Object.assign(config, preset);
    terminalStore.success(
      `已应用预设: ${
        presetOptions.find((o) => o.value === currentPreset.value)?.label
      }`
    );
  }
}

async function copyToClipboard() {
  if (copyStatus.value === "copying") return; // 防止重复点击

  copyStatus.value = "copying";

  try {
    await window.naimo.clipboard.writeText(editableNpmrc.value);
    copyStatus.value = "success";
    terminalStore.success("已复制到剪贴板");

    // 2秒后重置状态
    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  } catch (error) {
    copyStatus.value = "error";
    terminalStore.error("复制失败");

    // 2秒后重置状态
    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  }
}

async function refreshCurrentNpmrcContent() {
  try {
    const content = await window.nodeToolboxAPI.readNpmrc();
    currentNpmrcContent.value = content;
  } catch (error) {
    console.error("刷新配置内容失败:", error);
  }
}

async function applyToGlobal() {
  try {
    terminalStore.info("正在备份当前配置...");
    const backupPath = await window.nodeToolboxAPI.backupNpmrc();
    if (backupPath) {
      terminalStore.success(`已备份到: ${backupPath}`);
    }

    terminalStore.info("正在写入全局配置...");
    await window.nodeToolboxAPI.writeNpmrc(editableNpmrc.value);
    terminalStore.success("已应用到全局 .npmrc 文件");

    await refreshCurrentNpmrcContent();
  } catch (error: any) {
    terminalStore.error(`应用失败: ${error.message}`);
  }
}

async function selectFolder(key: string) {
  try {
    const folderPath = await window.nodeToolboxAPI.selectFolder();
    if (folderPath) {
      config[key] = folderPath;
      terminalStore.success(`已选择路径: ${folderPath}`);
    }
  } catch (error: any) {
    terminalStore.error(`选择文件夹失败: ${error.message}`);
  }
}

async function loadCurrentNpmrc() {
  try {
    terminalStore.info("正在读取当前配置...");
    const content = await window.nodeToolboxAPI.readNpmrc();

    currentNpmrcContent.value = content;

    // 清空现有配置
    Object.keys(config).forEach((key) => delete config[key]);

    if (content) {
      const lines = content.split("\n");
      let loadedCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
          continue;
        }

        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();

          const field = npmrcFields.find((f) => f.key === key);
          if (field) {
            if (field.type === "boolean") {
              config[key] = value === "true";
            } else {
              config[key] = value;
            }
            loadedCount++;
          }
        }
      }

      terminalStore.success(`已加载当前全局配置 (${loadedCount} 项)`);
    } else {
      terminalStore.warning("当前没有 .npmrc 配置文件");
    }
  } catch (error) {
    terminalStore.error("读取配置失败");
  }
}

onMounted(() => {
  applyPreset();
  refreshCurrentNpmrcContent();
});

onUnmounted(() => {
  // 清理防抖定时器
  if (parseTimer) {
    clearTimeout(parseTimer);
  }
});
</script>
