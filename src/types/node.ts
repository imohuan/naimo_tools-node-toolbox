// Node.js 相关类型定义

export interface NodeVersion {
  version: string;
  lts: string | false;
  date: string;
  files: string[];
}

export interface NodeInfo {
  nodeVersion: string | null;
  npmVersion: string | null;
  nodePath: string | null;
  hasUpdate: boolean;
  latestLTS?: string;
  latestCurrent?: string;
}

export type Platform = 'win-x64' | 'win-x86' | 'win-arm64' | 'darwin-x64' | 'darwin-arm64' | 'linux-x64' | 'linux-arm64';

export interface DownloadInfo {
  version: string;
  platform: Platform;
  url: string;
  filename: string;
}

