<template>
  <div>
    <!-- Hero Folio Header -->
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-feather-pointed"></i>
          <span>Grand Scribe Sanctum • Welcome, {{ authState.user?.display_name }}</span>
        </div>
        <h1 class="page-folio-title">The Medieval Chronicle Archive</h1>
        <p class="page-folio-subtitle">
          Every campaign is a living tapestry. Manage your RPG tables, curate character dossiers, and preserve the personal diaries of your fellowship.
        </p>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 0.65rem;">
        <button type="button" class="btn-archive" @click="showTableModal = true">
          <i class="fas fa-plus"></i> New RPG Table
        </button>
        <button
          type="button"
          class="btn-archive btn-parchment"
          :disabled="dashboard.tables.length === 0"
          @click="showCharacterModal = true"
        >
          <i class="fas fa-user-shield"></i> New Character
        </button>
        <button
          type="button"
          class="btn-archive btn-crimson"
          :disabled="writableCharacters.length === 0"
          @click="showDiaryModal = true"
        >
          <i class="fas fa-book-open"></i> New Diary Entry
        </button>
      </div>
    </section>

    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem; color: var(--ink-secondary);">
        Consulting the illuminated manuscripts of the Archive...
      </p>
    </div>

    <template v-else>
      <!-- Summary Stat Plaques -->
      <div class="stats-grid">
        <div class="stat-plaque">
          <div>
            <div class="stat-plaque-value">{{ dashboard.stats.total_tables }}</div>
            <div class="stat-plaque-label">Accessible RPG Tables</div>
          </div>
          <i class="fas fa-map-location-dot stat-plaque-icon"></i>
        </div>

        <div class="stat-plaque">
          <div>
            <div class="stat-plaque-value">{{ dashboard.stats.owned_tables_count }}</div>
            <div class="stat-plaque-label">Tables Owned by You</div>
          </div>
          <i class="fas fa-crown stat-plaque-icon"></i>
        </div>

        <div class="stat-plaque">
          <div>
            <div class="stat-plaque-value">{{ dashboard.stats.total_characters }}</div>
            <div class="stat-plaque-label">Campaign Characters</div>
          </div>
          <i class="fas fa-helmet-safety stat-plaque-icon"></i>
        </div>

        <div class="stat-plaque">
          <div>
            <div class="stat-plaque-value">{{ dashboard.stats.total_entries }}</div>
            <div class="stat-plaque-label">Recorded Chronicles</div>
          </div>
          <i class="fas fa-book-journal-whills stat-plaque-icon"></i>
        </div>
      </div>

      <!-- RPG Tables Section (Owned & Participating) -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <h2 style="margin: 0; font-size: 1.5rem;">
          <i class="fas fa-compass" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
          Your RPG Tables & Campaigns
        </h2>
        <router-link to="/tables" class="btn-archive btn-parchment btn-sm">
          View All Tables <i class="fas fa-arrow-right"></i>
        </router-link>
      </div>

      <div v-if="dashboard.tables.length === 0" class="folio-card" style="text-align: center; margin-bottom: 2.5rem;">
        <h3 style="margin-bottom: 0.5rem;">No RPG Tables Chartered Yet</h3>
        <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
          Create your first RPG table to invite players, register characters, and begin recording campaign diaries.
        </p>
        <button type="button" class="btn-archive btn-crimson" @click="showTableModal = true">
          <i class="fas fa-plus"></i> Charter Your First RPG Table
        </button>
      </div>

      <div v-else class="cards-grid-2" style="margin-bottom: 2.5rem;">
        <article
          v-for="table in dashboard.tables"
          :key="table.id"
          class="folio-card folio-card-interactive"
          style="display: flex; flex-direction: column; justify-content: space-between;"
        >
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.65rem;">
              <span class="badge-seal" :class="{ 'badge-owner': table.is_owner }">
                <i :class="table.is_owner ? 'fas fa-crown' : 'fas fa-shield-halved'"></i>
                {{ table.is_owner ? 'Table Owner' : `Member (${table.my_role})` }}
              </span>
              <span class="badge-seal badge-status-active">{{ table.system }}</span>
            </div>

            <h3 style="font-size: 1.35rem; margin-bottom: 0.35rem;">
              <router-link :to="`/tables/${table.id}`" style="color: var(--ink-primary);">
                {{ table.name }}
              </router-link>
            </h3>

            <div style="font-size: 0.86rem; color: var(--ink-muted); margin-bottom: 0.75rem;">
              <i class="fas fa-hourglass-half"></i> {{ table.era_label }} • Mastered by
              <strong>{{ table.owner_name }}</strong>
            </div>

            <p style="color: var(--ink-secondary); margin-bottom: 1.15rem; font-size: 0.98rem;">
              {{ table.description || 'No campaign synopsis inscribed yet.' }}
            </p>
          </div>

          <div>
            <!-- Characters inside this table preview -->
            <div
              v-if="charactersByTable(table.id).length > 0"
              style="
                background: rgba(227, 210, 180, 0.45);
                border: 1px solid var(--parchment-border);
                border-radius: var(--radius-sm);
                padding: 0.7rem 0.9rem;
                margin-bottom: 1rem;
              "
            >
              <div
                style="
                  font-family: var(--font-heading);
                  font-size: 0.74rem;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: var(--ink-muted);
                  margin-bottom: 0.45rem;
                "
              >
                Dramatis Personae ({{ charactersByTable(table.id).length }})
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
                <router-link
                  v-for="char in charactersByTable(table.id)"
                  :key="char.id"
                  :to="`/characters/${char.id}`"
                  class="attr-chip"
                  style="text-decoration: none;"
                >
                  <i class="fas fa-user-pen" style="color: var(--crimson-seal);"></i>
                  <span>{{ char.name }}</span>
                  <span style="color: var(--ink-muted); font-size: 0.72rem;">({{ char.class }})</span>
                </router-link>
              </div>
            </div>

            <div
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-top: 1px solid var(--parchment-border);
                padding-top: 0.85rem;
                font-size: 0.88rem;
                color: var(--ink-muted);
              "
            >
              <div style="display: flex; gap: 1rem;">
                <span><i class="fas fa-users"></i> {{ table.member_count }} Members</span>
                <span><i class="fas fa-helmet-safety"></i> {{ table.character_count }} Heroes</span>
                <span><i class="fas fa-scroll"></i> {{ table.entry_count }} Entries</span>
              </div>

              <router-link :to="`/tables/${table.id}`" class="btn-archive btn-parchment btn-sm">
                Open Table <i class="fas fa-chevron-right"></i>
              </router-link>
            </div>
          </div>
        </article>
      </div>

      <!-- Two-Column Lower Section: Characters & Recent Chronicles -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 2rem;">
        <!-- Characters Column -->
        <section>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 1.4rem;">
              <i class="fas fa-id-card-clip" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              Character Dossiers
            </h2>
            <router-link to="/characters" class="btn-archive btn-parchment btn-sm">
              All Characters
            </router-link>
          </div>

          <div v-if="dashboard.characters.length === 0" class="folio-card" style="text-align: center;">
            <p style="color: var(--ink-secondary);">No characters have been created in your tables yet.</p>
            <button
              v-if="dashboard.tables.length > 0"
              type="button"
              class="btn-archive btn-sm"
              @click="showCharacterModal = true"
            >
              <i class="fas fa-plus"></i> Create Character
            </button>
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 1rem;">
            <router-link
              v-for="char in dashboard.characters.slice(0, 6)"
              :key="char.id"
              :to="`/characters/${char.id}`"
              class="folio-card folio-card-interactive"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1.1rem 1.35rem;
                color: var(--ink-primary);
              "
            >
              <div style="display: flex; align-items: center; gap: 1rem;">
                <CharacterAvatar :name="char.name" :avatarUrl="char.avatar_url" size="md" />
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <h3 style="margin: 0; font-size: 1.18rem;">{{ char.name }}</h3>
                    <span v-if="char.is_owner" class="badge-seal badge-owner" style="font-size: 0.65rem;">
                      Your Hero
                    </span>
                  </div>
                  <div style="font-size: 0.9rem; color: var(--crimson-seal); font-style: italic;">
                    {{ char.race }} {{ char.class }} • {{ char.gender }}
                  </div>
                  <div style="font-size: 0.84rem; color: var(--ink-muted); margin-top: 0.15rem;">
                    <i class="fas fa-map"></i> {{ char.table_name }} •
                    <i class="fas fa-book-open"></i> {{ char.entry_count }} Chronicles
                  </div>
                </div>
              </div>
              <i class="fas fa-chevron-right" style="color: var(--gold-accent);"></i>
            </router-link>
          </div>
        </section>

        <!-- Recent Diary Entries Column -->
        <section>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 1.4rem;">
              <i class="fas fa-feather" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              Recent Chronicles
            </h2>
            <router-link to="/chronicles" class="btn-archive btn-parchment btn-sm">
              Browse Archive
            </router-link>
          </div>

          <div v-if="dashboard.recent_entries.length === 0" class="folio-card" style="text-align: center;">
            <p style="color: var(--ink-secondary);">No diary entries have been inscribed yet.</p>
            <button
              v-if="writableCharacters.length > 0"
              type="button"
              class="btn-archive btn-crimson btn-sm"
              @click="showDiaryModal = true"
            >
              <i class="fas fa-feather-pointed"></i> Inscribe First Entry
            </button>
          </div>

          <div v-else style="display: flex; flex-direction: column; gap: 1rem;">
            <article
              v-for="entry in dashboard.recent_entries.slice(0, 5)"
              :key="entry.id"
              class="folio-card folio-card-interactive"
              style="padding: 1.2rem 1.4rem; cursor: pointer;"
              @click="selectedEntry = entry"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.45rem;">
                <span class="badge-seal">
                  <i class="fas fa-scroll"></i> {{ entry.table_name }}
                </span>
                <span style="font-size: 0.82rem; color: var(--ink-muted);">
                  {{ formatArchiveDate(entry.created_at) }}
                </span>
              </div>

              <h3 style="margin: 0 0 0.35rem; font-size: 1.2rem;">{{ entry.title }}</h3>

              <p
                style="
                  margin: 0 0 0.8rem;
                  color: var(--ink-secondary);
                  font-size: 0.96rem;
                  display: -webkit-box;
                  -webkit-line-clamp: 3;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                "
              >
                {{ entry.content }}
              </p>

              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  border-top: 1px solid rgba(197, 173, 130, 0.45);
                  padding-top: 0.65rem;
                  font-size: 0.85rem;
                "
                @click.stop
              >
                <router-link
                  :to="`/characters/${entry.character_id}`"
                  style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600;"
                >
                  <CharacterAvatar :name="entry.character_name" :avatarUrl="entry.character_avatar" size="sm" style="width: 28px; height: 28px; font-size: 0.7rem;" />
                  <span>{{ entry.character_name }}</span>
                </router-link>
                <span v-if="entry.session_label" style="color: var(--ink-muted);">
                  {{ entry.session_label }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </template>

    <!-- Modals -->
    <TableModal
      v-if="showTableModal"
      @close="showTableModal = false"
      @saved="onTableCreated"
    />

    <CharacterModal
      v-if="showCharacterModal"
      :tables="dashboard.tables"
      @close="showCharacterModal = false"
      @saved="onCharacterCreated"
    />

    <DiaryModal
      v-if="showDiaryModal"
      :characters="writableCharacters"
      @close="showDiaryModal = false"
      @saved="onDiaryCreated"
    />

    <DiaryReaderModal
      v-if="selectedEntry"
      :entry="selectedEntry"
      @close="selectedEntry = null"
      @edit="openEditDiary"
      @delete="deleteDiaryEntry"
    />

    <DiaryModal
      v-if="editingEntry"
      :entry="editingEntry"
      :characters="writableCharacters"
      @close="editingEntry = null"
      @saved="onDiaryUpdated"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch, authState, formatArchiveDate } from '../services/api.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import TableModal from '../components/TableModal.vue';
import CharacterModal from '../components/CharacterModal.vue';
import DiaryModal from '../components/DiaryModal.vue';
import DiaryReaderModal from '../components/DiaryReaderModal.vue';

const router = useRouter();
const loading = ref(true);

const dashboard = reactive({
  stats: {
    total_tables: 0,
    owned_tables_count: 0,
    participating_tables_count: 0,
    total_characters: 0,
    my_characters_count: 0,
    total_entries: 0
  },
  tables: [],
  characters: [],
  recent_entries: []
});

const showTableModal = ref(false);
const showCharacterModal = ref(false);
const showDiaryModal = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);

const writableCharacters = computed(() =>
  dashboard.characters.filter((c) => c.can_write_diary)
);

function charactersByTable(tableId) {
  return dashboard.characters.filter((c) => Number(c.table_id) === Number(tableId));
}

async function loadDashboard() {
  loading.value = true;
  try {
    const data = await apiFetch('/api/dashboard');
    Object.assign(dashboard.stats, data.stats);
    dashboard.tables = data.tables || [];
    dashboard.characters = data.characters || [];
    dashboard.recent_entries = data.recent_entries || [];
  } finally {
    loading.value = false;
  }
}

function onTableCreated(table) {
  showTableModal.value = false;
  router.push(`/tables/${table.id}`);
}

function onCharacterCreated(char) {
  showCharacterModal.value = false;
  router.push(`/characters/${char.id}`);
}

async function onDiaryCreated() {
  showDiaryModal.value = false;
  await loadDashboard();
}

function openEditDiary(entry) {
  selectedEntry.value = null;
  editingEntry.value = entry;
}

async function onDiaryUpdated() {
  editingEntry.value = null;
  await loadDashboard();
}

async function deleteDiaryEntry(entry) {
  if (!window.confirm(`Delete chronicle "${entry.title}" from the Archive?`)) return;
  await apiFetch(`/api/diaries/${entry.id}`, { method: 'DELETE' });
  selectedEntry.value = null;
  await loadDashboard();
}

onMounted(loadDashboard);
</script>

