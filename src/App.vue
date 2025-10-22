<template>
  <div class="w-full h-full flex flex-col bg-gray-50 overflow-hidden">
    <!-- Tab 导航 -->
    <nav class="bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center justify-between px-2 py-2">
        <!-- 左侧 Tab -->
        <div class="flex items-center gap-2">
          <router-link
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            class="flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:text-indigo-600 rounded-lg transition-all font-medium relative"
            :class="{
              'text-indigo-600': $route.path === tab.path,
            }"
          >
            <Icon :name="tab.icon" size="sm" />
            <span>{{ tab.name }}</span>
            <!-- 选中指示器 -->
            <span
              v-if="$route.path === tab.path"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
            ></span>
          </router-link>

          <!-- 终端按钮 -->
          <router-link
            :to="showTerminal ? $route.path : '/terminal'"
            @click="toggleTerminal"
            class="flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:text-indigo-600 rounded-lg transition-all font-medium relative"
            :class="{
              'text-indigo-600': showTerminal,
            }"
          >
            <span
              v-if="showTerminal"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
            ></span>
            <Icon name="terminal" size="sm" />
            <span>日志</span>
            <!-- 选中指示器 -->
          </router-link>

          <div class="w-px h-6 bg-gray-200"></div>
        </div>

        <!-- 右侧自定义区域 -->
        <div class="flex items-center gap-3 h-full">
          <!-- Teleport 目标区域 -->
          <div id="tab-actions" class="flex items-center gap-3"></div>
        </div>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="flex-1 h-full overflow-auto">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Icon from "./components/Icon.vue";

const route = useRoute();

const tabs = [
  { path: "/node", name: "节点管理", icon: "server" },
  { path: "/npmrc", name: "源配置", icon: "cog" },
  { path: "/packages", name: "包管理", icon: "cube" },
];

const showTerminal = computed(() => route.path === "/terminal");

function toggleTerminal() {
  // 路由跳转由 router-link 处理
}
</script>
