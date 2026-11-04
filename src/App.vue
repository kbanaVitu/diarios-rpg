<template>
  <div class="archive-shell">
    <!-- Top Medieval Archive Navigation -->
    <header class="archive-navbar">
      <div class="navbar-inner">
        <router-link to="/" class="brand-crest">
          <div class="brand-emblem">
            <i class="fas fa-scroll"></i>
          </div>
          <div class="brand-titles">
            <span class="brand-title">{{ t('app.title') }}</span>
          </div>
        </router-link>

        <button
          v-if="authState.user"
          type="button"
          class="mobile-menu-btn"
          :aria-label="t('nav.toggleMenu')"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <i :class="mobileMenuOpen ? 'fas fa-xmark' : 'fas fa-bars'"></i>
        </button>

        <nav v-if="authState.user" :class="['nav-links', { open: mobileMenuOpen }]">
          <router-link
            to="/"
            class="nav-item-link"
            exact-active-class="router-link-active"
            @click="mobileMenuOpen = false"
          >
            <i class="fas fa-house-chimney nav-icon"></i>
            <span>{{ t('nav.home') }}</span>
          </router-link>

          <router-link
            to="/tables"
            class="nav-item-link"
            @click="mobileMenuOpen = false"
          >
            <!-- D20 Dice Icon -->
            <svg
              class="nav-svg-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.85"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 21 7.2 21 16.8 12 22 3 16.8 3 7.2 12 2" />
              <polygon points="12 7 17.5 15.5 6.5 15.5 12 7" />
              <line x1="12" y1="2" x2="12" y2="7" />
              <line x1="21" y1="7.2" x2="17.5" y2="15.5" />
              <line x1="3" y1="7.2" x2="6.5" y2="15.5" />
              <line x1="12" y1="22" x2="17.5" y2="15.5" />
              <line x1="12" y1="22" x2="6.5" y2="15.5" />
              <line x1="3" y1="16.8" x2="6.5" y2="15.5" />
              <line x1="21" y1="16.8" x2="17.5" y2="15.5" />
            </svg>
            <span>{{ t('nav.myTables') }}</span>
          </router-link>

          <router-link
            to="/characters"
            class="nav-item-link"
            @click="mobileMenuOpen = false"
          >
            <!-- Crossed Swords Icon -->
            <svg
              class="nav-svg-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
              <line x1="13" y1="19" x2="19" y2="13" />
              <line x1="16" y1="16" x2="20" y2="20" />
              <line x1="19" y1="21" x2="21" y2="19" />
              <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
              <line x1="5" y1="14" x2="9" y2="18" />
              <line x1="7" y1="17" x2="4" y2="20" />
              <line x1="3" y1="19" x2="5" y2="21" />
            </svg>
            <span>{{ t('nav.characters') }}</span>
          </router-link>

          <router-link
            to="/chronicles"
            class="nav-item-link"
            @click="mobileMenuOpen = false"
          >
            <i class="fas fa-book-journal-whills nav-icon"></i>
            <span>{{ t('nav.chronicles') }}</span>
          </router-link>

          <router-link
            to="/account"
            class="nav-item-link"
            @click="mobileMenuOpen = false"
          >
            <i class="fas fa-user-gear nav-icon"></i>
            <span>{{ t('nav.account') }}</span>
          </router-link>
        </nav>

        <div v-if="authState.user" class="nav-user-actions">
          <router-link to="/account" class="scribe-pill" :title="t('nav.accountTooltip')">
            <i class="fas fa-feather-pointed" style="color: var(--gold-bright);"></i>
            <span>{{ authState.user.display_name }}</span>
          </router-link>
          <button
            type="button"
            class="btn-archive btn-sm"
            :title="t('nav.signOut')"
            @click="logout"
          >
            <i class="fas fa-right-from-bracket"></i> {{ t('nav.signOut') }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="archive-main">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="archive-footer">
      <span>
        <i class="fas fa-scroll" style="color: var(--gold-accent); margin-right: 0.35rem;"></i>
        {{ t('app.footerQuote') }}
      </span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch, authState, clearAuth } from './services/api.js';
import { t } from './i18n/index.js';

const router = useRouter();
const mobileMenuOpen = ref(false);

async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network error on logout
  }
  clearAuth();
  mobileMenuOpen.value = false;
  router.push('/login');
}
</script>
