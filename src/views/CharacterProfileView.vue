<template>
  <div>
    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">Unsealing character dossier & personal chronicle...</p>
    </div>

    <div v-else-if="errorMsg" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <div class="archive-alert archive-alert-error" style="justify-content: center;">
        <i class="fas fa-lock"></i>
        <span>{{ errorMsg }}</span>
      </div>
      <router-link to="/characters" class="btn-archive btn-parchment">
        <i class="fas fa-arrow-left"></i> Back to Characters
      </router-link>
    </div>

    <template v-else-if="character">
      <!-- SOCIAL-NETWORK INSPIRED MEDIEVAL CHARACTER PROFILE HERO -->
      <section class="dossier-hero">
        <div class="dossier-cover-banner">
          <router-link :to="`/tables/${character.table_id}`" class="dossier-cover-SaveLink">
            <i class="fas fa-compass"></i>
            <span>Campaign: {{ character.table_name }} ({{ character.table_system }})</span>
          </router-link>

          <div v-if="character.can_edit" style="display: flex; gap: 0.5rem;">
            <button type="button" class="dossier-cover-SaveLink" style="cursor: pointer;" @click="showEditModal = true">
              <i class="fas fa-user-pen"></i> Edit Profile
            </button>
            <button
              type="button"
              class="dossier-cover-SaveLink"
              style="cursor: pointer; border-color: rgba(220, 80, 70, 0.7);"
              @click="deleteCharacter"
            >
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="dossier-identity-bar">
          <div class="dossier-avatar-cluster">
            <div class="dossier-avatar-wrapper">
              <CharacterAvatar :name="character.name" :avatarUrl="character.avatar_url" size="xl" />

              <!-- Direct Portrait Upload Button for Character Owner / Admin -->
              <label
                v-if="character.can_edit"
                class="avatar-upload-trigger"
                title="Upload or replace character portrait"
              >
                <i :class="uploadingAvatar ? 'fas fa-spinner fa-spin' : 'fas fa-camera'"></i>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style="display: none;"
                  :disabled="uploadingAvatar"
                  @change="handleAvatarUpload"
                />
              </label>
            </div>

            <div class="dossier-name-block">
              <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <h1 class="dossier-char-name">{{ character.name }}</h1>
                <span v-if="character.is_owner" class="badge-seal badge-owner">
                  <i class="fas fa-feather-pointed"></i> Your Character
                </span>
              </div>

              <div v-if="character.title" class="dossier-char-epithet">
                “{{ character.title }}”
              </div>

              <!-- Profile Attributes: Race, Class, Gender, Player -->
              <div class="dossier-attributes-ribbon" style="margin-top: 0.65rem;">
                <span class="attr-chip">
                  <i class="fas fa-dna" style="color: var(--crimson-seal);"></i>
                  <strong>Race:</strong> {{ character.race }}
                </span>
                <span class="attr-chip">
                  <i class="fas fa-wand-magic-sparkles" style="color: var(--crimson-seal);"></i>
                  <strong>Class:</strong> {{ character.class }}
                </span>
                <span class="attr-chip">
                  <i class="fas fa-venus-mars" style="color: var(--crimson-seal);"></i>
                  <strong>Gender:</strong> {{ character.gender }}
                </span>
                <span class="attr-chip">
                  <i class="fas fa-user" style="color: var(--gold-accent);"></i>
                  <strong>Player:</strong> {{ character.owner_name }} (@{{ character.owner_username }})
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 0.65rem;">
            <button
              v-if="character.can_write_diary"
              type="button"
              class="btn-archive btn-crimson"
              @click="showNewDiaryModal = true"
            >
              <i class="fas fa-feather-pointed"></i> New Diary Entry
            </button>
            <button
              v-if="character.can_edit && character.avatar_url"
              type="button"
              class="btn-archive btn-parchment btn-sm"
              @click="removePortrait"
            >
              <i class="fas fa-rotate-left"></i> Reset Portrait
            </button>
          </div>
        </div>
      </section>

      <div v-if="avatarError" class="archive-alert archive-alert-error">
        <i class="fas fa-circle-exclamation"></i>
        <span>{{ avatarError }}</span>
      </div>

      <!-- TWO-COLUMN DOSSIER & CHRONOLOGICAL FEED -->
      <div class="dossier-layout">
        <!-- LEFT SIDEBAR: BIOGRAPHY, ATTRIBUTES & PARTY COMPANIONS -->
        <aside style="display: flex; flex-direction: column; gap: 1.5rem;">
          <section class="folio-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
              <h2 style="margin: 0; font-size: 1.25rem;">
                <i class="fas fa-scroll" style="color: var(--crimson-seal); margin-right: 0.4rem;"></i>
                Biography & Lore
              </h2>
              <button
                v-if="character.can_edit"
                type="button"
                class="btn-archive btn-parchment btn-sm"
                @click="showEditModal = true"
              >
                <i class="fas fa-pen"></i> Edit
              </button>
            </div>

            <div class="biography-scroll">{{ character.biography || 'No biography has been inscribed for this character yet.' }}</div>

            <div
              style="
                margin-top: 1.25rem;
                padding-top: 1rem;
                border-top: 1px solid var(--parchment-border);
                font-size: 0.88rem;
                color: var(--ink-muted);
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
              "
            >
              <div>
                <strong>RPG Table:</strong>
                <router-link :to="`/tables/${character.table_id}`" style="margin-left: 0.35rem;">
                  {{ character.table_name }}
                </router-link>
              </div>
              <div v-if="character.table_era">
                <strong>Campaign Era:</strong> {{ character.table_era }}
              </div>
              <div>
                <strong>Chronicle Entries:</strong> {{ diaryEntries.length }} recorded
              </div>
              <div>
                <strong>Inscribed in Archive:</strong> {{ formatArchiveDate(character.created_at) }}
              </div>
            </div>
          </section>

          <!-- Fellow Party Companions in the Same RPG Table -->
          <section class="folio-card">
            <h2 style="margin: 0 0 0.85rem; font-size: 1.2rem;">
              <i class="fas fa-users" style="color: var(--crimson-seal); margin-right: 0.4rem;"></i>
              Table Companions ({{ companions.length }})
            </h2>

            <div v-if="companions.length === 0" style="font-size: 0.92rem; color: var(--ink-muted);">
              No other characters have been registered in {{ character.table_name }} yet.
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 0.7rem;">
              <router-link
                v-for="comp in companions"
                :key="comp.id"
                :to="`/characters/${comp.id}`"
                style="
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
                  padding: 0.55rem 0.75rem;
                  background: var(--parchment-light);
                  border: 1px solid var(--parchment-border);
                  border-radius: var(--radius-sm);
                  color: var(--ink-primary);
                "
              >
                <CharacterAvatar :name="comp.name" :avatarUrl="comp.avatar_url" size="sm" />
                <div>
                  <div style="font-family: var(--font-heading); font-weight: 700; font-size: 0.95rem;">
                    {{ comp.name }}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--ink-muted);">
                    {{ comp.race }} {{ comp.class }}
                  </div>
                </div>
              </router-link>
            </div>
          </section>
        </aside>

        <!-- RIGHT MAIN COLUMN: CHRONOLOGICAL DIARY FEED -->
        <section>
          <!-- Composer Prompt Box (like a medieval chronicle status box) -->
          <div
            v-if="character.can_write_diary"
            class="folio-card"
            style="
              margin-bottom: 1.5rem;
              padding: 1.15rem 1.5rem;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 1rem;
              background: linear-gradient(135deg, #fdf9ef 0%, #efe1c6 100%);
            "
          >
            <div style="display: flex; align-items: center; gap: 0.9rem;">
              <CharacterAvatar :name="character.name" :avatarUrl="character.avatar_url" size="sm" />
              <div>
                <div style="font-family: var(--font-heading); font-weight: 700;">
                  What adventures has {{ character.name }} witnessed?
                </div>
                <div style="font-size: 0.88rem; color: var(--ink-muted);">
                  Record a new diary entry directly into {{ character.name }}’s personal chronicle.
                </div>
              </div>
            </div>

            <button type="button" class="btn-archive btn-crimson" @click="showNewDiaryModal = true">
              <i class="fas fa-pen-nib"></i> Write Diary Entry
            </button>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 1.45rem;">
              <i class="fas fa-book-journal-whills" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              Personal Chronicle Timeline ({{ diaryEntries.length }})
            </h2>

            <button
              v-if="diaryEntries.length > 1"
              type="button"
              class="btn-archive btn-parchment btn-sm"
              @click="sortOldestFirst = !sortOldestFirst"
            >
              <i class="fas fa-arrow-down-up-across-line"></i>
              {{ sortOldestFirst ? 'Showing Oldest First' : 'Showing Newest First' }}
            </button>
          </div>

          <div v-if="diaryEntries.length === 0" class="folio-card" style="text-align: center; padding: 2.75rem;">
            <i class="fas fa-book-open" style="font-size: 2.2rem; color: var(--gold-accent); margin-bottom: 0.75rem;"></i>
            <h3>No Diary Entries Inscribed Yet</h3>
            <p style="color: var(--ink-secondary); max-width: 480px; margin: 0 auto 1.25rem;">
              This character’s chronicle awaits its first chapter. Every entry written here is permanently linked to
              <strong>{{ character.name }}</strong> and <strong>{{ character.table_name }}</strong>.
            </p>
            <button
              v-if="character.can_write_diary"
              type="button"
              class="btn-archive btn-crimson"
              @click="showNewDiaryModal = true"
            >
              <i class="fas fa-feather-pointed"></i> Inscribe First Entry
            </button>
          </div>

          <div v-else class="chronicle-timeline">
            <article
              v-for="entry in orderedEntries"
              :key="entry.id"
              class="chronicle-entry-card"
            >
              <div class="chronicle-entry-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                    <span v-if="entry.session_label" class="badge-seal">
                      <i class="fas fa-Bookmark"></i> {{ entry.session_label }}
                    </span>
                    <span class="badge-seal" style="background: transparent;">
                      <i class="fas fa-clock"></i> {{ formatArchiveDateTime(entry.created_at) }}
                    </span>
                  </div>
                  <h3 class="chronicle-entry-title">{{ entry.title }}</h3>
                  <div class="chronicle-meta-row">
                    <span>Chronicled by <strong>{{ character.name }}</strong> (Scribe: {{ entry.author_name }})</span>
                    <span v-if="entry.updated_at && entry.updated_at !== entry.created_at">
                      • Edited {{ formatArchiveDateTime(entry.updated_at) }}
                    </span>
                  </div>
                </div>

                <div style="display: flex; gap: 0.45rem;">
                  <button
                    type="button"
                    class="btn-archive btn-parchment btn-sm"
                    title="Open in full manuscript reader"
                    @click="selectedEntry = entry"
                  >
                    <i class="fas fa-book-open"></i> Read
                  </button>
                  <button
                    v-if="entry.can_edit"
                    type="button"
                    class="btn-archive btn-parchment btn-sm"
                    title="Edit diary entry"
                    @click="editingEntry = entry"
                  >
                    <i class="fas fa-pen"></i>
                  </button>
                  <button
                    v-if="entry.can_edit"
                    type="button"
                    class="btn-archive btn-danger-outline btn-sm"
                    title="Delete diary entry"
                    @click="deleteEntry(entry)"
                  >
                    <i class="fas fa-trash-can"></i>
                  </button>
                </div>
              </div>

              <div class="chronicle-body-text">{{ entry.content }}</div>
            </article>
          </div>
        </section>
      </div>
    </template>

    <!-- Modals -->
    <CharacterModal
      v-if="showEditModal && character"
      :character="character"
      @close="showEditModal = false"
      @saved="onCharacterUpdated"
    />

    <DiaryModal
      v-if="showNewDiaryModal && character"
      :characters="[character]"
      :fixedCharacterId="character.id"
      @close="showNewDiaryModal = false"
      @saved="onDiarySaved"
    />

    <DiaryReaderModal
      v-if="selectedEntry"
      :entry="selectedEntry"
      @close="selectedEntry = null"
      @edit="openEditFromReader"
      @delete="deleteEntry"
    />

    <DiaryModal
      v-if="editingEntry && character"
      :entry="editingEntry"
      :characters="[character]"
      :fixedCharacterId="character.id"
      @close="editingEntry = null"
      @saved="onDiarySaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  apiFetch,
  formatArchiveDate,
  formatArchiveDateTime
} from '../services/api.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import CharacterModal from '../components/CharacterModal.vue';
import DiaryModal from '../components/DiaryModal.vue';
import DiaryReaderModal from '../components/DiaryReaderModal.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');
const avatarError = ref('');
const uploadingAvatar = ref(false);

const character = ref(null);
const diaryEntries = ref([]);
const companions = ref([]);
const sortOldestFirst = ref(false);

const showEditModal = ref(false);
const showNewDiaryModal = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);

const orderedEntries = computed(() => {
  const list = [...diaryEntries.value];
  if (sortOldestFirst.value) {
    return list.reverse();
  }
  return list;
});

async function loadProfile() {
  loading.value = true;
  errorMsg.value = '';
  avatarError.value = '';
  try {
    const res = await apiFetch(`/api/characters/${route.params.id}`);
    character.value = res.character;
    diaryEntries.value = res.diary_entries || [];
    companions.value = res.companions || [];
  } catch (err) {
    errorMsg.value = err.message || 'Could not load character profile.';
  } finally {
    loading.value = false;
  }
}

async function handleAvatarUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  avatarError.value = '';
  uploadingAvatar.value = true;
  try {
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await apiFetch(`/api/characters/${character.value.id}/avatar`, {
      method: 'POST',
      body: fd
    });
    character.value = {
      ...character.value,
      ...res.character
    };
  } catch (err) {
    avatarError.value = err.message || 'Failed to upload portrait.';
  } finally {
    uploadingAvatar.value = false;
    event.target.value = '';
  }
}

async function removePortrait() {
  if (!window.confirm('Reset character portrait to the default medieval archive crest?')) return;
  avatarError.value = '';
  try {
    await apiFetch(`/api/characters/${character.value.id}/avatar`, {
      method: 'DELETE'
    });
    await loadProfile();
  } catch (err) {
    avatarError.value = err.message || 'Failed to reset portrait.';
  }
}

async function onCharacterUpdated() {
  showEditModal.value = false;
  await loadProfile();
}

async function onDiarySaved() {
  showNewDiaryModal.value = false;
  editingEntry.value = null;
  await loadProfile();
}

function openEditFromReader(entry) {
  selectedEntry.value = null;
  editingEntry.value = entry;
}

async function deleteEntry(entry) {
  if (!window.confirm(`Delete diary entry "${entry.title}"?`)) return;
  await apiFetch(`/api/diaries/${entry.id}`, { method: 'DELETE' });
  selectedEntry.value = null;
  await loadProfile();
}

async function deleteCharacter() {
  if (!window.confirm(`Delete character "${character.value.name}" and all of their diary entries?`)) return;
  const tableId = character.value.table_id;
  await apiFetch(`/api/characters/${character.value.id}`, { method: 'DELETE' });
  router.push(`/tables/${tableId}`);
}

watch(() => route.params.id, loadProfile);
onMounted(loadProfile);
</script>

