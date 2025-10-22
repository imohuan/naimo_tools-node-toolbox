import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GlobalPackage, RecommendedTool, SearchPackage } from '../types';
import { hasUpdate } from '../utils/version-compare';

// 推荐工具列表
const recommendedTools: RecommendedTool[] = [
  {
    name: 'pnpm',
    displayName: 'pnpm',
    description: '快速、节省磁盘空间的包管理器',
    category: '包管理器',
  },
  {
    name: 'yarn',
    displayName: 'Yarn',
    description: 'Facebook 开发的包管理器',
    category: '包管理器',
  },
  {
    name: 'rimraf',
    displayName: 'rimraf',
    description: '跨平台删除文件和目录工具',
    category: '开发工具',
  },
  {
    name: 'nrm',
    displayName: 'nrm',
    description: 'NPM 镜像源管理工具',
    category: '开发工具',
  },
  {
    name: 'typescript',
    displayName: 'TypeScript',
    description: 'JavaScript 的超集，添加静态类型',
    category: '语言工具',
  },
  {
    name: 'ts-node',
    displayName: 'ts-node',
    description: '直接运行 TypeScript 文件',
    category: '语言工具',
  },
  {
    name: 'nodemon',
    displayName: 'nodemon',
    description: '文件变化时自动重启 Node.js 应用',
    category: '开发工具',
  },
  {
    name: 'pm2',
    displayName: 'PM2',
    description: 'Node.js 进程管理器',
    category: '部署工具',
  },
];

export const usePackagesStore = defineStore('packages', () => {
  const installedPackages = ref<GlobalPackage[]>([]);
  const searchResults = ref<SearchPackage[]>([]);
  const isLoading = ref(false);
  const isUpdating = ref(false);
  const isSearching = ref(false);

  // 按分类分组的已安装包
  const packagesByCategory = computed(() => {
    const groups: Record<string, GlobalPackage[]> = {};

    installedPackages.value.forEach((pkg) => {
      const category = pkg.category || '其他';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(pkg);
    });

    return groups;
  });

  // 未安装的推荐工具
  const uninstalledRecommendations = computed(() => {
    const installedNames = new Set(installedPackages.value.map((p) => p.name));
    return recommendedTools.filter((tool) => !installedNames.has(tool.name));
  });

  // 有更新的包数量
  const updatableCount = computed(() => {
    return installedPackages.value.filter((p) => p.hasUpdate).length;
  });

  // 获取全局已安装包列表
  async function fetchInstalledPackages(packageManager?: string) {
    isLoading.value = true;
    try {
      const result = await window.nodeToolboxAPI.listGlobalPackages(packageManager);

      // 并发检查每个包的最新版本
      const packagesWithUpdate = await Promise.all(
        result.packages.map(async (pkg) => {
          const latestVersion = await window.nodeToolboxAPI.getLatestVersion(pkg.name);

          // 查找推荐工具信息
          const recommended = recommendedTools.find((t) => t.name === pkg.name);

          return {
            name: pkg.name,
            displayName: recommended?.displayName || pkg.name,
            currentVersion: pkg.version,
            latestVersion: latestVersion || undefined,
            hasUpdate: latestVersion ? hasUpdate(pkg.version, latestVersion) : false,
            description: recommended?.description,
            category: recommended?.category,
            recommended: !!recommended,
          };
        })
      );

      installedPackages.value = packagesWithUpdate;
    } catch (error) {
      console.error('获取全局包列表失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  // 安装包
  async function installPackage(name: string, packageManager?: string) {
    const result = await window.nodeToolboxAPI.installGlobalPackage(name, packageManager);

    if (!result.success) {
      // 检查是否是磁盘空间不足
      if (result.stderr?.includes('ENOSPC') || result.stderr?.includes('no space left on device')) {
        throw new Error('磁盘空间不足，请清理缓存目录后重试');
      }
      throw new Error(result.error || '安装失败');
    }

    await fetchInstalledPackages(packageManager);
  }

  // 更新包
  async function updatePackage(name: string, packageManager?: string) {
    const result = await window.nodeToolboxAPI.updateGlobalPackage(name, packageManager);

    if (!result.success) {
      // 检查是否是磁盘空间不足
      if (result.stderr?.includes('ENOSPC') || result.stderr?.includes('no space left on device')) {
        throw new Error('磁盘空间不足，请清理缓存目录后重试');
      }
      throw new Error(result.error || '更新失败');
    }

    await fetchInstalledPackages(packageManager);
  }

  // 卸载包
  async function uninstallPackage(name: string, packageManager?: string) {
    const result = await window.nodeToolboxAPI.uninstallGlobalPackage(name, packageManager);

    if (!result.success) {
      throw new Error(result.error || '卸载失败');
    }

    await fetchInstalledPackages(packageManager);
  }

  // 批量更新所有过期包
  async function updateAllPackages(packageManager?: string) {
    isUpdating.value = true;
    try {
      const packagesToUpdate = installedPackages.value
        .filter((p) => p.hasUpdate)
        .map((p) => p.name);

      if (packagesToUpdate.length === 0) {
        return;
      }

      await window.nodeToolboxAPI.batchUpdatePackages(packagesToUpdate, packageManager);
      await fetchInstalledPackages(packageManager);
    } finally {
      isUpdating.value = false;
    }
  }

  // 批量安装推荐工具
  async function installRecommendedTools(packageManager?: string) {
    isUpdating.value = true;
    try {
      const toolsToInstall = uninstalledRecommendations.value.map((t) => t.name);

      if (toolsToInstall.length === 0) {
        return;
      }

      for (const name of toolsToInstall) {
        try {
          await window.nodeToolboxAPI.installGlobalPackage(name, packageManager);
        } catch (error) {
          console.error(`安装 ${name} 失败:`, error);
        }
      }

      await fetchInstalledPackages(packageManager);
    } finally {
      isUpdating.value = false;
    }
  }

  // 搜索 npm 包
  async function searchPackages(keyword: string, packageManager?: string) {
    if (!keyword.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    try {
      const result = await window.nodeToolboxAPI.searchNpmPackages(keyword.trim(), packageManager);

      // 标记已安装的包
      const installedNames = new Set(installedPackages.value.map((p) => p.name));
      searchResults.value = result.packages.map((pkg) => ({
        ...pkg,
        installed: installedNames.has(pkg.name),
        currentVersion: installedPackages.value.find((p) => p.name === pkg.name)?.currentVersion,
      }));
    } catch (error) {
      console.error('搜索包失败:', error);
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }

  // 清空搜索结果
  function clearSearchResults() {
    searchResults.value = [];
  }

  return {
    installedPackages,
    searchResults,
    packagesByCategory,
    uninstalledRecommendations,
    updatableCount,
    isLoading,
    isUpdating,
    isSearching,
    fetchInstalledPackages,
    installPackage,
    updatePackage,
    uninstallPackage,
    updateAllPackages,
    installRecommendedTools,
    searchPackages,
    clearSearchResults,
  };
});

