<template>
  <div class="modal-backdrop-archive" @click.self="$emit('close')">
    <div class="modal-folio" role="dialog" aria-modal="true">
      <div class="modal-folio-header">
        <h2 style="margin: 0; font-size: 1.45rem;">
          <i class="fas fa-feather-pointed" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
          {{ isEditing ? t('modals.character.editTitle') : t('modals.character.createTitle') }}
        </h2>
        <button type="button" class="btn-archive btn-parchment btn-sm" @click="$emit('close')">
          <i class="fas fa-xmark"></i> {{ t('modals.close') }}
        </button>
      </div>

      <div v-if="errorMsg" class="archive-alert archive-alert-error">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <div v-if="!isEditing" class="form-group">
          <label class="form-label" for="char-table">{{ t('modals.character.tableLabel') }}</label>
          <select
            id="char-table"
            v-model="form.table_id"
            class="form-select"
            :disabled="Boolean(fixedTableId)"
            required
          >
            <option value="" disabled>{{ t('modals.character.tablePlaceholder') }}</option>
            <option v-for="tbl in tables" :key="tbl.id" :value="tbl.id">
              {{ tbl.name }} ({{ tbl.system }})
            </option>
          </select>
          <div class="form-hint">{{ t('modals.character.tableHint') }}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="char-name">{{ t('modals.character.nameLabel') }}</label>
            <input
              id="char-name"
              v-model="form.name"
              type="text"
              class="form-input"
              :placeholder="t('modals.character.namePlaceholder')"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="char-title">{{ t('modals.character.titleLabel') }}</label>
            <input
              id="char-title"
              v-model="form.title"
              type="text"
              class="form-input"
              :placeholder="t('modals.character.titlePlaceholder')"
            />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="char-race">{{ t('modals.character.raceLabel') }}</label>
            <input
              id="char-race"
              v-model="form.race"
              type="text"
              list="race-suggestions"
              class="form-input"
              :placeholder="t('modals.character.racePlaceholder')"
              required
            />
            <datalist id="race-suggestions">
              <option value="Humano" />
              <option value="Elfo" />
              <option value="Alto Elfo" />
              <option value="Elfo da Floresta" />
              <option value="Anão" />
              <option value="Anão da Montanha" />
              <option value="Orc" />
              <option value="Meio-Orc" />
              <option value="Tiefling" />
              <option value="Draconato" />
              <option value="Halfling" />
              <option value="Gnomo" />
              <option value="Meio-Elfo" />
              <option value="Aasimar" />
              <option value="Golias" />
              <option value="Forjado Bélico" />
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-class">{{ t('modals.character.classLabel') }}</label>
            <input
              id="char-class"
              v-model="form.class"
              type="text"
              list="class-suggestions"
              class="form-input"
              :placeholder="t('modals.character.classPlaceholder')"
              required
            />
            <datalist id="class-suggestions">
              <option value="Guerreiro" />
              <option value="Mago" />
              <option value="Feiticeiro" />
              <option value="Ladino" />
              <option value="Clérigo" />
              <option value="Patrulheiro" />
              <option value="Bardo" />
              <option value="Paladino" />
              <option value="Druida" />
              <option value="Bárbaro" />
              <option value="Bruxo" />
              <option value="Monge" />
              <option value="Artífice" />
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label" for="char-gender">{{ t('modals.character.genderLabel') }}</label>
            <input
              id="char-gender"
              v-model="form.gender"
              type="text"
              list="gender-suggestions"
              class="form-input"
              :placeholder="t('modals.character.genderPlaceholder')"
              required
            />
            <datalist id="gender-suggestions">
              <option value="Feminino" />
              <option value="Masculino" />
              <option value="Não-binário" />
              <option value="Agênero" />
              <option value="Gênero fluido" />
            </datalist>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="char-avatar">{{ t('modals.character.avatarLabel') }}</label>
          <input
            id="char-avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="form-input"
            @change="onFileSelect"
          />
          <div class="form-hint">
            {{ isEditing ? t('modals.character.avatarHintEdit') : t('modals.character.avatarHintCreate') }}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="char-bio">{{ t('modals.character.bioLabel') }}</label>
          <textarea
            id="char-bio"
            v-model="form.biography"
            class="form-textarea"
            rows="6"
            :placeholder="t('modals.character.bioPlaceholder')"
          ></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn-archive btn-parchment" @click="$emit('close')">
            {{ t('modals.cancel') }}
          </button>
          <button type="submit" class="btn-archive btn-crimson" :disabled="submitting">
            <i class="fas fa-scroll"></i>
            {{
              submitting
                ? t('modals.character.saving')
                : isEditing
                  ? t('modals.character.saveEdit')
                  : t('modals.character.saveCreate')
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { apiFetch } from '../services/api.js';
import { t } from '../i18n/index.js';

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
    errorMsg.value = err.message || 'Falha ao salvar o perfil do personagem.';
  } finally {
    submitting.value = false;
  }
}
</script>
