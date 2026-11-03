<template>
  <div v-if="entry" class="modal-backdrop-archive" @click.self="$emit('close')">
    <div class="modal-folio" style="max-width: 820px; padding: 2.25rem;" role="dialog" aria-modal="true">
      <div class="modal-folio-header">
        <div>
          <div class="page-folio-kicker">
            <i class="fas fa-scroll"></i>
            <span>{{ entry.table_name }}</span>
            <span v-if="entry.session_label">• {{ entry.session_label }}</span>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">{{ entry.title }}</h2>
        </div>
        <button type="button" class="btn-archive btn-parchment btn-sm" @click="$emit('close')">
          <i class="fas fa-xmark"></i> Close Folio
        </button>
      </div>

      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0.85rem 1.1rem;
          background: var(--parchment-deep);
          border: 1px solid var(--parchment-border-dark);
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
        "
      >
        <router-link
          :to="`/characters/${entry.character_id}`"
          style="display: flex; align-items: center; gap: 0.85rem; color: var(--ink-primary);"
          @click="$emit('close')"
        >
          <CharacterAvatar :name="entry.character_name" :avatarUrl="entry.character_avatar" size="sm" />
          <div>
            <div style="font-family: var(--font-heading); font-weight: 700; font-size: 1rem;">
              {{ entry.character_name }}
            </div>
            <div style="font-size: 0.85rem; color: var(--ink-muted);">
              {{ entry.character_race }} {{ entry.character_class }} • Scribe: {{ entry.author_name }}
            </div>
          </div>
        </router-link>

        <div style="text-align: right; font-size: 0.85rem; color: var(--ink-muted);">
          <div>Inscribed: {{ formatArchiveDateTime(entry.created_at) }}</div>
          <div v-if="entry.updated_at && entry.updated_at !== entry.created_at">
            Amended: {{ formatArchiveDateTime(entry.updated_at) }}
          </div>
        </div>
      </div>

      <div class="chronicle-body-text" style="padding: 0.5rem 0.25rem 1.5rem;">{{ entry.content }}</div>

      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--parchment-border);
          padding-top: 1.1rem;
        "
      >
        <router-link
          :to="`/characters/${entry.character_id}`"
          class="btn-archive btn-parchment btn-sm"
          @click="$emit('close')"
        >
          <i class="fas fa-user-shield"></i> Open Character Dossier
        </router-link>

        <div v-if="entry.can_edit" style="display: flex; gap: 0.6rem;">
          <button type="button" class="btn-archive btn-parchment btn-sm" @click="$emit('edit', entry)">
            <i class="fas fa-pen-nib"></i> Edit Entry
          </button>
          <button type="button" class="btn-archive btn-danger-outline btn-sm" @click="$emit('delete', entry)">
            <i class="fas fa-trash-can"></i> Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import CharacterAvatar from './CharacterAvatar.vue';
import { formatArchiveDateTime } from '../services/api.js';

defineProps({
  entry: {
    type: Object,
    default: null
  }
});

defineEmits(['close', 'edit', 'delete']);
</script>

