<template>
  <div>
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-user-shield"></i>
          <span>{{ t('characters.kicker') }}</span>
        </div>
        <h1 class="page-folio-title">{{ t('characters.title') }}</h1>
        <p class="page-folio-subtitle">
          {{ t('characters.subtitle') }}
        </p>
      </div>

      <button
        type="button"
        class="btn-archive btn-crimson"
        :disabled="tables.length === 0"
        @click="showCreateModal = true"
      >
        <i class="fas fa-user-plus"></i> {{ t('characters.createBtn') }}
      </button>
    </section>

    <!-- Filter Toolbar -->
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
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
        <button
          type="button"
          :class="['btn-archive', 'btn-sm', !onlyMine ? '' : 'btn-parchment']"
          @click="onlyMine = false"
        >
          {{ t('characters.filterAll') }}
        </button>
        <button
          type="button"
          :class="['btn-archive', 'btn-sm', onlyMine ? '' : 'btn-parchment']"
          @click="onlyMine = true"
        >
          <i class="fas fa-user-check"></i> {{ t('characters.filterMine') }}
        </button>

        <select
          v-model="selectedTableId"
          class="form-select"
          style="width: auto; min-width: 220px; padding: 0.4rem 0.75rem;"
        >
          <option value="">{{ t('characters.allAccessibleTables') }}</option>
          <option v-for="tbl in tables" :key="tbl.id" :value="tbl.id">
            {{ tbl.name }}
          </option>
        </select>
      </div>

      <div style="min-width: 250px; flex: 1; max-width: 340px;">
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          :placeholder="t('characters.searchPlaceholder')"
        />
      </div>
    </div>

    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">{{ t('characters.loading') }}</p>
    </div>

    <div v-else-if="filteredCharacters.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <h3>{{ t('characters.emptyTitle') }}</h3>
      <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
        {{
          tables.length === 0
            ? t('characters.emptyNoTables')
            : t('characters.emptyWithTables')
        }}
      </p>
      <button
        v-if="tables.length > 0"
        type="button"
        class="btn-archive btn-crimson"
        @click="showCreateModal = true"
      >
        <i class="fas fa-user-plus"></i> {{ t('characters.createBtn') }}
      </button>
    </div>

    <div v-else class="cards-grid-3">
      <article
        v-for="char in filteredCharacters"
        :key="char.id"
        class="folio-card folio-card-interactive"
        style="display: flex; flex-direction: column; justify-content: space-between;"
      >
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
            <router-link :to="`/tables/${char.table_id}`" class="badge-seal">
              <i class="fas fa-compass"></i> {{ char.table_name }}
            </router-link>
            <span v-if="char.is_owner" class="badge-seal badge-owner">
              <i class="fas fa-feather"></i> {{ t('dashboard.yourHeroBadge') }}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <CharacterAvatar :name="char.name" :avatarUrl="char.avatar_url" size="md" />
            <div>
              <h2 style="margin: 0; font-size: 1.35rem;">
                <router-link :to="`/characters/${char.id}`" style="color: var(--ink-primary);">
                  {{ char.name }}
                </router-link>
              </h2>
              <div v-if="char.title" style="font-size: 0.9rem; color: var(--crimson-seal); font-style: italic;">
                {{ char.title }}
              </div>
              <div style="font-size: 0.82rem; color: var(--ink-muted); margin-top: 0.15rem;">
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
              font-size: 0.96rem;
              margin-bottom: 1.2rem;
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
            <i class="fas fa-book-journal-whills"></i> {{ t('dashboard.chroniclesCount', { count: char.entry_count }) }}
          </span>

          <router-link :to="`/characters/${char.id}`" class="btn-archive btn-parchment btn-sm">
            <i class="fas fa-id-card"></i> {{ t('characters.viewProfileBtn') }}
          </router-link>
        </div>
      </article>
    </div>

    <CharacterModal
      v-if="showCreateModal"
      :tables="tables"
      :fixedTableId="selectedTableId || null"
      @close="showCreateModal = false"
      @saved="onCharacterCreated"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../services/api.js';
import { t } from '../i18n/index.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import CharacterModal from '../components/CharacterModal.vue';

const router = useRouter();
const characters = ref([]);
const tables = ref([]);
const loading = ref(true);

const onlyMine = ref(false);
const selectedTableId = ref('');
const searchQuery = ref('');
const showCreateModal = ref(false);

const filteredCharacters = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return characters.value.filter((c) => {
    if (onlyMine.value && !c.is_owner) return false;
    if (selectedTableId.value && Number(c.table_id) !== Number(selectedTableId.value)) return false;
    if (q) {
      const hay = `${c.name} ${c.title} ${c.race} ${c.class} ${c.gender} ${c.biography} ${c.table_name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

async function loadData() {
  loading.value = true;
  try {
    const [charsRes, tablesRes] = await Promise.all([
      apiFetch('/api/characters'),
      apiFetch('/api/tables')
    ]);
    characters.value = charsRes.characters || [];
    tables.value = tablesRes.tables || [];
  } finally {
    loading.value = false;
  }
}

function onCharacterCreated(char) {
  showCreateModal.value = false;
  router.push(`/characters/${char.id}`);
}

onMounted(loadData);
</script>
