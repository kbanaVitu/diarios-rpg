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
          <span>{{ t('auth.kicker') }}</span>
        </div>
        <h1 style="font-family: var(--font-display); font-size: 1.85rem; margin: 0 0 0.35rem;">
          {{ t('app.title') }}
        </h1>
        <p style="margin: 0; color: var(--ink-secondary); font-size: 0.98rem;">
          {{ t('auth.subtitle') }}
        </p>
      </div>

      <div class="archive-tabs" style="justify-content: center; margin-bottom: 1.4rem;">
        <button
          type="button"
          :class="['archive-tab-btn', { active: mode === 'login' }]"
          @click="switchMode('login')"
        >
          <i class="fas fa-key"></i> {{ t('auth.signInTab') }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: mode === 'register' }]"
          @click="switchMode('register')"
        >
          <i class="fas fa-feather-pointed"></i> {{ t('auth.registerTab') }}
        </button>
      </div>

      <div v-if="errorMsg" class="archive-alert archive-alert-error">
        <i class="fas fa-circle-exclamation"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- LOGIN FORM -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="login-username">{{ t('auth.usernameOrEmail') }}</label>
          <input
            id="login-username"
            v-model="loginForm.username"
            type="text"
            class="form-input"
            :placeholder="t('auth.usernameOrEmailPlaceholder')"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="login-password">{{ t('auth.password') }}</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            class="form-input"
            :placeholder="t('auth.passwordPlaceholder')"
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
          {{ loading ? t('auth.enteringArchive') : t('auth.enterArchive') }}
        </button>
      </form>

      <!-- REGISTER FORM -->
      <form v-else @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label" for="reg-username">{{ t('auth.username') }}</label>
          <input
            id="reg-username"
            v-model="registerForm.username"
            type="text"
            class="form-input"
            :placeholder="t('auth.usernamePlaceholder')"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-display">{{ t('auth.displayName') }}</label>
          <input
            id="reg-display"
            v-model="registerForm.display_name"
            type="text"
            class="form-input"
            :placeholder="t('auth.displayNamePlaceholder')"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-email">{{ t('auth.email') }}</label>
          <input
            id="reg-email"
            v-model="registerForm.email"
            type="email"
            class="form-input"
            :placeholder="t('auth.emailPlaceholder')"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-password">{{ t('auth.passwordMin') }}</label>
          <input
            id="reg-password"
            v-model="registerForm.password"
            type="password"
            class="form-input"
            :placeholder="t('auth.passwordCreatePlaceholder')"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-bio">{{ t('auth.bioOptional') }}</label>
          <input
            id="reg-bio"
            v-model="registerForm.bio"
            type="text"
            class="form-input"
            :placeholder="t('auth.bioPlaceholder')"
          />
        </div>

        <button
          type="submit"
          class="btn-archive btn-crimson"
          style="width: 100%; margin-top: 0.5rem;"
          :disabled="loading"
        >
          <i class="fas fa-scroll"></i>
          {{ loading ? t('auth.creatingAccount') : t('auth.createAccount') }}
        </button>
      </form>

      <div class="archive-divider">
        <span>{{ t('auth.demoDivider') }}</span>
      </div>

      <div style="font-size: 0.88rem; color: var(--ink-muted); text-align: center;">
        <div style="margin-bottom: 0.5rem;">{{ t('auth.demoHint') }}</div>
        <div style="display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">
          <button
            type="button"
            class="btn-archive btn-parchment btn-sm"
            @click="quickLogin('aldric', 'archive123')"
          >
            <i class="fas fa-crown"></i> Mestre Aldric
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
import { t } from '../i18n/index.js';

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
    errorMsg.value = err.message || t('auth.signInFailed');
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
    errorMsg.value = err.message || t('auth.registerFailed');
  } finally {
    loading.value = false;
  }
}
</script>
