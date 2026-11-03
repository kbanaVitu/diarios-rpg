<template>
  <div>
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-user-gear"></i>
          <span>Scribe Credentials & Seal</span>
        </div>
        <h1 class="page-folio-title">Account Settings</h1>
        <p class="page-folio-subtitle">
          Manage your scribe identity, contact details, and archive passphrase.
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
          <label class="form-label">Username (Immutable Seal)</label>
          <input
            type="text"
            class="form-input"
            :value="authState.user?.username"
            disabled
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-display">Display Name *</label>
          <input
            id="acc-display"
            v-model="form.display_name"
            type="text"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-email">Email Address *</label>
          <input
            id="acc-email"
            v-model="form.email"
            type="email"
            class="form-input"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="acc-bio">Scribe Biography / Motto</label>
          <textarea
            id="acc-bio"
            v-model="form.bio"
            class="form-textarea"
            rows="4"
            placeholder="Share your role in the group or favorite campaign settings..."
          ></textarea>
        </div>

        <div class="archive-divider">
          <span>Update Passphrase (Optional)</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="acc-curr-pass">Current Password</label>
            <input
              id="acc-curr-pass"
              v-model="form.current_password"
              type="password"
              class="form-input"
              placeholder="Required only if changing password"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="acc-new-pass">New Password (min. 6 chars)</label>
            <input
              id="acc-new-pass"
              v-model="form.new_password"
              type="password"
              class="form-input"
              placeholder="Leave blank to keep current"
            />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
          <button type="submit" class="btn-archive btn-crimson" :disabled="saving">
            <i class="fas fa-floppy-disk"></i>
            {{ saving ? 'Updating Seal...' : 'Save Account Settings' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { apiFetch, authState } from '../services/api.js';

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
    statusMsg.value = 'Account settings updated in the Archive.';
  } catch (err) {
    statusType.value = 'error';
    statusMsg.value = err.message || 'Failed to update account.';
  } finally {
    saving.value = false;
  }
}
</script>

