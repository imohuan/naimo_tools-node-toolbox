"use strict";
const electron = require("electron");
const child_process = require("child_process");
const util = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const execAsync = util.promisify(child_process.exec);
let logCallback = null;
let commandStartCallback = null;
let commandLogCallback = null;
let commandEndCallback = null;
function getNpmrcPath() {
  return path__namespace.join(os__namespace.homedir(), ".npmrc");
}
function getPowerShellProfilePath() {
  return path__namespace.join(os__namespace.homedir(), "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1");
}
const START_MARKER = "# ========== NPM-PNPM-AUTO-CONVERT-START ==========";
const END_MARKER = "# ========== NPM-PNPM-AUTO-CONVERT-END ==========";
const UTF8_BOM = "\uFEFF";
const POWERSHELL_CONFIG = `
${START_MARKER}
# npm → pnpm 自动转换配置
# 生成时间: ${(/* @__PURE__ */ new Date()).toLocaleString()}

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
async function isNpmPnpmEnabled() {
  try {
    const profilePath = getPowerShellProfilePath();
    const content = await fs__namespace.readFile(profilePath, "utf-8");
    return content.includes(START_MARKER);
  } catch {
    return false;
  }
}
async function ensureProfileExists() {
  const profilePath = getPowerShellProfilePath();
  try {
    await fs__namespace.access(profilePath);
  } catch {
    const dir = path__namespace.dirname(profilePath);
    await fs__namespace.mkdir(dir, { recursive: true });
    await fs__namespace.writeFile(profilePath, "", "utf-8");
  }
}
function sendLog(data) {
  if (logCallback) {
    logCallback(data);
  }
}
function sendCommandStart(commandId, command) {
  if (commandStartCallback) {
    commandStartCallback(commandId, command);
  }
}
function sendCommandLog(commandId, message, type = "info") {
  if (commandLogCallback) {
    commandLogCallback(commandId, message, type);
  }
}
function sendCommandEnd(commandId, exitCode) {
  if (commandEndCallback) {
    commandEndCallback(commandId, exitCode);
  }
}
function executeCommandWithGroup(commandStr, args = []) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullCommand = args.length > 0 ? `${commandStr} ${args.join(" ")}` : commandStr;
    sendCommandStart(commandId, fullCommand);
    const child = child_process.spawn(commandStr, args, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      sendCommandLog(commandId, text, "info");
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      const shouldFilter = text.includes("Unknown user config") || text.includes("This will stop working in the next major version");
      if (!shouldFilter) {
        const logType = text.includes("npm warn") || text.includes("npm WARN") ? "warning" : "error";
        sendCommandLog(commandId, text, logType);
      }
    });
    child.on("close", (code) => {
      const exitCode = code || 0;
      if (stderr.includes("ENOSPC") || stderr.includes("no space left on device")) {
        sendCommandLog(commandId, "错误: 磁盘空间不足，请清理缓存目录或更改缓存路径\n", "error");
      }
      sendCommandEnd(commandId, exitCode);
      resolve({
        success: exitCode === 0,
        stdout,
        stderr,
        exitCode
      });
    });
    child.on("error", (error) => {
      sendCommandLog(commandId, `执行错误: ${error.message}
`, "error");
      sendCommandEnd(commandId, 1);
      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: 1
      });
    });
  });
}
const nodeToolboxAPI = {
  // 日志监听
  onLog(callback) {
    logCallback = callback;
  },
  // 命令组监听
  onCommandStart(callback) {
    commandStartCallback = callback;
  },
  onCommandLog(callback) {
    commandLogCallback = callback;
  },
  onCommandEnd(callback) {
    commandEndCallback = callback;
  },
  // Node 版本检测
  async getNodeVersion() {
    try {
      const { stdout } = await execAsync("node -v");
      return stdout.trim();
    } catch (error) {
      console.error("获取 Node 版本失败:", error);
      return null;
    }
  },
  async getNpmVersion() {
    try {
      const { stdout } = await execAsync("npm -v");
      return stdout.trim();
    } catch (error) {
      console.error("获取 npm 版本失败:", error);
      return null;
    }
  },
  async getNodePath() {
    try {
      const command = process.platform === "win32" ? "where node" : "which node";
      const { stdout } = await execAsync(command);
      return stdout.trim().split("\n")[0];
    } catch (error) {
      console.error("获取 Node 路径失败:", error);
      return null;
    }
  },
  async getEnvironmentInfo() {
    try {
      sendLog("node -v\n");
      const nodeResult = await executeCommandWithGroup("node", ["-v"]);
      sendLog("npm -v\n");
      const npmResult = await executeCommandWithGroup("npm", ["-v"]);
      const command = process.platform === "win32" ? "where" : "which";
      sendLog(`${command} node
`);
      const nodePathResult = await executeCommandWithGroup(command, ["node"]);
      const npmPath = nodePathResult.stdout.trim().split("\n")[0] ? nodePathResult.stdout.trim().split("\n")[0].replace(/node(\.exe)?$/i, process.platform === "win32" ? "npm.cmd" : "npm") : null;
      return {
        nodeVersion: nodeResult.success ? nodeResult.stdout.trim() : null,
        npmVersion: npmResult.success ? npmResult.stdout.trim() : null,
        nodePath: nodePathResult.success ? nodePathResult.stdout.trim().split("\n")[0] : null,
        npmPath,
        logs: []
        // 不再需要 logs 数组
      };
    } catch (error) {
      console.error("获取环境信息失败:", error);
      sendLog(`错误: ${error.message}
`);
      return {
        nodeVersion: null,
        npmVersion: null,
        nodePath: null,
        npmPath: null,
        logs: []
      };
    }
  },
  // 执行命令
  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, exitCode: 0 };
    } catch (error) {
      return {
        stdout: error.stdout || "",
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  },
  // 全局包管理
  async installGlobalPackage(name, packageManager = "npm") {
    let command;
    let args;
    switch (packageManager) {
      case "pnpm":
        command = "pnpm";
        args = ["install", "-g", name];
        break;
      case "yarn":
        command = "yarn";
        args = ["global", "add", name];
        break;
      default:
        command = "npm";
        args = ["install", "-g", name];
    }
    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? void 0 : "安装失败"
    };
  },
  async updateGlobalPackage(name, packageManager = "npm") {
    let command;
    let args;
    switch (packageManager) {
      case "pnpm":
        command = "pnpm";
        args = ["update", "-g", name];
        break;
      case "yarn":
        command = "yarn";
        args = ["global", "upgrade", name];
        break;
      default:
        command = "npm";
        args = ["update", "-g", name];
    }
    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? void 0 : "更新失败"
    };
  },
  async uninstallGlobalPackage(name, packageManager = "npm") {
    let command;
    let args;
    switch (packageManager) {
      case "pnpm":
        command = "pnpm";
        args = ["uninstall", "-g", name];
        break;
      case "yarn":
        command = "yarn";
        args = ["global", "remove", name];
        break;
      default:
        command = "npm";
        args = ["uninstall", "-g", name];
    }
    const result = await executeCommandWithGroup(command, args);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.success ? void 0 : "卸载失败"
    };
  },
  async checkGlobalPackage(name) {
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
  async listGlobalPackages(packageManager = "npm") {
    try {
      let command;
      let args;
      switch (packageManager) {
        case "pnpm":
          command = "pnpm";
          args = ["list", "-g", "--depth=0", "--json"];
          break;
        case "yarn":
          command = "yarn";
          args = ["global", "list", "--json"];
          break;
        default:
          command = "npm";
          args = ["list", "-g", "--depth=0", "--json"];
      }
      const result = await executeCommandWithGroup(command, args);
      if (packageManager === "yarn") {
        const lines = result.stdout.split("\n").filter((line) => line.trim());
        const packages = [];
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "tree" && data.data && data.data.trees) {
              for (const tree of data.data.trees) {
                if (tree.name) {
                  packages.push({
                    name: tree.name.split("@")[0],
                    version: tree.name.split("@")[1] || ""
                  });
                }
              }
            }
          } catch (e) {
          }
        }
        return {
          packages,
          stdout: result.stdout || "",
          stderr: result.stderr || ""
        };
      } else {
        const data = JSON.parse(result.stdout);
        const dependencies = data.dependencies || {};
        return {
          packages: Object.entries(dependencies).map(([name, info]) => ({
            name,
            version: info.version || ""
          })),
          stdout: result.stdout || "",
          stderr: result.stderr || ""
        };
      }
    } catch (error) {
      console.error("获取全局包列表失败:", error);
      return {
        packages: [],
        stdout: error.stdout || "",
        stderr: error.stderr || error.message
      };
    }
  },
  async getLatestVersion(name) {
    try {
      const { stdout } = await execAsync(`npm view ${name} version`);
      return stdout.trim();
    } catch (error) {
      console.error(`获取 ${name} 最新版本失败:`, error);
      return null;
    }
  },
  async batchUpdatePackages(names, packageManager = "npm") {
    const results = [];
    let command;
    let args;
    switch (packageManager) {
      case "pnpm":
        command = "pnpm";
        args = ["update", "-g"];
        break;
      case "yarn":
        command = "yarn";
        args = ["global", "upgrade"];
        break;
      default:
        command = "npm";
        args = ["update", "-g"];
    }
    if (packageManager === "npm" || packageManager === "pnpm") {
      const result = await executeCommandWithGroup(command, [...args, ...names]);
      return names.map((name) => ({
        name,
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        error: result.success ? void 0 : "更新失败"
      }));
    } else {
      for (const name of names) {
        const result = await executeCommandWithGroup(command, [...args, name]);
        results.push({
          name,
          success: result.success,
          stdout: result.stdout,
          stderr: result.stderr,
          error: result.success ? void 0 : "更新失败"
        });
      }
    }
    return results;
  },
  async searchNpmPackages(keyword, packageManager = "npm") {
    try {
      const { stdout } = await execAsync(`npm search ${keyword} --json --long`);
      const results = JSON.parse(stdout);
      return {
        packages: results.slice(0, 20).map((pkg) => ({
          name: pkg.name,
          description: pkg.description || "",
          version: pkg.version || "",
          author: pkg.author?.name || pkg.author || "",
          keywords: pkg.keywords || [],
          date: pkg.date || ""
        }))
      };
    } catch (error) {
      console.error("搜索包失败:", error);
      return { packages: [] };
    }
  },
  async getPackageInfo(name) {
    try {
      const { stdout } = await execAsync(`npm view ${name} --json`);
      const info = JSON.parse(stdout);
      return {
        name: info.name || name,
        description: info.description || "",
        version: info.version || "",
        homepage: info.homepage || "",
        repository: typeof info.repository === "string" ? info.repository : info.repository?.url || "",
        author: typeof info.author === "string" ? info.author : info.author?.name || "",
        keywords: info.keywords || []
      };
    } catch (error) {
      console.error("获取包信息失败:", error);
      return null;
    }
  },
  // npmrc 文件操作
  async readNpmrc() {
    try {
      const content = await fs__namespace.readFile(getNpmrcPath(), "utf-8");
      return content;
    } catch (error) {
      return "";
    }
  },
  async writeNpmrc(content) {
    try {
      await fs__namespace.writeFile(getNpmrcPath(), content, "utf-8");
    } catch (error) {
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
      try {
        await fs__namespace.access(npmrcPath);
        await fs__namespace.copyFile(npmrcPath, backupPath);
        return backupPath;
      } catch {
        return "";
      }
    } catch (error) {
      throw new Error(`备份 .npmrc 失败: ${error.message}`);
    }
  },
  async restoreNpmrc(backupPath) {
    try {
      const npmrcPath = getNpmrcPath();
      await fs__namespace.copyFile(backupPath, npmrcPath);
    } catch (error) {
      throw new Error(`恢复 .npmrc 失败: ${error.message}`);
    }
  },
  // 文件系统操作
  async selectFolder() {
    try {
      const result = await window.naimo.dialog.showOpen({
        properties: ["openDirectory"],
        title: "选择文件夹"
      });
      if (result && result.length > 0) {
        return result[0];
      }
      return null;
    } catch (error) {
      console.error("选择文件夹失败:", error);
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
        await fs__namespace.access(profilePath);
        profileExists = true;
        enabled = await isNpmPnpmEnabled();
      } catch {
        profileExists = false;
      }
      let pnpmInstalled = false;
      let pnpmVersion;
      try {
        const { stdout } = await execAsync("pnpm --version");
        pnpmInstalled = true;
        pnpmVersion = stdout.trim();
      } catch {
        pnpmInstalled = false;
      }
      return {
        enabled,
        profileExists,
        pnpmInstalled,
        pnpmVersion
      };
    } catch (error) {
      console.error("检查 npm→pnpm 转换状态失败:", error);
      return {
        enabled: false,
        profileExists: false,
        pnpmInstalled: false
      };
    }
  },
  async enableNpmPnpmConvert() {
    try {
      if (await isNpmPnpmEnabled()) {
        return {
          success: false,
          message: "npm → pnpm 转换已经启用"
        };
      }
      try {
        await execAsync("pnpm --version");
      } catch {
        return {
          success: false,
          message: "pnpm 未安装，请先安装 pnpm"
        };
      }
      await ensureProfileExists();
      const profilePath = getPowerShellProfilePath();
      let content = "";
      try {
        content = await fs__namespace.readFile(profilePath, "utf-8");
        if (content.charCodeAt(0) === 65279) {
          content = content.slice(1);
        }
      } catch {
        content = "";
      }
      content += "\n" + POWERSHELL_CONFIG + "\n";
      await fs__namespace.writeFile(profilePath, UTF8_BOM + content, "utf-8");
      return {
        success: true,
        message: "npm → pnpm 自动转换已启用，请重新打开 PowerShell 窗口或执行 . $PROFILE"
      };
    } catch (error) {
      console.error("启用 npm→pnpm 转换失败:", error);
      return {
        success: false,
        message: `启用失败: ${error.message}`
      };
    }
  },
  async disableNpmPnpmConvert() {
    try {
      const profilePath = getPowerShellProfilePath();
      try {
        await fs__namespace.access(profilePath);
      } catch {
        return {
          success: false,
          message: "PowerShell Profile 文件不存在"
        };
      }
      if (!await isNpmPnpmEnabled()) {
        return {
          success: false,
          message: "npm → pnpm 转换未启用"
        };
      }
      let content = await fs__namespace.readFile(profilePath, "utf-8");
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      const startIndex = content.indexOf(START_MARKER);
      const endIndex = content.indexOf(END_MARKER);
      if (startIndex !== -1 && endIndex !== -1) {
        content = content.substring(0, startIndex) + content.substring(endIndex + END_MARKER.length);
        content = content.replace(/\n{3,}/g, "\n\n").trim() + "\n";
        await fs__namespace.writeFile(profilePath, UTF8_BOM + content, "utf-8");
        return {
          success: true,
          message: "npm → pnpm 自动转换已禁用，请重新打开 PowerShell 窗口或执行 . $PROFILE"
        };
      } else {
        return {
          success: false,
          message: "配置格式异常，请手动编辑 Profile 文件"
        };
      }
    } catch (error) {
      console.error("禁用 npm→pnpm 转换失败:", error);
      return {
        success: false,
        message: `禁用失败: ${error.message}`
      };
    }
  }
};
electron.contextBridge.exposeInMainWorld("nodeToolboxAPI", nodeToolboxAPI);
