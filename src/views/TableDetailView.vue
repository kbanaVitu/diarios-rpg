<template>
  <div>
    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">{{ t('tableDetail.loading') }}</p>
    </div>

    <div v-else-if="errorMsg" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <div class="archive-alert archive-alert-error" style="justify-content: center;">
        <i class="fas fa-lock"></i>
        <span>{{ errorMsg }}</span>
      </div>
      <router-link to="/tables" class="btn-archive btn-parchment">
        <i class="fas fa-arrow-left"></i> {{ t('tableDetail.backToTables') }}
      </router-link>
    </div>

    <template v-else-if="table">
      <!-- Table Header Banner -->
      <section class="page-folio-header">
        <div>
          <div class="page-folio-kicker">
            <router-link to="/tables" style="color: var(--ink-muted);">{{ t('nav.myTables') }}</router-link>
            <span>/</span>
            <span>{{ table.system }}</span>
            <span>•</span>
            <span>{{ table.era_label }}</span>
          </div>
          <h1 class="page-folio-title">{{ table.name }}</h1>
          <p class="page-folio-subtitle">{{ table.description || t('tableDetail.noLoreText') }}</p>

          <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.9rem;">
            <span class="badge-seal" :class="{ 'badge-owner': table.is_owner }">
              <i :class="table.is_owner ? 'fas fa-crown' : 'fas fa-users'"></i>
              {{ table.is_owner ? t('tableDetail.youAreOwner') : t('tableDetail.sharedAccessBadge') }}
            </span>
            <span class="badge-seal">
              <i class="fas fa-user-tie"></i> {{ t('tableDetail.ownerLabel') }}
              {{ owner?.display_name }} (@{{ owner?.username }})
            </span>
            <span class="badge-seal badge-status-active">
              {{ t('tableDetail.statusLabel', { status: formatTableStatus(table.status) }) }}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
          <button type="button" class="btn-archive" @click="showCharModal = true">
            <i class="fas fa-user-plus"></i> {{ t('tableDetail.createCharacterBtn') }}
          </button>
          <button
            v-if="writableCharacters.length > 0"
            type="button"
            class="btn-archive btn-crimson"
            @click="showDiaryModal = true"
          >
            <i class="fas fa-feather-pointed"></i> {{ t('tableDetail.newChronicleBtn') }}
          </button>
          <button
            v-if="table.is_owner"
            type="button"
            class="btn-archive btn-parchment"
            @click="showEditTableModal = true"
          >
            <i class="fas fa-sliders"></i> {{ t('tableDetail.editCharterBtn') }}
          </button>
        </div>
      </section>

      <!-- Table Navigation Tabs: Table Overview | Characters | Timeline -->
      <div class="archive-tabs">
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'overview' }]"
          @click="selectTab('overview')"
        >
          <i class="fas fa-scroll"></i> {{ t('tableDetail.tabOverview') }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'characters' }]"
          @click="selectTab('characters')"
        >
          <i class="fas fa-user-shield"></i>
          {{ t('tableDetail.tabCharacters', { count: characters.length }) }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'timeline' }]"
          @click="selectTab('timeline')"
        >
          <i class="fas fa-clock-rotate-left"></i>
          {{ t('tableDetail.tabTimelineCount', { count: chronicles.length }) }}
        </button>
      </div>

      <!-- TAB 1: TABLE OVERVIEW (VISÃO GERAL DA MESA) -->
      <section v-if="activeTab === 'overview'">
        <div class="folio-card" style="margin-bottom: 1.75rem;">
          <h2 style="font-size: 1.4rem; margin-bottom: 1rem;">{{ t('tableDetail.charterDetailsHeading') }}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
            <div>
              <div class="form-label">{{ t('tableDetail.campaignNameLabel') }}</div>
              <div>{{ table.name }}</div>
            </div>
            <div>
              <div class="form-label">{{ t('tableDetail.systemLabel') }}</div>
              <div>{{ table.system }}</div>
            </div>
            <div>
              <div class="form-label">{{ t('tableDetail.eraLabel') }}</div>
              <div>{{ table.era_label }}</div>
            </div>
            <div>
              <div class="form-label">{{ t('tableDetail.ownerLabel') }}</div>
              <div>{{ owner?.display_name }} (@{{ owner?.username }})</div>
            </div>
            <div>
              <div class="form-label">{{ t('tableDetail.createdOnLabel') }}</div>
              <div>{{ formatArchiveDate(table.created_at) }}</div>
            </div>
          </div>

          <div class="form-label">{{ t('tableDetail.synopsisLabel') }}</div>
          <div class="biography-scroll" style="margin-bottom: 1.5rem;">
            {{ table.description || t('tableDetail.noLoreText') }}
          </div>

          <div
            v-if="table.is_owner"
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 1rem;
              border-top: 1px solid var(--parchment-border);
              padding-top: 1.25rem;
            "
          >
            <div>
              <strong style="font-family: var(--font-heading); color: var(--crimson-seal);">
                {{ t('tableDetail.ownerAdminTitle') }}
              </strong>
              <div style="font-size: 0.88rem; color: var(--ink-muted);">
                {{ t('tableDetail.ownerAdminHint') }}
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem;">
              <button type="button" class="btn-archive btn-parchment" @click="showEditTableModal = true">
                <i class="fas fa-pen-to-square"></i> {{ t('tableDetail.editCharterBtn') }}
              </button>
              <button type="button" class="btn-archive btn-danger-outline" @click="deleteTable">
                <i class="fas fa-trash-can"></i> {{ t('tableDetail.dissolveTableBtn') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Overview Quick Previews: Characters & Timeline -->
        <div class="dashboard-columns">
          <div class="folio-card">
            <div class="dashboard-section-header">
              <h3 style="margin: 0; font-size: 1.25rem;">
                <i class="fas fa-user-shield" style="color: var(--crimson-seal); margin-right: 0.4rem;"></i>
                {{ t('tableDetail.overviewCharactersPreview') }} ({{ characters.length }})
              </h3>
              <button type="button" class="btn-archive btn-parchment btn-sm" @click="selectTab('characters')">
                {{ t('tableDetail.viewAllCharactersBtn') }}
              </button>
            </div>

            <div v-if="characters.length === 0" style="color: var(--ink-secondary); text-align: center; padding: 1.25rem 0;">
              <p>{{ t('tableDetail.noCharactersText') }}</p>
              <button type="button" class="btn-archive btn-sm" @click="showCharModal = true">
                <i class="fas fa-user-plus"></i> {{ t('tableDetail.createCharacterBtn') }}
              </button>
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
              <router-link
                v-for="char in characters.slice(0, 4)"
                :key="char.id"
                :to="`/characters/${char.id}`"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 0.85rem;
                  padding: 0.65rem 0.9rem;
                  background: var(--parchment-light);
                  border: 1px solid var(--parchment-border);
                  border-radius: var(--radius-sm);
                  color: var(--ink-primary);
                "
              >
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                  <CharacterAvatar :name="char.name" :avatarUrl="char.avatar_url" size="sm" />
                  <div>
                    <div style="font-family: var(--font-heading); font-weight: 700;">
                      {{ char.name }}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--ink-muted);">
                      {{ char.race }} {{ char.class }} • {{ t('tableDetail.playerLabel') }} {{ char.owner_name }}
                    </div>
                  </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--gold-accent);"></i>
              </router-link>
            </div>
          </div>

          <div class="folio-card">
            <div class="dashboard-section-header">
              <h3 style="margin: 0; font-size: 1.25rem;">
                <i class="fas fa-clock-rotate-left" style="color: var(--crimson-seal); margin-right: 0.4rem;"></i>
                {{ t('tableDetail.overviewTimelinePreview') }} ({{ chronicles.length }})
              </h3>
              <button type="button" class="btn-archive btn-crimson btn-sm" @click="selectTab('timeline')">
                {{ t('tableDetail.viewFullTimelineBtn') }}
              </button>
            </div>

            <div v-if="chronicles.length === 0" style="color: var(--ink-secondary); text-align: center; padding: 1.25rem 0;">
              <p>{{ t('tableDetail.timelineEmptyState') }}</p>
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div
                v-for="entry in chronicles.slice(0, 3)"
                :key="entry.id"
                style="
                  padding: 0.75rem 0.95rem;
                  background: var(--parchment-light);
                  border: 1px solid var(--parchment-border);
                  border-radius: var(--radius-sm);
                  cursor: pointer;
                "
                @click="selectedEntry = entry"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--ink-muted); margin-bottom: 0.2rem;">
                  <strong>{{ entry.character_name }} (@{{ entry.author_username }})</strong>
                  <span>{{ formatArchiveDateTime(entry.created_at) }}</span>
                </div>
                <div style="font-family: var(--font-heading); font-weight: 700; color: var(--ink-primary);">
                  {{ entry.title }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 2: CHARACTERS (PERSONAGENS) -->
      <section v-else-if="activeTab === 'characters'">
        <div v-if="characters.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
          <h3>{{ t('tableDetail.noCharactersTitle', { name: table.name }) }}</h3>
          <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
            {{ t('tableDetail.noCharactersText') }}
          </p>
          <button type="button" class="btn-archive btn-crimson" @click="showCharModal = true">
            <i class="fas fa-user-plus"></i> {{ t('tableDetail.createFirstCharBtn') }}
          </button>
        </div>

        <div v-else class="cards-grid-3">
          <article
            v-for="char in characters"
            :key="char.id"
            class="folio-card folio-card-interactive"
            style="display: flex; flex-direction: column; justify-content: space-between;"
          >
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <span v-if="char.is_owner" class="badge-seal badge-owner">
                  <i class="fas fa-feather"></i> {{ t('dashboard.yourHeroBadge') }}
                </span>
                <span v-else class="badge-seal">
                  <i class="fas fa-user"></i> @{{ char.owner_username }}
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <CharacterAvatar :name="char.name" :avatarUrl="char.avatar_url" size="md" />
                <div>
                  <h3 style="margin: 0; font-size: 1.3rem;">
                    <router-link :to="`/characters/${char.id}`" style="color: var(--ink-primary);">
                      {{ char.name }}
                    </router-link>
                  </h3>
                  <div v-if="char.title" style="font-size: 0.88rem; color: var(--crimson-seal); font-style: italic;">
                    {{ char.title }}
                  </div>
                  <div style="font-size: 0.82rem; color: var(--ink-muted); margin-top: 0.2rem;">
                    {{ t('tableDetail.playerLabel') }} <strong>{{ char.owner_name }}</strong>
                  </div>
                </div>
              </div>

              <div class="dossier-attributes-ribbon" style="margin-bottom: 0.9rem;">
                <span class="attr-chip"><strong>{{ t('tableDetail.raceLabel') }}</strong> {{ char.race }}</span>
                <span class="attr-chip"><strong>{{ t('tableDetail.classLabel') }}</strong> {{ char.class }}</span>
                <span class="attr-chip"><strong>{{ t('tableDetail.genderLabel') }}</strong> {{ char.gender }}</span>
              </div>

              <p
                style="
                  color: var(--ink-secondary);
                  font-size: 0.95rem;
                  margin-bottom: 1.15rem;
                  display: -webkit-box;
                  -webkit-line-clamp: 3;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                "
              >
                {{ char.biography || t('tableDetail.noBiography') }}
              </p>
            </div>

            <div
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-top: 1px solid var(--parchment-border);
                padding-top: 0.85rem;
              "
            >
              <span style="font-size: 0.86rem; color: var(--ink-muted);">
                <i class="fas fa-book-open"></i> {{ t('dashboard.chroniclesCount', { count: char.entry_count }) }}
              </span>
              <router-link :to="`/characters/${char.id}`" class="btn-archive btn-parchment btn-sm">
                <i class="fas fa-id-card"></i> {{ t('tableDetail.openProfileBtn') }}
              </router-link>
            </div>
          </article>
        </div>
      </section>

      <!-- TAB 3: CAMPAIGN TIMELINE (LINHA DO TEMPO) -->
      <section v-else-if="activeTab === 'timeline'">
        <!-- Timeline Filter & Action Toolbar -->
        <div
          class="folio-card"
          style="
            padding: 1rem 1.35rem;
            margin-bottom: 1.75rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
          "
        >
          <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <label class="form-label" style="margin: 0;" for="timeline-char-filter">
                {{ t('tableDetail.filterByCharacter') }}
              </label>
              <select
                id="timeline-char-filter"
                v-model="timelineCharFilter"
                class="form-select"
                style="width: auto; min-width: 210px; padding: 0.4rem 0.75rem;"
              >
                <option value="">{{ t('tableDetail.allTableCharacters', { count: chronicles.length }) }}</option>
                <option v-for="c in characters" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.race }} {{ c.class }})
                </option>
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <label class="form-label" style="margin: 0;" for="timeline-date-filter">
                {{ t('tableDetail.filterByDate') }}
              </label>
              <input
                id="timeline-date-filter"
                v-model="timelineDateFilter"
                type="date"
                class="form-input"
                style="width: auto; padding: 0.36rem 0.7rem;"
              />
            </div>

            <button
              v-if="hasActiveTimelineFilter"
              type="button"
              class="btn-archive btn-parchment btn-sm"
              @click="resetTimelineFilters"
            >
              <i class="fas fa-rotate-left"></i> {{ t('tableDetail.resetTimelineBtn') }}
            </button>
          </div>

          <button
            v-if="writableCharacters.length > 0"
            type="button"
            class="btn-archive btn-crimson btn-sm"
            @click="showDiaryModal = true"
          >
            <i class="fas fa-feather-pointed"></i> {{ t('tableDetail.writeNewEntryBtn') }}
          </button>
        </div>

        <!-- Empty State when Table has No Entries at all -->
        <div v-if="chronicles.length === 0" class="folio-card" style="text-align: center; padding: 3rem 2rem;">
          <i class="fas fa-scroll" style="font-size: 2.25rem; color: var(--gold-accent); margin-bottom: 0.85rem;"></i>
          <p style="font-size: 1.15rem; color: var(--ink-secondary); max-width: 540px; margin: 0 auto 1.25rem;">
            {{ t('tableDetail.timelineEmptyState') }}
          </p>
          <button
            v-if="writableCharacters.length > 0"
            type="button"
            class="btn-archive btn-crimson"
            @click="showDiaryModal = true"
          >
            <i class="fas fa-feather-pointed"></i> {{ t('tableDetail.writeNewEntryBtn') }}
          </button>
        </div>

        <!-- Empty State when Filters Match Nothing -->
        <div v-else-if="filteredTimelineEntries.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
          <p style="color: var(--ink-secondary); margin-bottom: 1rem;">
            {{ t('tableDetail.timelineFilteredEmpty') }}
          </p>
          <button type="button" class="btn-archive btn-parchment btn-sm" @click="resetTimelineFilters">
            <i class="fas fa-rotate-left"></i> {{ t('tableDetail.resetTimelineBtn') }}
          </button>
        </div>

        <!-- Chronological Campaign Feed (All Characters Mixed, Newest First) -->
        <div v-else class="campaign-timeline-feed">
          <article
            v-for="entry in filteredTimelineEntries"
            :key="entry.id"
            class="timeline-feed-item"
            @click="selectedEntry = entry"
          >
            <!-- Prominent Character Identity Header -->
            <div class="timeline-character-header" @click.stop>
              <router-link :to="`/characters/${entry.character_id}`" class="timeline-character-identity">
                <CharacterAvatar :name="entry.character_name" :avatarUrl="entry.character_avatar" size="md" />
                <div>
                  <h3 class="timeline-character-name">{{ entry.character_name }}</h3>
                  <div class="timeline-character-sub">
                    <span>{{ entry.character_race }} {{ entry.character_class }}</span>
                    <span>•</span>
                    <span>
                      <i class="fas fa-feather-pointed" style="color: var(--crimson-seal);"></i>
                      {{ entry.author_name }} (@{{ entry.author_username }})
                    </span>
                  </div>
                </div>
              </router-link>

              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;">
                <span style="font-size: 0.85rem; color: var(--ink-muted);">
                  <i class="fas fa-clock"></i> {{ formatArchiveDateTime(entry.created_at) }}
                </span>
                <span v-if="entry.session_label" class="badge-seal">
                  {{ entry.session_label }}
                </span>
              </div>
            </div>

            <!-- Diary Entry Title & Excerpt Preview -->
            <h4 class="chronicle-entry-title" style="margin-bottom: 0.45rem;">{{ entry.title }}</h4>
            <div class="timeline-entry-excerpt">{{ getExcerpt(entry.content) }}</div>

            <!-- Feed Item Footer: Read Complete Entry + Owner-Only Edit/Delete Actions -->
            <div class="timeline-feed-footer" @click.stop>
              <button
                type="button"
                class="btn-archive btn-parchment btn-sm"
                @click="selectedEntry = entry"
              >
                <i class="fas fa-book-open"></i> {{ t('tableDetail.readFullEntryBtn') }}
              </button>

              <div v-if="entry.can_edit" style="display: flex; gap: 0.45rem;">
                <button
                  type="button"
                  class="btn-archive btn-parchment btn-sm"
                  :title="t('characterProfile.editEntryTitle')"
                  @click="editingEntry = entry"
                >
                  <i class="fas fa-pen"></i> {{ t('characterProfile.editBtn') }}
                </button>
                <button
                  type="button"
                  class="btn-archive btn-danger-outline btn-sm"
                  :title="t('characterProfile.deleteEntryTitle')"
                  @click="deleteEntry(entry)"
                >
                  <i class="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- Modals -->
    <TableModal
      v-if="showEditTableModal && table"
      :table="table"
      @close="showEditTableModal = false"
      @saved="onTableUpdated"
    />

    <CharacterModal
      v-if="showCharModal && table"
      :tables="[table]"
      :fixedTableId="table.id"
      @close="showCharModal = false"
      @saved="onCharacterCreated"
    />

    <DiaryModal
      v-if="showDiaryModal && table"
      :characters="writableCharacters"
      @close="showDiaryModal = false"
      @saved="onDiarySaved"
    />

    <DiaryReaderModal
      v-if="selectedEntry"
      :entry="selectedEntry"
      @close="selectedEntry = null"
      @edit="openEditEntry"
      @delete="deleteEntry"
    />

    <DiaryModal
      v-if="editingEntry"
      :entry="editingEntry"
      :characters="writableCharacters"
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
import { t, formatTableStatus } from '../i18n/index.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import TableModal from '../components/TableModal.vue';
import CharacterModal from '../components/CharacterModal.vue';
import DiaryModal from '../components/DiaryModal.vue';
import DiaryReaderModal from '../components/DiaryReaderModal.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');

function resolveInitialTab() {
  if (route.meta.defaultTab === 'timeline' || route.query.tab === 'timeline') {
    return 'timeline';
  }
  if (route.query.tab === 'characters') {
    return 'characters';
  }
  if (route.query.tab === 'overview') {
    return 'overview';
  }
  return 'timeline';
}

const activeTab = ref(resolveInitialTab());

const table = ref(null);
const owner = ref(null);
const characters = ref([]);
const chronicles = ref([]);

const timelineCharFilter = ref('');
const timelineDateFilter = ref('');

const showEditTableModal = ref(false);
const showCharModal = ref(false);
const showDiaryModal = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);

const writableCharacters = computed(() =>
  characters.value.filter((c) => c.can_write_diary)
);

const hasActiveTimelineFilter = computed(() =>
  Boolean(timelineCharFilter.value || timelineDateFilter.value)
);

const filteredTimelineEntries = computed(() => {
  return chronicles.value.filter((entry) => {
    if (timelineCharFilter.value && Number(entry.character_id) !== Number(timelineCharFilter.value)) {
      return false;
    }
    if (timelineDateFilter.value) {
      const entryDate = String(entry.created_at || '').slice(0, 10);
      if (entryDate !== timelineDateFilter.value) {
        return false;
      }
    }
    return true;
  });
});

function selectTab(tabName) {
  activeTab.value = tabName;
}

function resetTimelineFilters() {
  timelineCharFilter.value = '';
  timelineDateFilter.value = '';
}

function getExcerpt(content, maxLength = 340) {
  const text = String(content || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

async function loadTableDetail() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await apiFetch(`/api/tables/${route.params.id}`);
    table.value = res.table;
    owner.value = res.owner;
    characters.value = res.characters || [];
    chronicles.value = res.chronicles || [];
  } catch (err) {
    errorMsg.value = err.message || 'Não foi possível carregar a mesa de RPG.';
  } finally {
    loading.value = false;
  }
}

async function onTableUpdated() {
  showEditTableModal.value = false;
  await loadTableDetail();
}

function onCharacterCreated(char) {
  showCharModal.value = false;
  router.push(`/characters/${char.id}`);
}

async function onDiarySaved() {
  showDiaryModal.value = false;
  editingEntry.value = null;
  await loadTableDetail();
  activeTab.value = 'timeline';
}

function openEditEntry(entry) {
  selectedEntry.value = null;
  editingEntry.value = entry;
}

async function deleteEntry(entry) {
  if (!window.confirm(t('tableDetail.confirmDeleteEntry', { title: entry.title }))) return;
  await apiFetch(`/api/diaries/${entry.id}`, { method: 'DELETE' });
  selectedEntry.value = null;
  await loadTableDetail();
}

async function deleteTable() {
  if (!window.confirm(t('tableDetail.confirmDeleteTable', { table: table.value.name }))) return;
  await apiFetch(`/api/tables/${table.value.id}`, { method: 'DELETE' });
  router.push('/tables');
}

watch(
  () => [route.params.id, route.name, route.query.tab],
  ([newId, ,], [oldId]) => {
    activeTab.value = resolveInitialTab();
    if (newId !== oldId) {
      loadTableDetail();
    }
  }
);

onMounted(loadTableDetail);
</script>
