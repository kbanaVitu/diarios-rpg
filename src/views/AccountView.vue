<template>
  <div>
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-user-gear"></i>
          <span>{{ t('account.kicker') }}</span>
        </div>
        <h1 class="page-folio-title">{{ t('account.title') }}</h1>
        <p class="page-folio-subtitle">
          {{ t('account.subtitle') }}
        </p>
      </div>
    </section>

    <div class="folio-card" style="max-width: 680px; margin: 0 auto;">
      <div v-if="statusMsg" :class="['archive-alert', statusType === 'error' ? 'archive-alert-error' : 'archive-alert-success']">
        <i :class="statusType === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-check'"></i>
        <span>{{ statusMsg }}</span>
      </div>

      <form @submit.prevent="saveAccount">
        <div class="form-group">
          <label class="form-label">{{ t('account.usernameLabel') }}</label>
          <input
            type="text"
            class="form-input"
            :value="authState.user?.username"
            disabled
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-display">{{ t('account.displayNameLabel') }}</label>
          <input
            id="acc-display"
            v-model="form.display_name"
            type="text"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-email">{{ t('account.emailLabel') }}</label>
          <input
            id="acc-email"
            v-model="form.email"
            type="email"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-bio">{{ t('account.bioLabel') }}</label>
          <textarea
            id="acc-bio"
            v-model="form.bio"
            class="form-textarea"
            rows="4"
            :placeholder="t('account.bioPlaceholder')"
          ></textarea>
        </div>

        <div class="archive-divider">
          <span>{{ t('account.passwordDivider') }}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="acc-curr-pass">{{ t('account.currentPasswordLabel') }}</label>
            <input
              id="acc-curr-pass"
              v-model="form.current_password"
              type="password"
              class="form-input"
              :placeholder="t('account.currentPasswordPlaceholder')"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="acc-new-pass">{{ t('account.newPasswordLabel') }}</label>
            <input
              id="acc-new-pass"
              v-model="form.new_password"
              type="password"
              class="form-input"
              :placeholder="t('account.newPasswordPlaceholder')"
            />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
          <button type="submit" class="btn-archive btn-crimson" :disabled="saving">
            <i class="fas fa-floppy-disk"></i>
            {{ saving ? t('account.savingBtn') : t('account.saveBtn') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { apiFetch, authState } from '../services/api.js';
import { t } from '../i18n/index.js';

const form = reactive({
  display_name: authState.user?.display_name || '',
  email: authState.user?.email || '',
  bio: authState.user?.bio || '',
  current_password: '',
  new_password: ''
});

const saving = ref(false);
const statusMsg = ref('');
const statusType = ref('success');

async function saveAccount() {
  saving.value = true;
  statusMsg.value = '';
  try {
    const payload = {
      display_name: form.display_name,
      email: form.email,
      bio: form.bio
    };
    if (form.new_password) {
      payload.current_password = form.current_password;
      payload.new_password = form.new_password;
    }

    const res = await apiFetch('/api/auth/account', {
      method: 'PUT',
      body: payload
    });
    authState.user = res.user;
    form.current_password = '';
    form.new_password = '';
    statusType.value = 'success';
    statusMsg.value = t('account.savedSuccess');
  } catch (err) {
    statusType.value = 'error';
    statusMsg.value = err.message || 'Falha ao atualizar a conta.';
  } finally {
    saving.value = false;
  }
}
</script>
