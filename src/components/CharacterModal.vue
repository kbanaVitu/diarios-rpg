<template>
  <div class="modal-backdrop-archive" @click.self="$emit('close')">
    <div class="modal-folio" role="dialog" aria-modal="true">
      <div class="modal-folio-header">
        <h2 style="margin: 0; font-size: 1.45rem;">
          <i class="fas fa-feather-pointed" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
          {{ isEditing ? 'Amend Character Dossier' : 'Inscribe New Character' }}
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
        <div v-if="!isEditing" class="form-group">
          <label class="form-label" for="char-table">RPG Table (Campaign) *</label>
          <select
            id="char-table"
            v-model="form.table_id"
            class="form-select"
            :disabled="Boolean(fixedTableId)"
            required
          >
            <option value="" disabled>Select an RPG Table...</option>
            <option v-for="t in tables" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.system }})
            </option>
          </select>
          <div class="form-hint">Every character must belong to an authorized RPG table.</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="char-name">Character Name *</label>
            <input
              id="char-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g., Seraphina Vale"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="char-title">Title or Epithet</label>
            <input
              id="char-title"
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="e.g., Keeper of the Ember Reliquary"
            />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="char-race">Race / Ancestry *</label>
            <input
              id="char-race"
              v-model="form.race"
              type="text"
              list="race-suggestions"
              class="form-input"
              placeholder="e.g., Elf, Tiefling, Custom..."
              required
            />
            <datalist id="race-suggestions">
              <option value="Human" />
              <option value="Elf" />
              <option value="High Elf" />
              <option value="Wood Elf" />
              <option value="Dwarf" />
              <option value="Mountain Dwarf" />
              <option value="Orc" />
              <option value="Half-Orc" />
              <option value="Tiefling" />
              <option value="Dragonborn" />
              <option value="Halfling" />
              <option value="Gnome" />
              <option value="Half-Elf" />
              <option value="Aasimar" />
              <option value="Goliath" />
              <option value="Warforged" />
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-class">Class / Calling *</label>
            <input
              id="char-class"
              v-model="form.class"
              type="text"
              list="class-suggestions"
              class="form-input"
              placeholder="e.g., Warrior, Mage, Custom..."
              required
            />
            <datalist id="class-suggestions">
              <option value="Warrior" />
              <option value="Fighter" />
              <option value="Mage" />
              <option value="Wizard" />
              <option value="Sorcerer" />
              <option value="Rogue" />
              <option value="Cleric" />
              <option value="Ranger" />
              <option value="Bard" />
              <option value="Paladin" />
              <option value="Druid" />
              <option value="Barbarian" />
              <option value="Warlock" />
              <option value="Monk" />
              <option value="Artificer" />
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-gender">Gender *</label>
            <input
              id="char-gender"
              v-model="form.gender"
              type="text"
              list="gender-suggestions"
              class="form-input"
              placeholder="e.g., Female, Male, Non-binary..."
              required
            />
            <datalist id="gender-suggestions">
              <option value="Female" />
              <option value="Male" />
              <option value="Non-binary" />
              <option value="Agender" />
              <option value="Genderfluid" />
            </datalist>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="char-avatar">Profile Portrait (PNG, JPEG, WebP, GIF — Max 5MB)</label>
          <input
            id="char-avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="form-input"
            @change="onFileSelect"
          />
          <div class="form-hint">
            {{ isEditing ? 'Select an image only if you wish to replace the current portrait.' : 'Optional. A medieval archive crest will be used if left blank.' }}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="char-bio">Character Biography & Background</label>
          <textarea
            id="char-bio"
            v-model="form.biography"
            class="form-textarea"
            rows="6"
            placeholder="Record the character's origin, personality, oaths, scars, and ambitions..."
          ></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn-archive btn-parchment" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="btn-archive btn-crimson" :disabled="submitting">
            <i class="fas fa-scroll"></i>
            {{ submitting ? 'Inscribing...' : isEditing ? 'Save Changes' : 'Create Character' }}
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
  character: {
    type: Object,
    default: null
  },
  tables: {
    type: Array,
    default: () => []
  },
  fixedTableId: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const isEditing = computed(() => Boolean(props.character && props.character.id));

const form = reactive({
  table_id: props.fixedTableId || (props.character ? props.character.table_id : props.tables[0]?.id || ''),
  name: props.character?.name || '',
  title: props.character?.title || '',
  race: props.character?.race || '',
  class: props.character?.class || props.character?.character_class || '',
  gender: props.character?.gender || '',
  biography: props.character?.biography || ''
});

const selectedFile = ref(null);
const submitting = ref(false);
const errorMsg = ref('');

function onFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  selectedFile.value = file || null;
}

async function handleSubmit() {
  errorMsg.value = '';
  submitting.value = true;

  try {
    let savedChar;
    if (isEditing.value) {
      const res = await apiFetch(`/api/characters/${props.character.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          title: form.title,
          race: form.race,
          class: form.class,
          gender: form.gender,
          biography: form.biography
        }
      });
      savedChar = res.character;

      if (selectedFile.value) {
        const fd = new FormData();
        fd.append('avatar', selectedFile.value);
        const avatarRes = await apiFetch(`/api/characters/${props.character.id}/avatar`, {
          method: 'POST',
          body: fd
        });
        savedChar = avatarRes.character;
      }
    } else {
      const fd = new FormData();
      fd.append('table_id', String(form.table_id));
      fd.append('name', form.name);
      fd.append('title', form.title);
      fd.append('race', form.race);
      fd.append('class', form.class);
      fd.append('gender', form.gender);
      fd.append('biography', form.biography);
      if (selectedFile.value) {
        fd.append('avatar', selectedFile.value);
      }

      const res = await apiFetch('/api/characters', {
        method: 'POST',
        body: fd
      });
      savedChar = res.character;
    }

    emit('saved', savedChar);
  } catch (err) {
    errorMsg.value = err.message || 'Failed to save character dossier.';
  } finally {
    submitting.value = false;
  }
}
</script>

