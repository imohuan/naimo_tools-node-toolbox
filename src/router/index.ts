import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/node',
  },
  {
    path: '/node',
    name: 'NodeManager',
    component: () => import('../views/NodeManager.vue'),
  },
  {
    path: '/npmrc',
    name: 'NpmrcConfig',
    component: () => import('../views/NpmrcConfig.vue'),
  },
  {
    path: '/packages',
    name: 'PackagesManager',
    component: () => import('../views/PackagesManager.vue'),
  },
  {
    path: '/terminal',
    name: 'Terminal',
    component: () => import('../views/TerminalView.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;

