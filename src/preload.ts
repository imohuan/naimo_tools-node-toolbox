/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// 日志回调函数
type LogCallback = (data: string) => void;
let logCallback: LogCallback | null = null;

// 命令组回调函数
type CommandStartCallback = (commandId: string, command: string) => void;
type CommandLogCallback = (commandId: string, message: string, type?: 'info' | 'error' | 'warning') => void;
type CommandEndCallback = (commandId: string, exitCode: number) => void;

let commandStartCallback: CommandStartCallback | null = null;
let commandLogCallback: CommandLogCallback | null = null;
let commandEndCallback: CommandEndCallback | null = null;

// 定义 API 接口
interface NodeToolboxAPI {
  // 日志监听
  onLog: (callback: LogCallback) => void;

  // 命令组监听
  onCommandStart: (callback: CommandStartCallback) => void;
  onCommandLog: (callback: CommandLogCallback) => void;
  onCommandEnd: (callback: CommandEndCallback) => void;

  // Node 版本检测
  getNodeVersion: () => Promise<string | null>;
  getNpmVersion: () => Promise<string | null>;
  getNodePath: () => Promise<string | null>;
  getEnvironmentInfo: () => Promise<{
    nodeVersion: string | null;
    npmVersion: string | null;
    nodePath: string | null;
    npmPath: string | null;
    logs: string[];
  }>;

  // 执行命令
  executeCommand: (command: string) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;

  // 全局包管理
  installGlobalPackage: (name: string, packageManager?: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
  }>;
  updateGlobalPackage: (name: string, packageManager?: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
  }>;
  uninstallGlobalPackage: (name: string, packageManager?: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
  }>;
  checkGlobalPackage: (name: string) => Promise<{
    installed: boolean;
    version?: string;
  }>;
  listGlobalPackages: (packageManager?: string) => Promise<{
    packages: Array<{
      name: string;
      version: string;
    }>;
    stdout: string;
    stderr: string;
  }>;
  getLatestVersion: (name: string) => Promise<string | null>;
  batchUpdatePackages: (names: string[], packageManager?: string) => Promise<
    Array<{
      name: string;
      success: boolean;
      stdout?: string;
      stderr?: string;
      error?: string;
    }>
  >;
  searchNpmPackages: (keyword: string, packageManager?: string) => Promise<{
    packages: Array<{
      name: string;
      description: string;
      version: string;
      author?: string;
      keywords?: string[];
      date?: string;
    }>;
  }>;
  getPackageInfo: (name: string) => Promise<{
    name: string;
    description: string;
    version: string;
    homepage?: string;
    repository?: string;
    author?: string;
    keywords?: string[];
  } | null>;

  // npmrc 文件操作
  readNpmrc: () => Promise<string>;
  writeNpmrc: (content: string) => Promise<void>;
  getNpmrcPath: () => Promise<string>;
  backupNpmrc: () => Promise<string>;
  restoreNpmrc: (backupPath: string) => Promise<void>;

  // 文件系统操作
  selectFolder: () => Promise<string | null>;

  // npm→pnpm 转换功能
  checkNpmPnpmConvert: () => Promise<{
    enabled: boolean;
    profileExists: boolean;
    pnpmInstalled: boolean;
    pnpmVersion?: string;
  }>;
  enableNpmPnpmConvert: () => Promise<{
    success: boolean;
    message: string;
  }>;
  disableNpmPnpmConvert: () => Promise<{
    success: boolean;
    message: string;
  }>;
}

// 获取 npmrc 路径
function getNpmrcPath(): string {
  return path.join(os.homedir(), '.npmrc');
}

// PowerShell Profile 路径
function getPowerShellProfilePath(): string {
  return path.join(os.homedir(), 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
}

// 标记注释
const START_MARKER = '# ========== NPM-PNPM-AUTO-CONVERT-START ==========';
const END_MARKER = '# ========== NPM-PNPM-AUTO-CONVERT-END ==========';
const UTF8_BOM = '\uFEFF';

// PowerShell 配置内容
const POWERSHELL_CONFIG = `
${START_MARKER}
# npm → pnpm 自动转换配置
# 生成时间: ${new Date().toLocaleString()}

# npm 命令映射函数
function npm {
    param([Parameter(ValueFromRemainingArguments)]$args)
    
    if ($args.Length -eq 0) {
        Write-Host "💡 使用 pnpm" -ForegroundColor Yellow
        pnpm --help
        return
    }
    
    $cmd = $args[0]
    $rest = $args[1..$args.Length]
    
    Write-Host "💡 npm → pnpm 自动转换" -ForegroundColor Yellow
    
    switch ($cmd) {
        'install' {
            if ($rest.Length -eq 0) {
                Write-Host "   执行: pnpm install" -ForegroundColor Cyan
                pnpm install
            } else {
                Write-Host "   执行: pnpm add $rest" -ForegroundColor Cyan
                pnpm add @rest
            }
        }
        'i' {
            Write-Host "   执行: pnpm add $rest" -ForegroundColor Cyan
            pnpm add @rest
        }
        'uninstall' {
            Write-Host "   执行: pnpm remove $rest" -ForegroundColor Cyan
            pnpm remove @rest
        }
        'un' {
            Write-Host "   执行: pnpm remove $rest" -ForegroundColor Cyan
            pnpm remove @rest
        }
        'rm' {
            Write-Host "   执行: pnpm remove $rest" -ForegroundColor Cyan
            pnpm remove @rest
        }
        'remove' {
            Write-Host "   执行: pnpm remove $rest" -ForegroundColor Cyan
            pnpm remove @rest
        }
        'update' {
            Write-Host "   执行: pnpm update $rest" -ForegroundColor Cyan
            pnpm update @rest
        }
        'up' {
            Write-Host "   执行: pnpm update $rest" -ForegroundColor Cyan
            pnpm update @rest
        }
        'run' {
            Write-Host "   执行: pnpm run $rest" -ForegroundColor Cyan
            pnpm run @rest
        }
        'test' {
            Write-Host "   执行: pnpm test $rest" -ForegroundColor Cyan
            pnpm test @rest
        }
        'start' {
            Write-Host "   执行: pnpm start $rest" -ForegroundColor Cyan
            pnpm start @rest
        }
        default {
            Write-Host "   执行: pnpm $args" -ForegroundColor Cyan
            pnpm @args
        }
    }
}

# npx 命令映射函数
function npx {
    Write-Host "💡 npx → pnpm dlx 自动转换" -ForegroundColor Yellow
    Write-Host "   执行: pnpm dlx $args" -ForegroundColor Cyan
    pnpm dlx @args
}

# 恢复使用真正的 npm（如果需要）
function npm-real {
    & "npm.cmd" @args
}

# 恢复使用真正的 npx（如果需要）
function npx-real {
    & "npx.cmd" @args
}

Write-Host "✅ npm → pnpm 自动转换已启用" -ForegroundColor Green
Write-Host "   输入 npm 命令将自动使用 pnpm" -ForegroundColor Gray
Write-Host "   如需使用真正的 npm, 请用 npm-real 命令" -ForegroundColor Gray
${END_MARKER}
`;

// 检查是否已启用 npm→pnpm 转换
async function isNpmPnpmEnabled(): Promise<boolean> {
  try {
    const profilePath = getPowerShellProfilePath();
    const content = await fs.readFile(profilePath, 'utf-8');
    return content.includes(START_MARKER);
  } catch {
    return false;
  }
}

// 确保 PowerShell Profile 文件存在
async function ensureProfileExists(): Promise<void> {
  const profilePath = getPowerShellProfilePath();
  try {
    await fs.access(profilePath);
  } catch {
    const dir = path.dirname(profilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(profilePath, '', 'utf-8');
  }
}

// 发送日志的辅助函数
function sendLog(data: string) {
  if (logCallback) {
    logCallback(data);
  }
}

// 发送命令组事件的辅助函数
function sendCommandStart(commandId: string, command: string) {
  if (commandStartCallback) {
    commandStartCallback(commandId, command);
  }
}

function sendCommandLog(commandId: string, message: string, type: 'info' | 'error' | 'warning' = 'info') {
  if (commandLogCallback) {
    commandLogCallback(commandId, message, type);
  }
}

function sendCommandEnd(commandId: string, exitCode: number) {
  if (commandEndCallback) {
    commandEndCallback(commandId, exitCode);
  }
}

// 执行命令并实时输出日志（旧版本，兼容性保留）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function executeCommandWithLogs(command: string, args: string[] = []): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      sendLog(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;

      // 过滤掉已知的无害警告
      const shouldFilter = text.includes('Unknown user config') ||
        text.includes('This will stop working in the next major version');

      if (!shouldFilter) {
        sendLog(text);
      }
    });

    child.on('close', (code) => {
      // 检查是否有磁盘空间不足的错误
      if (stderr.includes('ENOSPC') || stderr.includes('no space left on device')) {
        sendLog('错误: 磁盘空间不足，请清理缓存目录或更改缓存路径\n');
      }

      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    child.on('error', (error) => {
      sendLog(`执行错误: ${error.message}\n`);
      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: 1,
      });
    });
  });
}

// 执行命令并使用命令组功能
function executeCommandWithGroup(commandStr: string, args: string[] = []): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    // 生成命令 ID
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullCommand = args.length > 0 ? `${commandStr} ${args.join(' ')}` : commandStr;

    // 通知命令开始
    sendCommandStart(commandId, fullCommand);

    const child = spawn(commandStr, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      sendCommandLog(commandId, text, 'info');
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;

      // 过滤掉已知的无害警告
      const shouldFilter = text.includes('Unknown user config') ||
        text.includes('This will stop working in the next major version');

      if (!shouldFilter) {
        // stderr 中的内容不一定是错误，npm 的警告也会输出到 stderr
        // 根据内容判断类型
        const logType: 'info' | 'error' | 'warning' = text.includes('npm warn') || text.includes('npm WARN') ? 'warning' : 'error';
        sendCommandLog(commandId, text, logType);
      }
    });

    child.on('close', (code) => {
      const exitCode = code || 0;

      // 检查是否有磁盘空间不足的错误
      if (stderr.includes('ENOSPC') || stderr.includes('no space left on device')) {
        sendCommandLog(commandId, '错误: 磁盘空间不足，请清理缓存目录或更改缓存路径\n', 'error');
      }

      // 通知命令结束
      sendCommandEnd(commandId, exitCode);

      resolve({
        success: exitCode === 0,
        stdout,
        stderr,
        exitCode,
      });
    });

    child.on('error', (error) => {
      sendCommandLog(commandId, `执行错误: ${error.message}\n`, 'error');
      sendCommandEnd(commandId, 1);

      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: 1,
      });
    });
  });
}

// 实现 API
const nodeToolboxAPI: NodeToolboxAPI = {
  // 日志监听
  onLog(callback: LogCallback) {
    logCallback = callback;
  },

  // 命令组监听
  onCommandStart(callback: CommandStartCallback) {
    commandStartCallback = callback;
  },

  onCommandLog(callback: CommandLogCallback) {
    commandLogCallback = callback;
  },

  onCommandEnd(callback: CommandEndCallback) {
    commandEndCallback = callback;
  },

  // Node 版本检测
  async getNodeVersion() {
    try {
      const { stdout } = await execAsync('node -v');
      return stdout.trim();
    } catch (error) {
      console.error('获取 Node 版本失败:', error);
      return null;
    }
  },

  async getNpmVersion() {
    try {
      const { stdout } = await execAsync('npm -v');
      return stdout.trim();
    } catch (error) {
      console.error('获取 npm 版本失败:', error);
      return null;
    }
  },

  async getNodePath() {
    try {
      const command = process.platform === 'win32' ? 'where node' : 'which node';
      const { stdout } = await execAsync(command);
      return stdout.trim().split('\n')[0];
    } catch (error) {
      console.error('获取 Node 路径失败:', error);
      return null;
    }
  },

  async getEnvironmentInfo() {
    try {
      sendLog('node -v\n');
      const nodeResult = await executeCommandWithGroup('node', ['-v']);

      sendLog('npm -v\n');
      const npmResult = await executeCommandWithGroup('npm', ['-v']);

      const command = process.platform === 'win32' ? 'where' : 'which';
      sendLog(`${command} node\n`);
      const nodePathResult = await executeCommandWithGroup(command, ['node']);

      const npmPath = nodePathResult.stdout.trim().split('\n')[0]
        ? nodePathResult.stdout.trim().split('\n')[0].replace(/node(\.exe)?$/i, process.platform === 'win32' ? 'npm.cmd' : 'npm')
        : null;

      return {
        nodeVersion: nodeResult.success ? nodeResult.stdout.trim() : null,
        npmVersion: npmResult.success ? npmResult.stdout.trim() : null,
        nodePath: nodePathResult.success ? nodePathResult.stdout.trim().split('\n')[0] : null,
        npmPath,
        logs: [], // 不再需要 logs 数组
      };
    } catch (error: any) {
      console.error('获取环境信息失败:', error);
      sendLog(`错误: ${error.message}\n`);
      return {
        nodeVersion: null,
        npmVersion: null,
        nodePath: null,
        npmPath: null,
        logs: [],
      };
    }
  },

  // 执行命令
  async executeCommand(command: string) {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  },

  // 全局包管理
  async installGlobalPackage(name: string, packageManager: string = 'npm') {
    let command: string;
    let args: string[];

    switch (packageManager) {
      case 'pnpm':
        command = 'pnpm';
        args = ['install', '-g', name];
        break;
      case 'yarn':
        command = 'yarn';
        args = ['global', 'add', name];
        break;
      default:
        command = 'npm';
        args = ['install', '-g', name];
    }

    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? undefined : '安装失败',
    };
  },

  async updateGlobalPackage(name: string, packageManager: string = 'npm') {
    let command: string;
    let args: string[];

    switch (packageManager) {
      case 'pnpm':
        command = 'pnpm';
        args = ['update', '-g', name];
        break;
      case 'yarn':
        command = 'yarn';
        args = ['global', 'upgrade', name];
        break;
      default:
        command = 'npm';
        args = ['update', '-g', name];
    }

    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? undefined : '更新失败',
    };
  },

  async uninstallGlobalPackage(name: string, packageManager: string = 'npm') {
    let command: string;
    let args: string[];

    switch (packageManager) {
      case 'pnpm':
        command = 'pnpm';
        args = ['uninstall', '-g', name];
        break;
      case 'yarn':
        command = 'yarn';
        args = ['global', 'remove', name];
        break;
      default:
        command = 'npm';
        args = ['uninstall', '-g', name];
    }

    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? undefined : '卸载失败',
    };
  },

  async checkGlobalPackage(name: string) {
    try {
      const { stdout } = await execAsync(`npm list -g ${name} --depth=0`);
      const match = stdout.match(new RegExp(`${name}@([\\d.]+)`));
      if (match) {
        return { installed: true, version: match[1] };
      }
      return { installed: false };
    } catch (error) {
      return { installed: false };
    }
  },

  async listGlobalPackages(packageManager: string = 'npm') {
    try {
      let command: string;
      let args: string[];

      switch (packageManager) {
        case 'pnpm':
          command = 'pnpm';
          args = ['list', '-g', '--depth=0', '--json'];
          break;
        case 'yarn':
          command = 'yarn';
          args = ['global', 'list', '--json'];
          break;
        default:
          command = 'npm';
          args = ['list', '-g', '--depth=0', '--json'];
      }

      const result = await executeCommandWithGroup(command, args);

      if (packageManager === 'yarn') {
        // Yarn 的输出格式不同，需要特殊处理
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const packages: Array<{ name: string; version: string }> = [];

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'tree' && data.data && data.data.trees) {
              for (const tree of data.data.trees) {
                if (tree.name) {
                  packages.push({
                    name: tree.name.split('@')[0],
                    version: tree.name.split('@')[1] || '',
                  });
                }
              }
            }
          } catch (e) {
            // 跳过无法解析的行
          }
        }

        return {
          packages,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
        };
      } else {
        // npm 和 pnpm 使用相同的 JSON 格式
        const data = JSON.parse(result.stdout);
        const dependencies = data.dependencies || {};

        return {
          packages: Object.entries(dependencies).map(([name, info]: [string, any]) => ({
            name,
            version: info.version || '',
          })),
          stdout: result.stdout || '',
          stderr: result.stderr || '',
        };
      }
    } catch (error: any) {
      console.error('获取全局包列表失败:', error);
      return {
        packages: [],
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  },

  async getLatestVersion(name: string) {
    try {
      const { stdout } = await execAsync(`npm view ${name} version`);
      return stdout.trim();
    } catch (error) {
      console.error(`获取 ${name} 最新版本失败:`, error);
      return null;
    }
  },

  async batchUpdatePackages(names: string[], packageManager: string = 'npm') {
    const results = [];

    let command: string;
    let args: string[];

    switch (packageManager) {
      case 'pnpm':
        command = 'pnpm';
        args = ['update', '-g'];
        break;
      case 'yarn':
        command = 'yarn';
        args = ['global', 'upgrade'];
        break;
      default:
        command = 'npm';
        args = ['update', '-g'];
    }

    // 对于 npm 和 pnpm，可以批量更新
    if (packageManager === 'npm' || packageManager === 'pnpm') {
      const result = await executeCommandWithGroup(command, [...args, ...names]);
      return names.map(name => ({
        name,
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        error: result.success ? undefined : '更新失败',
      }));
    } else {
      // Yarn 需要逐个更新
      for (const name of names) {
        const result = await executeCommandWithGroup(command, [...args, name]);
        results.push({
          name,
          success: result.success,
          stdout: result.stdout,
          stderr: result.stderr,
          error: result.success ? undefined : '更新失败',
        });
      }
    }

    return results;
  },

  async searchNpmPackages(keyword: string, packageManager: string = 'npm') {
    try {
      // 搜索功能主要使用 npm 的搜索 API，因为 pnpm 和 yarn 的搜索功能有限
      const { stdout } = await execAsync(`npm search ${keyword} --json --long`);
      const results = JSON.parse(stdout);

      return {
        packages: results.slice(0, 20).map((pkg: any) => ({
          name: pkg.name,
          description: pkg.description || '',
          version: pkg.version || '',
          author: pkg.author?.name || pkg.author || '',
          keywords: pkg.keywords || [],
          date: pkg.date || '',
        })),
      };
    } catch (error: any) {
      console.error('搜索包失败:', error);
      return { packages: [] };
    }
  },

  async getPackageInfo(name: string) {
    try {
      const { stdout } = await execAsync(`npm view ${name} --json`);
      const info = JSON.parse(stdout);

      return {
        name: info.name || name,
        description: info.description || '',
        version: info.version || '',
        homepage: info.homepage || '',
        repository: typeof info.repository === 'string'
          ? info.repository
          : info.repository?.url || '',
        author: typeof info.author === 'string'
          ? info.author
          : info.author?.name || '',
        keywords: info.keywords || [],
      };
    } catch (error: any) {
      console.error('获取包信息失败:', error);
      return null;
    }
  },

  // npmrc 文件操作
  async readNpmrc() {
    try {
      const content = await fs.readFile(getNpmrcPath(), 'utf-8');
      return content;
    } catch (error) {
      // 文件不存在时返回空字符串
      return '';
    }
  },

  async writeNpmrc(content: string) {
    try {
      await fs.writeFile(getNpmrcPath(), content, 'utf-8');
    } catch (error: any) {
      throw new Error(`写入 .npmrc 失败: ${error.message}`);
    }
  },

  async getNpmrcPath() {
    return getNpmrcPath();
  },

  async backupNpmrc() {
    try {
      const npmrcPath = getNpmrcPath();
      const backupPath = `${npmrcPath}.backup.${Date.now()}`;

      // 如果原文件存在，则备份
      try {
        await fs.access(npmrcPath);
        await fs.copyFile(npmrcPath, backupPath);
        return backupPath;
      } catch {
        // 原文件不存在，返回空路径
        return '';
      }
    } catch (error: any) {
      throw new Error(`备份 .npmrc 失败: ${error.message}`);
    }
  },

  async restoreNpmrc(backupPath: string) {
    try {
      const npmrcPath = getNpmrcPath();
      await fs.copyFile(backupPath, npmrcPath);
    } catch (error: any) {
      throw new Error(`恢复 .npmrc 失败: ${error.message}`);
    }
  },

  // 文件系统操作
  async selectFolder() {
    try {
      // 使用 Naimo API 打开文件夹选择对话框
      const result = await window.naimo.dialog.showOpen({
        properties: ['openDirectory'],
        title: '选择文件夹',
      });

      if (result && result.length > 0) {
        return result[0];
      }
      return null;
    } catch (error: any) {
      console.error('选择文件夹失败:', error);
      return null;
    }
  },

  // npm→pnpm 转换功能
  async checkNpmPnpmConvert() {
    try {
      const profilePath = getPowerShellProfilePath();
      let profileExists = false;
      let enabled = false;

      try {
        await fs.access(profilePath);
        profileExists = true;
        enabled = await isNpmPnpmEnabled();
      } catch {
        profileExists = false;
      }

      // 检查 pnpm 是否安装
      let pnpmInstalled = false;
      let pnpmVersion: string | undefined;
      try {
        const { stdout } = await execAsync('pnpm --version');
        pnpmInstalled = true;
        pnpmVersion = stdout.trim();
      } catch {
        pnpmInstalled = false;
      }

      return {
        enabled,
        profileExists,
        pnpmInstalled,
        pnpmVersion,
      };
    } catch (error: any) {
      console.error('检查 npm→pnpm 转换状态失败:', error);
      return {
        enabled: false,
        profileExists: false,
        pnpmInstalled: false,
      };
    }
  },

  async enableNpmPnpmConvert() {
    try {
      // 检查是否已启用
      if (await isNpmPnpmEnabled()) {
        return {
          success: false,
          message: 'npm → pnpm 转换已经启用',
        };
      }

      // 检查 pnpm 是否安装
      try {
        await execAsync('pnpm --version');
      } catch {
        return {
          success: false,
          message: 'pnpm 未安装，请先安装 pnpm',
        };
      }

      // 确保 Profile 文件存在
      await ensureProfileExists();

      const profilePath = getPowerShellProfilePath();

      // 读取现有内容
      let content = '';
      try {
        content = await fs.readFile(profilePath, 'utf-8');
        // 移除 BOM（如果存在）
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
      } catch {
        content = '';
      }

      // 添加配置
      content += '\n' + POWERSHELL_CONFIG + '\n';

      // 写入文件，添加 UTF-8 BOM
      await fs.writeFile(profilePath, UTF8_BOM + content, 'utf-8');

      return {
        success: true,
        message: 'npm → pnpm 自动转换已启用，请重新打开 PowerShell 窗口或执行 . $PROFILE',
      };
    } catch (error: any) {
      console.error('启用 npm→pnpm 转换失败:', error);
      return {
        success: false,
        message: `启用失败: ${error.message}`,
      };
    }
  },

  async disableNpmPnpmConvert() {
    try {
      const profilePath = getPowerShellProfilePath();

      // 检查 Profile 文件是否存在
      try {
        await fs.access(profilePath);
      } catch {
        return {
          success: false,
          message: 'PowerShell Profile 文件不存在',
        };
      }

      // 检查是否已启用
      if (!(await isNpmPnpmEnabled())) {
        return {
          success: false,
          message: 'npm → pnpm 转换未启用',
        };
      }

      // 读取现有内容
      let content = await fs.readFile(profilePath, 'utf-8');

      // 移除 BOM（如果存在）
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }

      // 查找并删除配置块
      const startIndex = content.indexOf(START_MARKER);
      const endIndex = content.indexOf(END_MARKER);

      if (startIndex !== -1 && endIndex !== -1) {
        // 删除配置块（包括前后的空行）
        content = content.substring(0, startIndex) + content.substring(endIndex + END_MARKER.length);
        // 清理多余的空行
        content = content.replace(/\n{3,}/g, '\n\n').trim() + '\n';

        // 写入文件，添加 UTF-8 BOM
        await fs.writeFile(profilePath, UTF8_BOM + content, 'utf-8');

        return {
          success: true,
          message: 'npm → pnpm 自动转换已禁用，请重新打开 PowerShell 窗口或执行 . $PROFILE',
        };
      } else {
        return {
          success: false,
          message: '配置格式异常，请手动编辑 Profile 文件',
        };
      }
    } catch (error: any) {
      console.error('禁用 npm→pnpm 转换失败:', error);
      return {
        success: false,
        message: `禁用失败: ${error.message}`,
      };
    }
  },
};

// 暴露 API
contextBridge.exposeInMainWorld('nodeToolboxAPI', nodeToolboxAPI);

// 类型声明
declare global {
  interface Window {
    nodeToolboxAPI: NodeToolboxAPI;
  }
}
