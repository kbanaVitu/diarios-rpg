import { createRouter, createWebHistory } from 'vue-router';
import { authState, initAuth } from './services/api.js';

import AuthView from './views/AuthView.vue';
import DashboardView from './views/DashboardView.vue';
import TablesView from './views/TablesView.vue';
import TableDetailView from './views/TableDetailView.vue';
import CharactersView from './views/CharactersView.vue';
import CharacterProfileView from './views/CharacterProfileView.vue';
import ChroniclesView from './views/ChroniclesView.vue';
import AccountView from './views/AccountView.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: AuthView,
    meta: { guestOnly: true }
  },
  {
    path: '/',
    name: 'home',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/tables',
    name: 'tables',
    component: TablesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/tables/:id',
    name: 'table-detail',
    component: TableDetailView,
    meta: { requiresAuth: true }
  },
  {
    path: '/characters',
    name: 'characters',
    component: CharactersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/characters/:id',
    name: 'character-profile',
    component: CharacterProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/chronicles',
    name: 'chronicles',
    component: ChroniclesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/account',
    name: 'account',
    component: AccountView,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to) => {
  if (!authState.initialized) {
    await initAuth();
  }

  if (to.meta.requiresAuth && !authState.user) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && authState.user) {
    return { name: 'home' };
  }

  return true;
});

export default router;

