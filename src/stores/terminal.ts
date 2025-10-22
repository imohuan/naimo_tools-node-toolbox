import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface TerminalLog {
  type: 'info' | 'success' | 'warning' | 'error' | 'command-group';
  message: string;
  time: string;
  // 命令组相关字段
  commandId?: string;
  command?: string;
  status?: 'running' | 'success' | 'error';
  exitCode?: number;
  collapsed?: boolean;
  commandLogs?: Array<{
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    time: string;
  }>;
}

export const useTerminalStore = defineStore('terminal', () => {
  const logs = ref<TerminalLog[]>([]);

  function getTimeString(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  function log(type: TerminalLog['type'], message: string) {
    const time = getTimeString();
    logs.value.push({ type, message, time });
  }

  function clear() {
    logs.value = [];
  }

  function info(message: string) {
    log('info', message);
  }

  function success(message: string) {
    log('success', message);
  }

  function warning(message: string) {
    log('warning', message);
  }

  function error(message: string) {
    log('error', message);
  }

  // 添加原始日志（不带时间戳，直接显示）
  function raw(message: string) {
    if (!message) return;

    const time = getTimeString();

    // 按行分割并添加每一行（保留空行）
    const lines = message.split('\n');
    lines.forEach((line, index) => {
      // 最后一行如果为空则跳过（避免额外的空行）
      if (index === lines.length - 1 && line === '') return;
      logs.value.push({ type: 'info', message: line, time });
    });
  }

  // 命令组管理（在日志流中）
  function startCommand(command: string, commandId?: string): string {
    const id = commandId || `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = getTimeString();

    // 在日志流中添加命令组日志项
    logs.value.push({
      type: 'command-group',
      message: command,
      time: startTime,
      commandId: id,
      command,
      status: 'running',
      collapsed: true, // 默认折叠，只显示最后几行
      commandLogs: [],
    });

    return id;
  }

  function addCommandLog(commandId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    // 找到对应的命令组日志
    const commandLog = logs.value.find(log => log.type === 'command-group' && log.commandId === commandId);
    if (!commandLog || !commandLog.commandLogs) return;

    const time = getTimeString();

    // 按行分割并添加每一行
    const lines = message.split('\n');
    lines.forEach((line, index) => {
      // 最后一行如果为空则跳过
      if (index === lines.length - 1 && line === '') return;
      commandLog.commandLogs!.push({ type, message: line, time });
    });
  }

  function endCommand(commandId: string, exitCode: number) {
    const commandLog = logs.value.find(log => log.type === 'command-group' && log.commandId === commandId);
    if (!commandLog) return;

    commandLog.exitCode = exitCode;
    commandLog.status = exitCode === 0 ? 'success' : 'error';

    // 失败的命令默认展开
    if (exitCode !== 0) {
      commandLog.collapsed = false;
    }
  }

  function toggleCommandCollapse(commandId: string) {
    const commandLog = logs.value.find(log => log.type === 'command-group' && log.commandId === commandId);
    if (commandLog) {
      commandLog.collapsed = !commandLog.collapsed;
    }
  }

  return {
    logs,
    log,
    clear,
    info,
    success,
    warning,
    error,
    raw,
    startCommand,
    addCommandLog,
    endCommand,
    toggleCommandCollapse,
  };
});

