// 版本比较工具

/**
 * 比较两个语义化版本号
 * @returns 1: v1 > v2, 0: v1 === v2, -1: v1 < v2
 */
export function compareVersions(v1: string, v2: string): number {
  // 移除 'v' 前缀
  const clean1 = v1.replace(/^v/, '');
  const clean2 = v2.replace(/^v/, '');

  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * 判断版本更新类型
 */
export function getUpdateType(
  currentVersion: string,
  latestVersion: string
): 'major' | 'minor' | 'patch' {
  const current = currentVersion.replace(/^v/, '').split('.').map(Number);
  const latest = latestVersion.replace(/^v/, '').split('.').map(Number);

  if (latest[0] > current[0]) return 'major';
  if (latest[1] > current[1]) return 'minor';
  return 'patch';
}

/**
 * 检查是否有可用更新
 */
export function hasUpdate(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}

