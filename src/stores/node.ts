import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { NodeInfo, NodeVersion, Platform } from '../types';

export const useNodeStore = defineStore('node', () => {
  const nodeInfo = ref<NodeInfo>({
    nodeVersion: null,
    npmVersion: null,
    nodePath: null,
    hasUpdate: false,
  });

  const versions = ref<NodeVersion[]>([]);
  const selectedPlatform = ref<Platform>('win-x64');
  const isLoading = ref(false);

  // 比较版本号
  function compareVersion(current: string, latest: string): number {
    const parseVersion = (v: string) => {
      // 移除 'v' 前缀
      const cleaned = v.replace(/^v/, '');
      // 分割版本号
      const parts = cleaned.split('.').map(p => parseInt(p) || 0);
      return parts;
    };

    const currentParts = parseVersion(current);
    const latestParts = parseVersion(latest);

    // 比较每个部分
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const curr = currentParts[i] || 0;
      const lat = latestParts[i] || 0;

      if (curr < lat) return -1;
      if (curr > lat) return 1;
    }

    return 0;
  }

  // 检查版本更新
  function checkUpdate() {
    if (nodeInfo.value.nodeVersion && versions.value.length > 0) {
      const latestLTS = versions.value.find((v) => v.lts);

      if (latestLTS) {
        nodeInfo.value.hasUpdate = compareVersion(nodeInfo.value.nodeVersion, latestLTS.version) < 0;
      }
    }
  }

  // 获取当前环境信息
  async function fetchNodeInfo() {
    isLoading.value = true;
    try {
      const envInfo = await window.nodeToolboxAPI.getEnvironmentInfo();

      nodeInfo.value = {
        nodeVersion: envInfo.nodeVersion,
        npmVersion: envInfo.npmVersion,
        nodePath: envInfo.nodePath,
        hasUpdate: false,
      };

      // 如果已经加载了版本列表，检查更新
      checkUpdate();
    } catch (error) {
      console.error('获取 Node 信息失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  // 获取 Node.js 版本列表
  async function fetchVersions() {
    isLoading.value = true;
    try {
      const response = await fetch('https://nodejs.org/dist/index.json');
      const data = await response.json();
      versions.value = data.slice(0, 50); // 只取前50个版本

      // 检查是否有更新
      checkUpdate();
    } catch (error) {
      console.error('获取版本列表失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  // 自动检测当前平台
  function detectPlatform(): Platform {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // 检测操作系统
    if (platform.includes('win')) {
      // Windows 平台，默认使用 x64
      return 'win-x64';
    } else if (platform.includes('mac') || userAgent.includes('mac')) {
      // macOS 平台，检测是否为 ARM (M1/M2)
      if (userAgent.includes('arm') || platform.includes('arm')) {
        return 'darwin-arm64';
      }
      return 'darwin-x64';
    } else if (platform.includes('linux') || userAgent.includes('linux')) {
      // Linux 平台
      if (userAgent.includes('arm') || platform.includes('arm')) {
        return 'linux-arm64';
      }
      return 'linux-x64';
    }

    // 默认返回 win-x64
    return 'win-x64';
  }

  // 获取下载信息
  function getDownloadInfo(version: string): { url: string; filename: string } {
    // 自动检测平台
    const detectedPlatform = detectPlatform();

    let filename: string;
    let url: string;

    // Windows: x64/x86 使用 msi，arm64 使用 zip
    if (detectedPlatform === 'win-x64') {
      filename = `node-${version}-x64.msi`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    } else if (detectedPlatform === 'win-x86') {
      filename = `node-${version}-x86.msi`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    } else if (detectedPlatform === 'win-arm64') {
      filename = `node-${version}-win-arm64.zip`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    }
    // macOS: 使用 .pkg
    else if (detectedPlatform.startsWith('darwin')) {
      filename = `node-${version}.pkg`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    }
    // Linux: 使用 tar.xz
    else if (detectedPlatform === 'linux-x64') {
      filename = `node-${version}-linux-x64.tar.xz`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    } else if (detectedPlatform === 'linux-arm64') {
      filename = `node-${version}-linux-arm64.tar.xz`;
      url = `https://nodejs.org/dist/${version}/${filename}`;
    } else {
      throw new Error(`不支持的平台: ${detectedPlatform}`);
    }

    return { url, filename };
  }

  return {
    nodeInfo,
    versions,
    selectedPlatform,
    isLoading,
    fetchNodeInfo,
    fetchVersions,
    getDownloadInfo,
  };
});

