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
            <span class="brand-title">RPG Diaries</span>
            <span class="brand-subtitle">Medieval Chronicle Archive</span>
          </div>
        </router-link>

        <button
          v-if="authState.user"
          type="button"
          class="mobile-menu-btn"
          aria-label="Toggle navigation"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <i :class="mobileMenuOpen ? 'fas fa-xmark' : 'fas fa-bars'"></i>
        </button>

        <nav v-if="authState.user" :class="['nav-links', { open: mobileMenuOpen }]">
          <router-link to="/" class="nav-item-link" exact-active-class="router-link-active" @click="mobileMenuOpen = false">
            <i class="fas fa-house-chimney"></i> Home
          </router-link>
          <router-link to="/tables" class="nav-item-link" @click="mobileMenuOpen = false">
            <i class="fas fa-compass"></i> My Tables
          </router-link>
          <router-link to="/characters" class="nav-item-link" @click="mobileMenuOpen = false">
            <i class="fas fa-helmet-safety"></i> Characters
          </router-link>
          <router-link to="/chronicles" class="nav-item-link" @click="mobileMenuOpen = false">
            <i class="fas fa-book-journal-whills"></i> Chronicles
          </router-link>
          <router-link to="/account" class="nav-item-link" @click="mobileMenuOpen = false">
            <i class="fas fa-user-gear"></i> Account
          </router-link>
        </nav>

        <div v-if="authState.user" class="nav-user-actions">
          <router-link to="/account" class="scribe-pill" title="Account settings">
            <i class="fas fa-feather-pointed" style="color: var(--gold-bright);"></i>
            <span>{{ authState.user.display_name }}</span>
          </router-link>
          <button
            type="button"
            class="btn-archive btn-sm"
            title="Sign out"
            @click="logout"
          >
            <i class="fas fa-right-from-bracket"></i> Sign Out
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
        RPG Diaries — “They are not merely stories; they are living memories worthy of being chronicled.”
      </span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch, authState, clearAuth } from './services/api.js';

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

