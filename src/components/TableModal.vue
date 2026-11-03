<template>
  <div class="modal-backdrop-archive" @click.self="$emit('close')">
    <div class="modal-folio" role="dialog" aria-modal="true">
      <div class="modal-folio-header">
        <h2 style="margin: 0; font-size: 1.45rem;">
          <i class="fas fa-compass-drafting" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
          {{ isEditing ? 'Update RPG Table Charter' : 'Charter New RPG Table' }}
        </h2>
        <button type="button" class="btn-archive btn-parchment btn-sm" @click="$emit('close')">
          <i class="fas fa-xmark"></i> Close
        </button>
      </div>

      <div v-if="errorMsg" class="archive-alert archive-alert-error">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="table-name">Campaign / RPG Table Name *</label>
          <input
            id="table-name"
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="e.g., The Ashen Crown of Valdoria"
            required
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="table-system">Rule System / Setting</label>
            <input
              id="table-system"
              v-model="form.system"
              type="text"
              class="form-input"
              placeholder="e.g., D&D 5e, Tormenta20, Pathfinder"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="table-era">Campaign Era / Calendar</label>
            <input
              id="table-era"
              v-model="form.era_label"
              type="text"
              class="form-input"
              placeholder="e.g., Year 1042 of the Third Sun"
            />
          </div>
        </div>

        <div v-if="isEditing" class="form-group">
          <label class="form-label" for="table-status">Campaign Status</label>
          <select id="table-status" v-model="form.status" class="form-select">
            <option value="active">Active Chronicle</option>
            <option value="hiatus">On Hiatus</option>
            <option value="completed">Completed Saga</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="table-desc">Campaign Premise & Lore Synopsis</label>
          <textarea
            id="table-desc"
            v-model="form.description"
            class="form-textarea"
            rows="5"
            placeholder="Describe the world, the central conflict, or the oaths that bind this gaming group..."
          ></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn-archive btn-parchment" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="btn-archive btn-crimson" :disabled="submitting">
            <i class="fas fa-stamp"></i>
            {{ submitting ? 'Sealing Charter...' : isEditing ? 'Save Charter' : 'Create RPG Table' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { apiFetch } from '../services/api.js';

const props = defineProps({
  table: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const isEditing = computed(() => Boolean(props.table && props.table.id));

const form = reactive({
  name: props.table?.name || '',
  system: props.table?.system || 'Dungeons & Dragons 5e',
  era_label: props.table?.era_label || 'First Age of Chronicles',
  status: props.table?.status || 'active',
  description: props.table?.description || ''
});

const submitting = ref(false);
const errorMsg = ref('');

async function handleSubmit() {
  errorMsg.value = '';
  submitting.value = true;

  try {
    if (isEditing.value) {
      const res = await apiFetch(`/api/tables/${props.table.id}`, {
        method: 'PUT',
        body: { ...form }
      });
      emit('saved', res.table);
    } else {
      const res = await apiFetch('/api/tables', {
        method: 'POST',
        body: { ...form }
      });
      emit('saved', res.table);
    }
  } catch (err) {
    errorMsg.value = err.message || 'Failed to save RPG table.';
  } finally {
    submitting.value = false;
  }
}
</script>

