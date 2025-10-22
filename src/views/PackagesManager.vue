<template>
  <div class="w-full h-full overflow-y-auto">
    <!-- Teleport 到顶部的自定义区域 -->
    <Teleport to="#tab-actions">
      <template v-if="route.path === '/packages'">
        <div class="flex items-center gap-2">
          <button
            @click="refresh"
            :disabled="packagesStore.isLoading"
            class="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新"
          >
            <Icon
              name="refresh"
              size="sm"
              :class="{ 'animate-spin': packagesStore.isLoading }"
            />
          </button>
          <button
            v-if="packagesStore.updatableCount > 0 && activeTab === 'updates'"
            @click="updateAll"
            :disabled="packagesStore.isUpdating"
            class="px-3 h-8 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="批量更新"
          >
            <Icon name="refresh" size="xs" />
            批量更新 ({{ packagesStore.updatableCount }})
          </button>
        </div>

        <!-- 包管理器切换按钮组 -->
        <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            v-for="manager in packageManagers"
            :key="manager.value"
            @click="currentPackageManager = manager.value as PackageManager"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
              currentPackageManager === manager.value
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ]"
            :title="manager.label"
          >
            <!-- <Icon :name="manager.icon" size="xs" /> -->
            {{ manager.label.toUpperCase() }}
          </button>
        </div>
      </template>
    </Teleport>

    <div class="p-4">
      <div class="max-w-6xl mx-auto">
        <!-- 标签页导航 -->
        <div class="flex items-center gap-2 mb-4 border-b border-gray-200">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key as typeof activeTab"
            class="px-4 py-2 text-sm font-medium transition-all relative"
            :class="
              activeTab === tab.key
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            "
          >
            {{ tab.label }}
            <span
              v-if="tab.count !== undefined"
              class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
              :class="
                activeTab === tab.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              "
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- 搜索区域（仅在搜索标签页显示） -->
        <div v-if="activeTab === 'search'" class="mb-4">
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                v-model="searchKeyword"
                @keyup.enter="handleSearch"
                type="text"
                :placeholder="`搜索 NPM 包...`"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                v-if="searchKeyword"
                @click="clearSearch"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon name="close" size="xs" />
              </button>
            </div>
            <Button
              @click="handleSearch"
              :loading="packagesStore.isSearching"
              :disabled="!searchKeyword.trim()"
            >
              <Icon v-if="!packagesStore.isSearching" name="search" size="xs" />
              搜索
            </Button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            输入包名关键词进行搜索，例如：vue, react, typescript
          </p>
        </div>

        <!-- 加载状态 -->
        <div
          v-if="
            packagesStore.isLoading &&
            packagesStore.installedPackages.length === 0
          "
          class="text-center py-12"
        >
          <Loading text="正在扫描全局包..." />
        </div>

        <!-- 内容区域 -->
        <div v-else class="space-y-4">
          <!-- 已安装标签页 -->
          <div v-if="activeTab === 'installed'">
            <div
              v-if="packagesStore.installedPackages.length === 0"
              class="text-center py-12"
            >
              <p class="text-gray-500 mb-4">未检测到全局安装的包</p>
              <Button @click="refresh" :loading="packagesStore.isLoading">
                <Icon
                  v-if="!packagesStore.isLoading"
                  name="refresh"
                  size="sm"
                />
                重新扫描
              </Button>
            </div>
            <div v-else>
              <div
                v-for="(packages, category) in packagesStore.packagesByCategory"
                :key="category"
              >
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="text-sm font-bold text-gray-900">
                    {{ category }}
                  </h3>
                  <span class="text-xs text-gray-500"
                    >({{ packages.length }})</span
                  >
                </div>
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <PackageCard
                    v-for="pkg in packages"
                    :key="pkg.name"
                    :data="pkg"
                    variant="installed"
                    :operation="packageOperations[pkg.name]"
                    @update="updatePackage"
                    @uninstall="uninstallPackage"
                    @open-link="openPackageLink"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 待更新标签页 -->
          <div v-if="activeTab === 'updates'">
            <div
              v-if="updatablePackages.length === 0"
              class="text-center py-12"
            >
              <p class="text-gray-500">所有包都是最新版本</p>
            </div>
            <div v-else class="grid grid-cols-2 gap-3">
              <PackageCard
                v-for="pkg in updatablePackages"
                :key="pkg.name"
                :data="pkg"
                variant="installed"
                :operation="packageOperations[pkg.name]"
                @update="updatePackage"
                @uninstall="uninstallPackage"
                @open-link="openPackageLink"
              />
            </div>
          </div>

          <!-- 推荐工具标签页 -->
          <div v-if="activeTab === 'recommended'">
            <div
              v-if="packagesStore.uninstalledRecommendations.length === 0"
              class="text-center py-12"
            >
              <p class="text-gray-500">所有推荐工具都已安装</p>
            </div>
            <div v-else>
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm text-gray-600">以下是推荐的开发工具包</p>
                <Button size="sm" @click="installRecommended">
                  批量安装推荐工具
                </Button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <PackageCard
                  v-for="tool in packagesStore.uninstalledRecommendations"
                  :key="tool.name"
                  :data="tool"
                  variant="recommended"
                  :operation="packageOperations[tool.name]"
                  @install="installPackage"
                  @open-link="openPackageLink"
                />
              </div>
            </div>
          </div>

          <!-- 搜索结果标签页 -->
          <div v-if="activeTab === 'search'">
            <div v-if="packagesStore.isSearching" class="text-center py-12">
              <Loading text="正在搜索..." />
            </div>
            <div
              v-else-if="
                searchKeyword && packagesStore.searchResults.length === 0
              "
              class="text-center py-12"
            >
              <p class="text-gray-500">未找到相关包</p>
            </div>
            <div
              v-else-if="packagesStore.searchResults.length > 0"
              class="grid grid-cols-2 gap-3"
            >
              <PackageCard
                v-for="pkg in packagesStore.searchResults"
                :key="pkg.name"
                :data="pkg"
                variant="search"
                :operation="packageOperations[pkg.name]"
                @install="installPackage"
                @open-link="openPackageLink"
              />
            </div>
            <div v-else class="text-center py-12">
              <p class="text-gray-500">输入关键词搜索</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { useRoute } from "vue-router";
import { usePackagesStore } from "../stores/packages";
import { useTerminalStore } from "../stores/terminal";
import Button from "../components/Button.vue";
import Loading from "../components/Loading.vue";
import Icon from "../components/Icon.vue";
import PackageCard from "../components/PackageCard.vue";

type PackageManager = "npm" | "pnpm" | "yarn";

const route = useRoute();
const packagesStore = usePackagesStore();
const terminalStore = useTerminalStore();

// 当前激活的标签页
const activeTab = ref<"installed" | "updates" | "recommended" | "search">(
  "installed"
);

// 当前选择的包管理器
const currentPackageManager = ref<PackageManager>("npm");

// 搜索关键词
const searchKeyword = ref("");

// 包管理器选项
const packageManagers = [
  { label: "npm", value: "npm", icon: "npm" },
  { label: "pnpm", value: "pnpm", icon: "pnpm" },
  { label: "yarn", value: "yarn", icon: "yarn" },
];

// 跟踪每个包的操作状态
const packageOperations = reactive<
  Record<
    string,
    { installing: boolean; updating: boolean; uninstalling: boolean }
  >
>({});

// 标签页配置
const tabs = computed(() => [
  {
    key: "installed",
    label: "已安装",
    count: packagesStore.installedPackages.length,
  },
  {
    key: "updates",
    label: "待更新",
    count: packagesStore.updatableCount,
  },
  {
    key: "recommended",
    label: "推荐工具",
    count: packagesStore.uninstalledRecommendations.length,
  },
  {
    key: "search",
    label: "搜索包",
  },
]);

// 可更新的包列表
const updatablePackages = computed(() => {
  return packagesStore.installedPackages.filter((pkg) => pkg.hasUpdate);
});

async function refresh() {
  terminalStore.info(
    `正在扫描全局包 (${currentPackageManager.value.toUpperCase()})...`
  );
  await packagesStore.fetchInstalledPackages(currentPackageManager.value);
  terminalStore.success(
    `扫描完成，找到 ${packagesStore.installedPackages.length} 个包`
  );
}

async function installPackage(name: string) {
  if (!packageOperations[name]) {
    packageOperations[name] = {
      installing: false,
      updating: false,
      uninstalling: false,
    };
  }

  packageOperations[name].installing = true;
  try {
    terminalStore.info(
      `正在安装 ${name} (${currentPackageManager.value.toUpperCase()})...`
    );
    await packagesStore.installPackage(name, currentPackageManager.value);
    terminalStore.success(`${name} 安装成功`);

    // 如果在搜索页面，重新搜索以更新安装状态
    if (activeTab.value === "search" && searchKeyword.value) {
      await packagesStore.searchPackages(
        searchKeyword.value,
        currentPackageManager.value
      );
    }
  } catch (error: any) {
    terminalStore.error(`安装失败: ${error.message}`);
  } finally {
    packageOperations[name].installing = false;
  }
}

async function updatePackage(name: string) {
  if (!packageOperations[name]) {
    packageOperations[name] = {
      installing: false,
      updating: false,
      uninstalling: false,
    };
  }

  packageOperations[name].updating = true;
  try {
    terminalStore.info(
      `正在更新 ${name} (${currentPackageManager.value.toUpperCase()})...`
    );
    await packagesStore.updatePackage(name, currentPackageManager.value);
    terminalStore.success(`${name} 更新成功`);
  } catch (error: any) {
    terminalStore.error(`更新失败: ${error.message}`);
  } finally {
    packageOperations[name].updating = false;
  }
}

async function uninstallPackage(name: string) {
  if (confirm(`确定要卸载 ${name} 吗？`)) {
    if (!packageOperations[name]) {
      packageOperations[name] = {
        installing: false,
        updating: false,
        uninstalling: false,
      };
    }

    packageOperations[name].uninstalling = true;
    try {
      terminalStore.info(
        `正在卸载 ${name} (${currentPackageManager.value.toUpperCase()})...`
      );
      await packagesStore.uninstallPackage(name, currentPackageManager.value);
      terminalStore.success(`${name} 卸载成功`);

      // 如果在搜索页面，重新搜索以更新安装状态
      if (activeTab.value === "search" && searchKeyword.value) {
        await packagesStore.searchPackages(
          searchKeyword.value,
          currentPackageManager.value
        );
      }
    } catch (error: any) {
      terminalStore.error(`卸载失败: ${error.message}`);
    } finally {
      packageOperations[name].uninstalling = false;
    }
  }
}

async function updateAll() {
  if (confirm(`确定要更新 ${packagesStore.updatableCount} 个包吗？`)) {
    try {
      terminalStore.info(
        `开始批量更新 ${
          packagesStore.updatableCount
        } 个包 (${currentPackageManager.value.toUpperCase()})...`
      );
      await packagesStore.updateAllPackages(currentPackageManager.value);
      terminalStore.success("批量更新完成");
    } catch (error: any) {
      terminalStore.error(`批量更新失败: ${error.message}`);
    }
  }
}

async function installRecommended() {
  const count = packagesStore.uninstalledRecommendations.length;
  if (confirm(`确定要安装 ${count} 个推荐工具吗？`)) {
    try {
      terminalStore.info(
        `开始批量安装 ${count} 个推荐工具 (${currentPackageManager.value.toUpperCase()})...`
      );
      await packagesStore.installRecommendedTools(currentPackageManager.value);
      terminalStore.success("批量安装完成");
    } catch (error: any) {
      terminalStore.error(`批量安装失败: ${error.message}`);
    }
  }
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) return;

  terminalStore.info(
    `正在搜索: ${
      searchKeyword.value
    } (${currentPackageManager.value.toUpperCase()})`
  );
  await packagesStore.searchPackages(
    searchKeyword.value,
    currentPackageManager.value
  );

  if (packagesStore.searchResults.length > 0) {
    terminalStore.success(
      `找到 ${packagesStore.searchResults.length} 个相关包`
    );
  } else {
    terminalStore.info("未找到相关包");
  }
}

function clearSearch() {
  searchKeyword.value = "";
  packagesStore.clearSearchResults();
}

function openPackageLink(name: string) {
  const url = `https://www.npmjs.com/package/${name}`;
  window.open(url, "_blank");
  terminalStore.info(`已打开 ${name} 的 npm 页面`);
}

onMounted(async () => {
  await refresh();
});
</script>
