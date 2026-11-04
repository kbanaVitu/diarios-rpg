<template>
  <div>
    <section class="page-folio-header">
      <div>
        <div class="page-folio-kicker">
          <i class="fas fa-compass-drafting"></i>
          <span>{{ t('tables.kicker') }}</span>
        </div>
        <h1 class="page-folio-title">{{ t('tables.title') }}</h1>
        <p class="page-folio-subtitle">
          {{ t('tables.subtitle') }}
        </p>
      </div>

      <button type="button" class="btn-archive btn-crimson" @click="showCreateModal = true">
        <i class="fas fa-plus"></i> {{ t('tables.createBtn') }}
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
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button
          type="button"
          :class="['btn-archive', 'btn-sm', filterRole === 'all' ? '' : 'btn-parchment']"
          @click="filterRole = 'all'"
        >
          {{ t('tables.filterAll', { count: tables.length }) }}
        </button>
        <button
          type="button"
          :class="['btn-archive', 'btn-sm', filterRole === 'owned' ? '' : 'btn-parchment']"
          @click="filterRole = 'owned'"
        >
          <i class="fas fa-crown"></i> {{ t('tables.filterOwned', { count: ownedCount }) }}
        </button>
        <button
          type="button"
          :class="['btn-archive', 'btn-sm', filterRole === 'member' ? '' : 'btn-parchment']"
          @click="filterRole = 'member'"
        >
          <i class="fas fa-users"></i> {{ t('tables.filterMember', { count: memberCount }) }}
        </button>
      </div>

      <div style="min-width: 260px; flex: 1; max-width: 360px;">
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          :placeholder="t('tables.searchPlaceholder')"
        />
      </div>
    </div>

    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">{{ t('tables.loading') }}</p>
    </div>

    <div v-else-if="filteredTables.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <h3>{{ t('tables.emptyTitle') }}</h3>
      <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
        {{ t('tables.emptyText') }}
      </p>
      <button type="button" class="btn-archive btn-crimson" @click="showCreateModal = true">
        <i class="fas fa-plus"></i> {{ t('tables.createBtn') }}
      </button>
    </div>

    <div v-else class="cards-grid-2">
      <article
        v-for="table in filteredTables"
        :key="table.id"
        class="folio-card folio-card-interactive"
        style="display: flex; flex-direction: column; justify-content: space-between;"
      >
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.65rem;">
            <span class="badge-seal" :class="{ 'badge-owner': table.is_owner }">
              <i :class="table.is_owner ? 'fas fa-crown' : 'fas fa-user-shield'"></i>
              {{
                table.is_owner
                  ? t('tables.ownerBadge')
                  : t('dashboard.memberBadge', { role: formatRole(table.my_role) })
              }}
            </span>
            <span class="badge-seal badge-status-active">
              {{ table.system }} • {{ formatTableStatus(table.status) }}
            </span>
          </div>

          <h2 style="font-size: 1.45rem; margin-bottom: 0.35rem;">
            <router-link :to="`/tables/${table.id}`" style="color: var(--ink-primary);">
              {{ table.name }}
            </router-link>
          </h2>

          <div style="font-size: 0.88rem; color: var(--ink-muted); margin-bottom: 0.85rem;">
            <i class="fas fa-hourglass-half"></i> {{ table.era_label }} • {{ t('tables.tableOwnerLabel') }}
            <strong>{{ table.owner_name }}</strong>
          </div>

          <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
            {{ table.description || t('tables.noDescription') }}
          </p>
        </div>

        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid var(--parchment-border);
            padding-top: 0.9rem;
            font-size: 0.88rem;
            color: var(--ink-muted);
          "
        >
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <span><i class="fas fa-users"></i> {{ t('dashboard.membersCount', { count: table.member_count }) }}</span>
            <span><i class="fas fa-user-shield"></i> {{ t('dashboard.heroesCount', { count: table.character_count }) }}</span>
            <span><i class="fas fa-book-open"></i> {{ t('dashboard.chroniclesCount', { count: table.entry_count }) }}</span>
          </div>

          <router-link :to="`/tables/${table.id}`" class="btn-archive btn-parchment btn-sm">
            {{ t('tables.enterTableBtn') }} <i class="fas fa-arrow-right"></i>
          </router-link>
        </div>
      </article>
    </div>

    <TableModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @saved="onTableCreated"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../services/api.js';
import { t, formatRole, formatTableStatus } from '../i18n/index.js';
import TableModal from '../components/TableModal.vue';

const router = useRouter();
const tables = ref([]);
const loading = ref(true);
const filterRole = ref('all');
const searchQuery = ref('');
const showCreateModal = ref(false);

const ownedCount = computed(() => tables.value.filter((tbl) => tbl.is_owner).length);
const memberCount = computed(() => tables.value.filter((tbl) => !tbl.is_owner).length);

const filteredTables = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return tables.value.filter((tbl) => {
    if (filterRole.value === 'owned' && !tbl.is_owner) return false;
    if (filterRole.value === 'member' && tbl.is_owner) return false;
    if (q) {
      const hay = `${tbl.name} ${tbl.system} ${tbl.description} ${tbl.owner_name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

async function loadTables() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/tables');
    tables.value = res.tables || [];
  } finally {
    loading.value = false;
  }
}

function onTableCreated(table) {
  showCreateModal.value = false;
  router.push(`/tables/${table.id}`);
}

onMounted(loadTables);
</script>
