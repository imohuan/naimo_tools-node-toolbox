// npmrc 配置解析工具

import type { NpmrcConfig } from '../types';

/**
 * 解析变量语法 {{变量名}}
 */
export function resolveVariables(config: NpmrcConfig): Record<string, string> {
  const resolved: Record<string, string> = {};
  const items = config.items;

  // 按顺序解析（确保依赖的变量先解析）
  for (const item of items) {
    let value = item.value;

    // 替换 {{变量名}} 为已解析的值
    value = value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const refItem = items.find((i) => i.key === varName);
      return resolved[varName] || refItem?.value || match;
    });

    resolved[item.key] = value;
  }

  return resolved;
}

/**
 * 生成 .npmrc 文件内容
 */
export function generateNpmrc(config: NpmrcConfig): string {
  const resolved = resolveVariables(config);
  return Object.entries(resolved)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

/**
 * 解析 .npmrc 文件内容
 */
export function parseNpmrc(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();
      result[key] = value;
    }
  }

  return result;
}

