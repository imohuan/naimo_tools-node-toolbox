import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { NpmrcConfig, ViewMode } from '../types';
import { generateNpmrc } from '../utils/npmrc-parser';

// 预设配置方案
const presetConfigs: NpmrcConfig[] = [
  {
    id: 'taobao',
    name: '淘宝镜像',
    description: '使用淘宝 NPM 镜像加速下载',
    items: [
      {
        key: 'registry',
        label: '镜像源',
        description: 'NPM 包下载源',
        type: 'select',
        value: 'https://registry.npmmirror.com',
        options: [
          { label: '淘宝镜像', value: 'https://registry.npmmirror.com' },
          { label: '官方源', value: 'https://registry.npmjs.org' },
          { label: '腾讯云', value: 'https://mirrors.cloud.tencent.com/npm/' },
        ],
      },
      {
        key: 'disturl',
        label: 'Node 源',
        description: 'Node.js 二进制文件下载源',
        type: 'text',
        value: 'https://npmmirror.com/mirrors/node',
      },
      {
        key: 'sass_binary_site',
        label: 'Sass 源',
        description: 'Node Sass 二进制文件源',
        type: 'text',
        value: 'https://npmmirror.com/mirrors/node-sass',
      },
    ],
  },
  {
    id: 'electron',
    name: 'Electron 专用',
    description: 'Electron 开发环境配置，使用淘宝镜像加速',
    items: [
      {
        key: 'registry',
        label: '镜像源',
        description: 'NPM 包下载源',
        type: 'select',
        value: 'https://registry.npmmirror.com',
        options: [
          { label: '淘宝镜像', value: 'https://registry.npmmirror.com' },
          { label: '官方源', value: 'https://registry.npmjs.org' },
        ],
      },
      {
        key: 'electron_mirror',
        label: 'Electron 镜像',
        description: 'Electron 二进制文件下载源',
        type: 'text',
        value: 'https://npmmirror.com/mirrors/electron/',
      },
      {
        key: 'electron_builder_binaries_mirror',
        label: 'Electron Builder 镜像',
        description: 'Electron Builder 依赖下载源',
        type: 'text',
        value: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
      },
    ],
  },
  {
    id: 'official',
    name: '官方源',
    description: '使用 NPM 官方源',
    items: [
      {
        key: 'registry',
        label: '镜像源',
        description: 'NPM 包下载源',
        type: 'text',
        value: 'https://registry.npmjs.org',
      },
    ],
  },
];

export const useNpmrcStore = defineStore('npmrc', () => {
  const configs = ref<NpmrcConfig[]>([...presetConfigs]);
  const currentConfigId = ref('taobao');
  const viewMode = ref<ViewMode>('dual');
  const currentNpmrcContent = ref('');

  // 当前配置
  const currentConfig = computed(() => {
    return configs.value.find((c) => c.id === currentConfigId.value) || configs.value[0];
  });

  // 生成的 .npmrc 内容
  const generatedNpmrc = computed(() => {
    return generateNpmrc(currentConfig.value);
  });

  // 加载当前系统的 .npmrc
  async function loadCurrentNpmrc() {
    try {
      const content = await window.nodeToolboxAPI.readNpmrc();
      currentNpmrcContent.value = content;
    } catch (error) {
      console.error('读取 .npmrc 失败:', error);
    }
  }

  // 应用配置到全局
  async function applyToGlobal() {
    // 备份当前配置
    await window.nodeToolboxAPI.backupNpmrc();

    // 写入新配置
    await window.nodeToolboxAPI.writeNpmrc(generatedNpmrc.value);

    await loadCurrentNpmrc();
  }

  // 添加配置项
  function addConfigItem() {
    if (currentConfig.value) {
      currentConfig.value.items.push({
        key: '',
        label: '',
        description: '',
        type: 'text',
        value: '',
      });
    }
  }

  // 删除配置项
  function removeConfigItem(index: number) {
    if (currentConfig.value) {
      currentConfig.value.items.splice(index, 1);
    }
  }

  // 保存配置方案
  function saveConfig() {
    // 配置已经是响应式的，无需额外保存操作
  }

  // 创建新配置方案
  function createConfig(name: string, description: string) {
    const newConfig: NpmrcConfig = {
      id: `custom-${Date.now()}`,
      name,
      description,
      items: [],
    };
    configs.value.push(newConfig);
    currentConfigId.value = newConfig.id;
  }

  // 删除配置方案
  function deleteConfig(id: string) {
    const index = configs.value.findIndex((c) => c.id === id);
    if (index > -1) {
      configs.value.splice(index, 1);
      if (currentConfigId.value === id) {
        currentConfigId.value = configs.value[0]?.id || '';
      }
    }
  }

  return {
    configs,
    currentConfigId,
    currentConfig,
    viewMode,
    generatedNpmrc,
    currentNpmrcContent,
    loadCurrentNpmrc,
    applyToGlobal,
    addConfigItem,
    removeConfigItem,
    saveConfig,
    createConfig,
    deleteConfig,
  };
});

