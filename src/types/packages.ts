// 全局包管理相关类型定义

export interface GlobalPackage {
  name: string;
  displayName?: string;
  currentVersion: string;
  latestVersion?: string;
  hasUpdate: boolean;
  description?: string;
  category?: string;
  recommended?: boolean;
  homepage?: string;
  repository?: string;
}

export interface PackageUpdateInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch';
}

export interface RecommendedTool {
  name: string;
  displayName: string;
  description: string;
  category: string;
}

export interface SearchPackage {
  name: string;
  description: string;
  version: string;
  author?: string;
  keywords?: string[];
  date?: string;
  installed?: boolean;
  currentVersion?: string;
}

export type PackageCategory = '包管理器' | '开发工具' | '语言工具' | '部署工具' | '其他';

