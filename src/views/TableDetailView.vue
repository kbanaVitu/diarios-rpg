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
          <p class="page-folio-subtitle">{{ table.description }}</p>

          <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.9rem;">
            <span class="badge-seal" :class="{ 'badge-owner': table.is_owner }">
              <i :class="table.is_owner ? 'fas fa-crown' : 'fas fa-shield-halved'"></i>
              {{
                table.is_owner
                  ? t('tableDetail.youAreOwner')
                  : t('tableDetail.yourRole', { role: formatRole(table.my_role) })
              }}
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

      <!-- Table Navigation Tabs -->
      <div class="archive-tabs">
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'characters' }]"
          @click="activeTab = 'characters'"
        >
          <i class="fas fa-user-shield"></i>
          {{ t('tableDetail.tabCharacters', { count: characters.length }) }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'chronicles' }]"
          @click="activeTab = 'chronicles'"
        >
          <i class="fas fa-book-journal-whills"></i>
          {{ t('tableDetail.tabChronicles', { count: chronicles.length }) }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'members' }]"
          @click="activeTab = 'members'"
        >
          <i class="fas fa-users"></i>
          {{ t('tableDetail.tabMembers', { count: members.length + 1 }) }}
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'info' }]"
          @click="activeTab = 'info'"
        >
          <i class="fas fa-scroll"></i> {{ t('tableDetail.tabInfo') }}
        </button>
      </div>

      <!-- TAB 1: CHARACTERS -->
      <section v-if="activeTab === 'characters'">
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

      <!-- TAB 2: CHRONICLES -->
      <section v-else-if="activeTab === 'chronicles'">
        <div
          class="folio-card"
          style="
            padding: 0.9rem 1.25rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
          "
        >
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <label class="form-label" style="margin: 0;" for="filter-char-select">
              {{ t('tableDetail.filterByCharacter') }}
            </label>
            <select
              id="filter-char-select"
              v-model="chronicleCharFilter"
              class="form-select"
              style="width: auto; min-width: 220px; padding: 0.4rem 0.75rem;"
            >
              <option value="">{{ t('tableDetail.allTableCharacters', { count: chronicles.length }) }}</option>
              <option v-for="c in characters" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.race }} {{ c.class }})
              </option>
            </select>
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

        <div v-if="filteredChronicles.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
          <h3>{{ t('tableDetail.noChroniclesTitle') }}</h3>
          <p style="color: var(--ink-secondary);">
            {{ t('tableDetail.noChroniclesText') }}
          </p>
        </div>

        <div v-else class="chronicle-timeline">
          <article
            v-for="entry in filteredChronicles"
            :key="entry.id"
            class="chronicle-entry-card"
          >
            <div class="chronicle-entry-header">
              <div>
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
                  <router-link
                    :to="`/characters/${entry.character_id}`"
                    style="display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-heading); font-weight: 700; font-size: 0.92rem;"
                  >
                    <CharacterAvatar :name="entry.character_name" :avatarUrl="entry.character_avatar" size="sm" style="width: 32px; height: 32px; font-size: 0.75rem;" />
                    <span>{{ entry.character_name }}</span>
                  </router-link>
                  <span v-if="entry.session_label" class="badge-seal">
                    {{ entry.session_label }}
                  </span>
                </div>
                <h3 class="chronicle-entry-title">{{ entry.title }}</h3>
                <div class="chronicle-meta-row">
                  <span><i class="fas fa-calendar-day"></i> {{ formatArchiveDateTime(entry.created_at) }}</span>
                  <span><i class="fas fa-pen-fancy"></i> {{ t('tableDetail.scribeLabel') }} {{ entry.author_name }}</span>
                </div>
              </div>

              <div style="display: flex; gap: 0.45rem;">
                <button
                  type="button"
                  class="btn-archive btn-parchment btn-sm"
                  @click="selectedEntry = entry"
                >
                  <i class="fas fa-expand"></i> {{ t('tableDetail.readFolioBtn') }}
                </button>
                <button
                  v-if="entry.can_edit"
                  type="button"
                  class="btn-archive btn-parchment btn-sm"
                  @click="editingEntry = entry"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>
            </div>

            <div class="chronicle-body-text">{{ entry.content }}</div>
          </article>
        </div>
      </section>

      <!-- TAB 3: MEMBERS & MEMBERSHIP MANAGEMENT -->
      <section v-else-if="activeTab === 'members'">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.75rem;">
          <!-- Member Roster -->
          <div class="folio-card">
            <h2 style="font-size: 1.35rem; margin-bottom: 1rem;">
              <i class="fas fa-users-rays" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              {{ t('tableDetail.fellowshipRoster') }}
            </h2>

            <!-- Table Owner Card (Separate from Members) -->
            <div
              style="
                padding: 1rem;
                background: rgba(124, 33, 25, 0.07);
                border: 1px solid rgba(124, 33, 25, 0.3);
                border-radius: var(--radius-sm);
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
              "
            >
              <div>
                <div style="font-family: var(--font-heading); font-weight: 700;">
                  {{ owner?.display_name }}
                  <span style="color: var(--ink-muted); font-weight: 400;">(@{{ owner?.username }})</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--ink-secondary);">
                  {{ owner?.bio || t('tableDetail.ownerDefaultBio') }}
                </div>
              </div>
              <span class="badge-seal badge-owner">
                <i class="fas fa-crown"></i> {{ t('dashboard.tableOwnerBadge') }}
              </span>
            </div>

            <div class="archive-divider" style="margin: 1rem 0;">
              <span>{{ t('tableDetail.campaignMembersDivider', { count: members.length }) }}</span>
            </div>

            <div v-if="members.length === 0" style="text-align: center; padding: 1.25rem; color: var(--ink-muted);">
              {{ t('tableDetail.noMembersYet') }}
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div
                v-for="m in members"
                :key="m.user_id"
                style="
                  padding: 0.85rem 1rem;
                  background: var(--parchment-light);
                  border: 1px solid var(--parchment-border);
                  border-radius: var(--radius-sm);
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 0.75rem;
                "
              >
                <div>
                  <div style="font-family: var(--font-heading); font-weight: 700;">
                    {{ m.display_name }}
                    <span style="color: var(--ink-muted); font-weight: 400;">(@{{ m.username }})</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--ink-muted);">
                    {{ t('tableDetail.joinedOn', { date: formatArchiveDate(m.joined_at) }) }}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <select
                    v-if="table.is_owner"
                    :value="m.role"
                    class="form-select"
                    style="width: auto; padding: 0.25rem 0.55rem; font-size: 0.82rem;"
                    @change="updateMemberRole(m.user_id, $event.target.value)"
                  >
                    <option value="player">{{ formatRole('player') }}</option>
                    <option value="chronicler">{{ formatRole('chronicler') }}</option>
                    <option value="co-gm">{{ formatRole('co-gm') }}</option>
                  </select>
                  <span v-else class="badge-seal">{{ formatRole(m.role) }}</span>

                  <button
                    v-if="table.is_owner"
                    type="button"
                    class="btn-archive btn-danger-outline btn-sm"
                    :title="t('tableDetail.removeMemberTitle')"
                    @click="removeMember(m)"
                  >
                    <i class="fas fa-user-minus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Owner Membership Management Panel -->
          <div v-if="table.is_owner" class="folio-card">
            <h2 style="font-size: 1.35rem; margin-bottom: 0.5rem;">
              <i class="fas fa-user-plus" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              {{ t('tableDetail.inductMemberHeading') }}
            </h2>
            <p style="color: var(--ink-secondary); font-size: 0.94rem; margin-bottom: 1.2rem;">
              {{ t('tableDetail.inductMemberText') }} <strong>{{ table.name }}</strong>.
            </p>

            <div v-if="memberMsg" :class="['archive-alert', memberMsgType === 'error' ? 'archive-alert-error' : 'archive-alert-success']">
              <i :class="memberMsgType === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-check'"></i>
              <span>{{ memberMsg }}</span>
            </div>

            <form @submit.prevent="addMember">
              <div class="form-group">
                <label class="form-label" for="invite-username">{{ t('tableDetail.usernameOrEmailLabel') }}</label>
                <input
                  id="invite-username"
                  v-model="memberForm.username"
                  type="text"
                  list="archive-users-list"
                  class="form-input"
                  :placeholder="t('tableDetail.invitePlaceholder')"
                  required
                />
                <datalist id="archive-users-list">
                  <option
                    v-for="u in availableDirectoryUsers"
                    :key="u.id"
                    :value="u.username"
                  >
                    {{ u.display_name }} (@{{ u.username }})
                  </option>
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label" for="invite-role">{{ t('tableDetail.tableRoleLabel') }}</label>
                <select id="invite-role" v-model="memberForm.role" class="form-select">
                  <option value="player">{{ t('tableDetail.rolePlayerDesc') }}</option>
                  <option value="chronicler">{{ t('tableDetail.roleChroniclerDesc') }}</option>
                  <option value="co-gm">{{ t('tableDetail.roleCoGmDesc') }}</option>
                </select>
              </div>

              <button type="submit" class="btn-archive btn-crimson" style="width: 100%;">
                <i class="fas fa-user-check"></i> {{ t('tableDetail.addMemberBtn') }}
              </button>
            </form>

            <div v-if="availableDirectoryUsers.length > 0" style="margin-top: 1.5rem;">
              <div class="form-label">{{ t('tableDetail.availableUsersLabel') }}</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
                <button
                  v-for="u in availableDirectoryUsers"
                  :key="u.id"
                  type="button"
                  class="btn-archive btn-parchment btn-sm"
                  @click="memberForm.username = u.username"
                >
                  <i class="fas fa-plus"></i> {{ u.display_name }} (@{{ u.username }})
                </button>
              </div>
            </div>
          </div>

          <div v-else class="folio-card">
            <h2 style="font-size: 1.35rem; margin-bottom: 0.65rem;">
              <i class="fas fa-shield-halved" style="color: var(--crimson-seal); margin-right: 0.45rem;"></i>
              {{ t('tableDetail.yourMembershipHeading') }}
            </h2>
            <p style="color: var(--ink-secondary);">
              {{ t('tableDetail.yourMembershipText', { table: table.name, role: formatRole(table.my_role) }) }}
            </p>
            <button type="button" class="btn-archive btn-danger-outline btn-sm" @click="leaveTable">
              <i class="fas fa-right-from-bracket"></i> {{ t('tableDetail.leaveTableBtn') }}
            </button>
          </div>
        </div>
      </section>

      <!-- TAB 4: TABLE INFORMATION & SETTINGS -->
      <section v-else-if="activeTab === 'info'">
        <div class="folio-card">
          <h2 style="font-size: 1.4rem; margin-bottom: 1rem;">{{ t('tableDetail.charterDetailsHeading') }}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  apiFetch,
  authState,
  formatArchiveDate,
  formatArchiveDateTime
} from '../services/api.js';
import { t, formatRole, formatTableStatus } from '../i18n/index.js';
import CharacterAvatar from '../components/CharacterAvatar.vue';
import TableModal from '../components/TableModal.vue';
import CharacterModal from '../components/CharacterModal.vue';
import DiaryModal from '../components/DiaryModal.vue';
import DiaryReaderModal from '../components/DiaryReaderModal.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');
const activeTab = ref('characters');

const table = ref(null);
const owner = ref(null);
const members = ref([]);
const characters = ref([]);
const chronicles = ref([]);
const directoryUsers = ref([]);

const chronicleCharFilter = ref('');

const showEditTableModal = ref(false);
const showCharModal = ref(false);
const showDiaryModal = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);

const memberForm = reactive({
  username: '',
  role: 'player'
});
const memberMsg = ref('');
const memberMsgType = ref('success');

const writableCharacters = computed(() =>
  characters.value.filter((c) => c.can_write_diary)
);

const filteredChronicles = computed(() => {
  if (!chronicleCharFilter.value) return chronicles.value;
  return chronicles.value.filter(
    (e) => Number(e.character_id) === Number(chronicleCharFilter.value)
  );
});

const availableDirectoryUsers = computed(() => {
  if (!table.value) return [];
  const memberIds = new Set(members.value.map((m) => Number(m.user_id)));
  memberIds.add(Number(table.value.owner_id));
  return directoryUsers.value.filter((u) => !memberIds.has(Number(u.id)));
});

async function loadTableDetail() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await apiFetch(`/api/tables/${route.params.id}`);
    table.value = res.table;
    owner.value = res.owner;
    members.value = res.members || [];
    characters.value = res.characters || [];
    chronicles.value = res.chronicles || [];

    if (res.table.is_owner) {
      const usersRes = await apiFetch('/api/users/search');
      directoryUsers.value = usersRes.users || [];
    }
  } catch (err) {
    errorMsg.value = err.message || 'Não foi possível carregar a mesa de RPG.';
  } finally {
    loading.value = false;
  }
}

async function addMember() {
  memberMsg.value = '';
  try {
    const invitedUsername = memberForm.username;
    await apiFetch(`/api/tables/${table.value.id}/members`, {
      method: 'POST',
      body: {
        username: invitedUsername,
        role: memberForm.role
      }
    });
    memberMsgType.value = 'success';
    memberMsg.value = t('tableDetail.memberAddedSuccess', { username: invitedUsername });
    memberForm.username = '';
    await loadTableDetail();
  } catch (err) {
    memberMsgType.value = 'error';
    memberMsg.value = err.message || 'Não foi possível adicionar o membro.';
  }
}

async function updateMemberRole(userId, role) {
  try {
    await apiFetch(`/api/tables/${table.value.id}/members/${userId}`, {
      method: 'PUT',
      body: { role }
    });
    await loadTableDetail();
  } catch (err) {
    window.alert(err.message || 'Falha ao atualizar o papel do membro.');
  }
}

async function removeMember(m) {
  if (
    !window.confirm(
      t('tableDetail.confirmRemoveMember', {
        name: m.display_name,
        username: m.username,
        table: table.value.name
      })
    )
  ) {
    return;
  }
  try {
    await apiFetch(`/api/tables/${table.value.id}/members/${m.user_id}`, {
      method: 'DELETE'
    });
    await loadTableDetail();
  } catch (err) {
    window.alert(err.message || 'Falha ao remover o membro.');
  }
}

async function leaveTable() {
  if (!window.confirm(t('tableDetail.confirmLeaveTable', { table: table.value.name }))) return;
  await apiFetch(`/api/tables/${table.value.id}/members/${authState.user.id}`, {
    method: 'DELETE'
  });
  router.push('/tables');
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

watch(() => route.params.id, loadTableDetail);
onMounted(loadTableDetail);
</script>
