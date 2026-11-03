<template>
  <div class="auth-sanctum">
    <div class="auth-codex">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div
          class="brand-emblem"
          style="width: 58px; height: 58px; margin: 0 auto 0.85rem; font-size: 1.5rem;"
        >
          <i class="fas fa-scroll"></i>
        </div>
        <div class="page-folio-kicker" style="justify-content: center;">
          <span>Chronicle Repository</span>
        </div>
        <h1 style="font-family: var(--font-display); font-size: 1.85rem; margin: 0 0 0.35rem;">
          RPG Diaries
        </h1>
        <p style="margin: 0; color: var(--ink-secondary); font-size: 0.98rem;">
          Enter the Medieval Archive to preserve your tables, heroes, and campaign chronicles.
        </p>
      </div>

      <div class="archive-tabs" style="justify-content: center; margin-bottom: 1.4rem;">
        <button
          type="button"
          :class="['archive-tab-btn', { active: mode === 'login' }]"
          @click="switchMode('login')"
        >
          <i class="fas fa-key"></i> Sign In
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: mode === 'register' }]"
          @click="switchMode('register')"
        >
          <i class="fas fa-feather-pointed"></i> Register Scribe
        </button>
      </div>

      <div v-if="errorMsg" class="archive-alert archive-alert-error">
        <i class="fas fa-circle-exclamation"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- LOGIN FORM -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="login-username">Username or Email</label>
          <input
            id="login-username"
            v-model="loginForm.username"
            type="text"
            class="form-input"
            placeholder="e.g., aldric"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="login-password">Secret Passphrase</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            class="form-input"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          class="btn-archive btn-crimson"
          style="width: 100%; margin-top: 0.5rem;"
          :disabled="loading"
        >
          <i class="fas fa-door-open"></i>
          {{ loading ? 'Unsealing Archive...' : 'Enter the Archive' }}
        </button>
      </form>

      <!-- REGISTER FORM -->
      <form v-else @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label" for="reg-username">Username *</label>
          <input
            id="reg-username"
            v-model="registerForm.username"
            type="text"
            class="form-input"
            placeholder="e.g., rowan_scribe"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-display">Display Name (Scribe Title) *</label>
          <input
            id="reg-display"
            v-model="registerForm.display_name"
            type="text"
            class="form-input"
            placeholder="e.g., Rowan of Westmarch"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-email">Email Address *</label>
          <input
            id="reg-email"
            v-model="registerForm.email"
            type="email"
            class="form-input"
            placeholder="rowan@guild.rpg"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-password">Password (min. 6 characters) *</label>
          <input
            id="reg-password"
            v-model="registerForm.password"
            type="password"
            class="form-input"
            placeholder="Create a strong passphrase"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-bio">Scribe Motto / Bio (Optional)</label>
          <input
            id="reg-bio"
            v-model="registerForm.bio"
            type="text"
            class="form-input"
            placeholder="Chronicler of the Northern Marches..."
          />
        </div>

        <button
          type="submit"
          class="btn-archive btn-crimson"
          style="width: 100%; margin-top: 0.5rem;"
          :disabled="loading"
        >
          <i class="fas fa-scroll"></i>
          {{ loading ? 'Inscribing Account...' : 'Create Archive Account' }}
        </button>
      </form>

      <div class="archive-divider">
        <span>Guild Demo Scribes</span>
      </div>

      <div style="font-size: 0.88rem; color: var(--ink-muted); text-align: center;">
        <div style="margin-bottom: 0.5rem;">Quick sign-in with seeded campaign accounts:</div>
        <div style="display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">
          <button
            type="button"
            class="btn-archive btn-parchment btn-sm"
            @click="quickLogin('aldric', 'archive123')"
          >
            <i class="fas fa-crown"></i> Master Aldric
          </button>
          <button
            type="button"
            class="btn-archive btn-parchment btn-sm"
            @click="quickLogin('elena', 'archive123')"
          >
            <i class="fas fa-wand-sparkles"></i> Elena Thorne
          </button>
          <button
            type="button"
            class="btn-archive btn-parchment btn-sm"
            @click="quickLogin('kaelen', 'archive123')"
          >
            <i class="fas fa-shield-halved"></i> Kaelen Ashwood
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch, setAuth } from '../services/api.js';

const router = useRouter();
const mode = ref('login');
const loading = ref(false);
const errorMsg = ref('');

const loginForm = reactive({
  username: '',
  password: ''
});

const registerForm = reactive({
  username: '',
  display_name: '',
  email: '',
  password: '',
  bio: ''
});

function switchMode(next) {
  mode.value = next;
  errorMsg.value = '';
}

async function handleLogin() {
  errorMsg.value = '';
  loading.value = true;
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: loginForm.username,
        password: loginForm.password
      }
    });
    setAuth(res.token, res.user);
    router.push('/');
  } catch (err) {
    errorMsg.value = err.message || 'Sign in failed.';
  } finally {
    loading.value = false;
  }
}

async function quickLogin(username, password) {
  loginForm.username = username;
  loginForm.password = password;
  await handleLogin();
}

async function handleRegister() {
  errorMsg.value = '';
  loading.value = true;
  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { ...registerForm }
    });
    setAuth(res.token, res.user);
    router.push('/');
  } catch (err) {
    errorMsg.value = err.message || 'Registration failed.';
  } finally {
    loading.value = false;
  }
}
</script>

