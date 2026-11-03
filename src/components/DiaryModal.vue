<template>
  <div class="modal-backdrop-archive" @click.self="$emit('close')">
    <div class="modal-folio" style="max-width: 760px;" role="dialog" aria-modal="true">
      <div class="modal-folio-header">
        <h2 style="margin: 0; font-size: 1.45rem;">
          <i class="fas fa-book-journal-whills" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
          {{ isEditing ? 'Revise Chronicle Entry' : 'Inscribe New Diary Entry' }}
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
          <label class="form-label" for="diary-character">Associated Character *</label>
          <select
            id="diary-character"
            v-model="form.character_id"
            class="form-select"
            :disabled="isEditing || Boolean(fixedCharacterId)"
            required
          >
            <option value="" disabled>Select the character chronicling this entry...</option>
            <option v-for="c in availableCharacters" :key="c.id" :value="c.id">
              {{ c.name }} — {{ c.race }} {{ c.class }} ({{ c.table_name || 'Campaign' }})
            </option>
          </select>
          <div class="form-hint">
            {{
              fixedCharacterId
                ? 'Automatically bound to this character profile.'
                : 'Every diary entry must be bound to a character in an RPG table.'
            }}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="diary-title">Chronicle Title *</label>
            <input
              id="diary-title"
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="e.g., Whispers in the Sunken Reliquary"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="diary-session">Session / In-Game Date</label>
            <input
              id="diary-session"
              v-model="form.session_label"
              type="text"
              class="form-input"
              placeholder="e.g., Session IV • Year 1042"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="diary-content">Manuscript Content *</label>
          <textarea
            id="diary-content"
            v-model="form.content"
            class="form-textarea form-textarea-manuscript"
            rows="11"
            placeholder="Write the chronicle from your character's perspective..."
            required
          ></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn-archive btn-parchment" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="btn-archive btn-crimson" :disabled="submitting">
            <i class="fas fa-feather-pointed"></i>
            {{ submitting ? 'Sealing Wax...' : isEditing ? 'Save Entry' : 'Publish to Chronicle' }}
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
  entry: {
    type: Object,
    default: null
  },
  characters: {
    type: Array,
    default: () => []
  },
  fixedCharacterId: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const isEditing = computed(() => Boolean(props.entry && props.entry.id));

const availableCharacters = computed(() => {
  return props.characters.filter((c) => c.can_write_diary !== false);
});

const form = reactive({
  character_id:
    props.fixedCharacterId ||
    (props.entry ? props.entry.character_id : availableCharacters.value[0]?.id || ''),
  title: props.entry?.title || '',
  session_label: props.entry?.session_label || '',
  content: props.entry?.content || ''
});

const submitting = ref(false);
const errorMsg = ref('');

async function handleSubmit() {
  errorMsg.value = '';
  submitting.value = true;

  try {
    if (isEditing.value) {
      const res = await apiFetch(`/api/diaries/${props.entry.id}`, {
        method: 'PUT',
        body: {
          title: form.title,
          session_label: form.session_label,
          content: form.content
        }
      });
      emit('saved', res.entry);
    } else {
      const res = await apiFetch('/api/diaries', {
        method: 'POST',
        body: {
          character_id: Number(form.character_id),
          title: form.title,
          session_label: form.session_label,
          content: form.content
        }
      });
      emit('saved', res.entry);
    }
  } catch (err) {
    errorMsg.value = err.message || 'Failed to record diary entry.';
  } finally {
    submitting.value = false;
  }
}
</script>

