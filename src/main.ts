/// <reference path="../typings/naimo.d.ts" />

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import { useTerminalStore } from './stores/terminal';

// 创建应用实例
const app = createApp(App);

// 使用插件
const pinia = createPinia();
app.use(pinia);
app.use(router);

// 挂载应用
app.mount('#app');

// 注册日志监听器（在应用挂载后）
const terminalStore = useTerminalStore();
if (window.nodeToolboxAPI && window.nodeToolboxAPI.onLog) {
  window.nodeToolboxAPI.onLog((data: string) => {
    console.log('[实时日志]', data); // 调试用
    terminalStore.raw(data);
  });
  console.log('✅ 日志监听器已注册');
} else {
  console.error('❌ nodeToolboxAPI 不可用');
}

// 注册命令组监听器
if (window.nodeToolboxAPI) {
  if (window.nodeToolboxAPI.onCommandStart) {
    window.nodeToolboxAPI.onCommandStart((commandId: string, command: string) => {
      console.log('[命令开始]', commandId, command);
      const id = terminalStore.startCommand(command, commandId);
      console.log('[命令组创建]', id);
    });
    console.log('✅ onCommandStart 已注册');
  } else {
    console.warn('⚠️ onCommandStart 不存在');
  }

  if (window.nodeToolboxAPI.onCommandLog) {
    window.nodeToolboxAPI.onCommandLog((commandId: string, message: string, type?: 'info' | 'error' | 'warning') => {
      console.log('[命令日志]', commandId, type, message.substring(0, 50));
      terminalStore.addCommandLog(commandId, message, type || 'info');
    });
    console.log('✅ onCommandLog 已注册');
  } else {
    console.warn('⚠️ onCommandLog 不存在');
  }

  if (window.nodeToolboxAPI.onCommandEnd) {
    window.nodeToolboxAPI.onCommandEnd((commandId: string, exitCode: number) => {
      console.log('[命令结束]', commandId, exitCode);
      terminalStore.endCommand(commandId, exitCode);
    });
    console.log('✅ onCommandEnd 已注册');
  } else {
    console.warn('⚠️ onCommandEnd 不存在');
  }

  console.log('✅ 命令组监听器已注册');
  console.log('当前 API 对象:', window.nodeToolboxAPI);
} else {
  console.error('❌ nodeToolboxAPI 不存在');
}

// 热重载
if (import.meta.hot) {
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data);
    console.log('🔨 正在触发 preload 构建...');
    try {
      const response = await fetch('/__preload_build');
      const result = await response.json();
      if (result.success) {
        console.log('✅ Preload 构建完成');
        await window.naimo.hot();
        console.log('🔄 Preload 热重载完成');
        location.reload();
      } else {
        console.error('❌ Preload 构建失败');
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error);
    }
  });
}
