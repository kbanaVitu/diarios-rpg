<template>
  <div>
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-book-journal-whills"></i>
          <span>Illuminated Folios & Session Logs</span>
        </div>
        <h1 class="page-folio-title">Campaign Chronicles</h1>
        <p class="page-folio-subtitle">
          Browse and read diary entries written from the perspective of characters across your RPG tables.
        </p>
      </div>

      <button
        type="button"
        class="btn-archive btn-crimson"
        :disabled="writableCharacters.length === 0"
        @click="showCreateModal = true"
      >
        <i class="fas fa-feather-pointed"></i> Inscribe New Entry
      </button>
    </section>

    <!-- Filter Bar -->
    <div
      class="folio-card"
      style="
        padding: 1rem 1.35rem;
        margin-bottom: 1.75rem;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      "
    >
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <select
          v-model="selectedTableId"
          class="form-select"
          style="width: auto; min-width: 210px; padding: 0.45rem 0.75rem;"
          @change="selectedCharacterId = ''"
        >
          <option value="">All Accessible RPG Tables</option>
          <option v-for="t in tables" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>

        <select
          v-model="selectedCharacterId"
          class="form-select"
          style="width: auto; min-width: 210px; padding: 0.45rem 0.75rem;"
        >
          <option value="">All Characters</option>
          <option v-for="c in charactersForFilter" :key="c.id" :value="c.id">
            {{ c.name }} ({{ c.race }} {{ c.class }})
          </option>
        </select>
      </div>

      <div style="min-width: 260px; flex: 1; max-width: 360px;">
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          placeholder="Search chronicles by title, text, or session..."
        />
      </div>
    </div>

    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">Retrieving chronicles from the vault...</p>
    </div>

    <div v-else-if="filteredEntries.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <h3>No Chronicles Match Your Selection</h3>
      <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
        {{
          writableCharacters.length === 0
            ? 'Create a character inside one of your RPG tables to begin writing diary entries.'
            : 'Inscribe a new diary entry for one of your characters.'
        }}
      </p>
      <button
        v-if="writableCharacters.length > 0"
        type="button"
        class="btn-archive btn-crimson"
        @click="showCreateModal = true"
      >
        <i class="fas fa-feather-pointed"></i> Inscribe New Entry
      </button>
    </div>

    <div v-else class="chronicle-timeline">
      <article
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="chronicle-entry-card"
      >
        <div class="chronicle-entry-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; margin-bottom: 0.45rem;">
              <router-link
                :to="`/characters/${entry.character_id}`"
                style="display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-heading); font-weight: 700;"
              >
                <CharacterAvatar :name="entry.character_name" :avatarUrl="entry.character_avatar" size="sm" style="width: 34px; height: 34px; font-size: 0.78rem;" />
                <span>{{ entry.character_name }}</span>
              </router-link>

              <router-link :to="`/tables/${entry.table_id}`" class="badge-seal">
                <i class="fas fa-compass"></i> {{ entry.table_name }}
              </router-link>

              <span v-if="entry.session_label" class="badge-seal">
                {{ entry.session_label }}
              </span>
            </div>

            <h2 class="chronicle-entry-title">{{ entry.title }}</h2>

            <div class="chronicle-meta-row">
              <span><i class="fas fa-calendar-day"></i> {{ formatArchiveDateTime(entry.created_at) }}</span>
              <span><i class="fas fa-pen-fancy"></i> Scribe: {{ entry.author_name }}</span>
              <span v-if="entry.updated_at && entry.updated_at !== entry.created_at">
                • Amended {{ formatArchiveDateTime(entry.updated_at) }}
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 0.45rem;">
            <button
              type="button"
              class="btn-archive btn-parchment btn-sm"
              @click="selectedEntry = entry"
            >
              <i class="fas fa-book-open"></i> Read Folio
            </button>
            <button
              v-if="entry.can_edit"
              type="button"
              class="btn-archive btn-parchment btn-sm"
              @click="editingEntry = entry"
            >
              <i class="fas fa-pen"></i>
            </button>
            <button
              v-if="entry.can_edit"
              type="button"
              class="btn-archive btn-danger-outline btn-sm"
              @click="deleteEntry(entry)"
            >
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="chronicle-body-text">{{ entry.content }}</div>
      </article>
    </div>

    <DiaryModal
      v-if="showCreateModal"
      :characters="writableCharacters"
      :fixedCharacterId="selectedCharacterId || null"
      @close="showCreateModal = false"
      @saved="onEntrySaved"
    />

    <DiaryReaderModal
      v-if="selectedEntry"
      :entry="selectedEntry"
      @close="selectedEntry = null"
      @edit="openEditFromReader"
      @delete="deleteEntry"
    />

    <DiaryModal
      v-if="editingEntry"
      :entry="editingEntry"
      :characters="writableCharacters"
      @close="editingEntry = null"
      @saved="onEntrySaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { apiFetch, formatArchiveDateTime } from '../services/api.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import DiaryModal from '../components/DiaryModal.vue';
import DiaryReaderModal from '../components/DiaryReaderModal.vue';

const entries = ref([]);
const tables = ref([]);
const characters = ref([]);
const loading = ref(true);

const selectedTableId = ref('');
const selectedCharacterId = ref('');
const searchQuery = ref('');

const showCreateModal = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);

const writableCharacters = computed(() =>
  characters.value.filter((c) => c.can_write_diary)
);

const charactersForFilter = computed(() => {
  if (!selectedTableId.value) return characters.value;
  return characters.value.filter(
    (c) => Number(c.table_id) === Number(selectedTableId.value)
  );
});

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return entries.value.filter((e) => {
    if (selectedTableId.value && Number(e.table_id) !== Number(selectedTableId.value)) return false;
    if (selectedCharacterId.value && Number(e.character_id) !== Number(selectedCharacterId.value)) return false;
    if (q) {
      const hay = `${e.title} ${e.content} ${e.session_label} ${e.character_name} ${e.table_name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

async function loadData() {
  loading.value = true;
  try {
    const [entriesRes, tablesRes, charsRes] = await Promise.all([
      apiFetch('/api/diaries'),
      apiFetch('/api/tables'),
      apiFetch('/api/characters')
    ]);
    entries.value = entriesRes.entries || [];
    tables.value = tablesRes.tables || [];
    characters.value = charsRes.characters || [];
  } finally {
    loading.value = false;
  }
}

async function onEntrySaved() {
  showCreateModal.value = false;
  editingEntry.value = null;
  await loadData();
}

function openEditFromReader(entry) {
  selectedEntry.value = null;
  editingEntry.value = entry;
}

async function deleteEntry(entry) {
  if (!window.confirm(`Delete chronicle "${entry.title}"?`)) return;
  await apiFetch(`/api/diaries/${entry.id}`, { method: 'DELETE' });
  selectedEntry.value = null;
  await loadData();
}

onMounted(loadData);
</script>

