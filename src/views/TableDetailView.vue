<template>
  <div>
    <div v-if="loading" class="folio-card" style="text-align: center; padding: 3rem;">
      <i class="fas fa-scroll fa-spin" style="font-size: 2rem; color: var(--gold-accent);"></i>
      <p style="margin-top: 0.75rem;">Unsealing RPG table records...</p>
    </div>

    <div v-else-if="errorMsg" class="folio-card" style="text-align: center; padding: 2.5rem;">
      <div class="archive-alert archive-alert-error" style="justify-content: center;">
        <i class="fas fa-lock"></i>
        <span>{{ errorMsg }}</span>
      </div>
      <router-link to="/tables" class="btn-archive btn-parchment">
        <i class="fas fa-arrow-left"></i> Return to My Tables
      </router-link>
    </div>

    <template v-else-if="table">
      <!-- Table Header Banner -->
      <section class="page-folio-header">
        <div>
          <div class="page-folio-kicker">
            <router-link to="/tables" style="color: var(--ink-muted);">My Tables</router-link>
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
              {{ table.is_owner ? 'You are the Table Owner' : `Your Role: ${table.my_role}` }}
            </span>
            <span class="badge-seal">
              <i class="fas fa-user-tie"></i> Owner: {{ owner?.display_name }} (@{{ owner?.username }})
            </span>
            <span class="badge-seal badge-status-active">
              Status: {{ table.status }}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
          <button type="button" class="btn-archive" @click="showCharModal = true">
            <i class="fas fa-user-plus"></i> Create Character
          </button>
          <button
            v-if="writableCharacters.length > 0"
            type="button"
            class="btn-archive btn-crimson"
            @click="showDiaryModal = true"
          >
            <i class="fas fa-feather-pointed"></i> New Chronicle
          </button>
          <button
            v-if="table.is_owner"
            type="button"
            class="btn-archive btn-parchment"
            @click="showEditTableModal = true"
          >
            <i class="fas fa-sliders"></i> Edit Charter
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
          <i class="fas fa-helmet-safety"></i> Characters ({{ characters.length }})
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'chronicles' }]"
          @click="activeTab = 'chronicles'"
        >
          <i class="fas fa-book-journal-whills"></i> Chronicles ({{ chronicles.length }})
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'members' }]"
          @click="activeTab = 'members'"
        >
          <i class="fas fa-users"></i> Members ({{ members.length + 1 }})
        </button>
        <button
          type="button"
          :class="['archive-tab-btn', { active: activeTab === 'info' }]"
          @click="activeTab = 'info'"
        >
          <i class="fas fa-scroll"></i> Table Information
        </button>
      </div>

      <!-- TAB 1: CHARACTERS -->
      <section v-if="activeTab === 'characters'">
        <div v-if="characters.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
          <h3>No Characters Registered in {{ table.name }}</h3>
          <p style="color: var(--ink-secondary); margin-bottom: 1.25rem;">
            Create a character to establish their profile, upload their portrait, and record their campaign diaries.
          </p>
          <button type="button" class="btn-archive btn-crimson" @click="showCharModal = true">
            <i class="fas fa-user-plus"></i> Create First Character
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
                    Player: <strong>{{ char.owner_name }}</strong>
                  </div>
                </div>
              </div>

              <div class="dossier-attributes-ribbon" style="margin-bottom: 0.9rem;">
                <span class="attr-chip"><strong>Race:</strong> {{ char.race }}</span>
                <span class="attr-chip"><strong>Class:</strong> {{ char.class }}</span>
                <span class="attr-chip"><strong>Gender:</strong> {{ char.gender }}</span>
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
                {{ char.biography || 'No biography written yet.' }}
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
                <i class="fas fa-book-open"></i> {{ char.entry_count }} Chronicles
              </span>
              <router-link :to="`/characters/${char.id}`" class="btn-archive btn-parchment btn-sm">
                <i class="fas fa-id-card"></i> Open Profile
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
            <label class="form-label" style="margin: 0;" for="filter-char-select">Filter by Character:</label>
            <select
              id="filter-char-select"
              v-model="chronicleCharFilter"
              class="form-select"
              style="width: auto; min-width: 220px; padding: 0.4rem 0.75rem;"
            >
              <option value="">All Table Characters ({{ chronicles.length }})</option>
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
            <i class="fas fa-feather-pointed"></i> Inscribe New Entry
          </button>
        </div>

        <div v-if="filteredChronicles.length === 0" class="folio-card" style="text-align: center; padding: 2.5rem;">
          <h3>No Chronicles Recorded Yet</h3>
          <p style="color: var(--ink-secondary);">
            Select one of your characters in this table to record the events of your sessions.
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
                  <span><i class="fas fa-pen-fancy"></i> Scribe: {{ entry.author_name }}</span>
                </div>
              </div>

              <div style="display: flex; gap: 0.45rem;">
                <button
                  type="button"
                  class="btn-archive btn-parchment btn-sm"
                  @click="selectedEntry = entry"
                >
                  <i class="fas fa-expand"></i> Read Folio
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
              Fellowship Roster
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
                  {{ owner?.bio || 'Sovereign creator and owner of this RPG table.' }}
                </div>
              </div>
              <span class="badge-seal badge-owner">
                <i class="fas fa-crown"></i> Table Owner
              </span>
            </div>

            <div class="archive-divider" style="margin: 1rem 0;">
              <span>Campaign Members ({{ members.length }})</span>
            </div>

            <div v-if="members.length === 0" style="text-align: center; padding: 1.25rem; color: var(--ink-muted);">
              No additional members have been inducted into this table yet.
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
                    Joined {{ formatArchiveDate(m.joined_at) }}
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
                    <option value="player">Player</option>
                    <option value="chronicler">Chronicler</option>
                    <option value="co-gm">Co-GM</option>
                  </select>
                  <span v-else class="badge-seal">{{ m.role }}</span>

                  <button
                    v-if="table.is_owner"
                    type="button"
                    class="btn-archive btn-danger-outline btn-sm"
                    title="Remove member from table"
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
              Induct New Table Member
            </h2>
            <p style="color: var(--ink-secondary); font-size: 0.94rem; margin-bottom: 1.2rem;">
              As the Table Owner, you control who can view and participate in <strong>{{ table.name }}</strong>.
            </p>

            <div v-if="memberMsg" :class="['archive-alert', memberMsgType === 'error' ? 'archive-alert-error' : 'archive-alert-success']">
              <i :class="memberMsgType === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-check'"></i>
              <span>{{ memberMsg }}</span>
            </div>

            <form @submit.prevent="addMember">
              <div class="form-group">
                <label class="form-label" for="invite-username">Username or Email *</label>
                <input
                  id="invite-username"
                  v-model="memberForm.username"
                  type="text"
                  list="archive-users-list"
                  class="form-input"
                  placeholder="Enter username (e.g., kaelen or elena)"
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
                <label class="form-label" for="invite-role">Table Role</label>
                <select id="invite-role" v-model="memberForm.role" class="form-select">
                  <option value="player">Player (Standard Companion)</option>
                  <option value="chronicler">Chronicler (Lorekeeper)</option>
                  <option value="co-gm">Co-GM (Assistant Master)</option>
                </select>
              </div>

              <button type="submit" class="btn-archive btn-crimson" style="width: 100%;">
                <i class="fas fa-user-check"></i> Add Member to RPG Table
              </button>
            </form>

            <div v-if="availableDirectoryUsers.length > 0" style="margin-top: 1.5rem;">
              <div class="form-label">Registered Scribes Available to Induct:</div>
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
              Your Table Membership
            </h2>
            <p style="color: var(--ink-secondary);">
              You are an authorized member of <strong>{{ table.name }}</strong> with the role of
              <strong>{{ table.my_role }}</strong>. You may view all characters and chronicles in this table and manage your own characters.
            </p>
            <button type="button" class="btn-archive btn-danger-outline btn-sm" @click="leaveTable">
              <i class="fas fa-right-from-bracket"></i> Leave RPG Table
            </button>
          </div>
        </div>
      </section>

      <!-- TAB 4: TABLE INFORMATION & SETTINGS -->
      <section v-else-if="activeTab === 'info'">
        <div class="folio-card">
          <h2 style="font-size: 1.4rem; margin-bottom: 1rem;">Campaign Charter Details</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
            <div>
              <div class="form-label">Campaign Name</div>
              <div>{{ table.name }}</div>
            </div>
            <div>
              <div class="form-label">System / Ruleset</div>
              <div>{{ table.system }}</div>
            </div>
            <div>
              <div class="form-label">Era / Calendar</div>
              <div>{{ table.era_label }}</div>
            </div>
            <div>
              <div class="form-label">Chartered On</div>
              <div>{{ formatArchiveDate(table.created_at) }}</div>
            </div>
          </div>

          <div class="form-label">Synopsis & Lore</div>
          <div class="biography-scroll" style="margin-bottom: 1.5rem;">
            {{ table.description || 'No lore description recorded.' }}
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
                Owner Administration
              </strong>
              <div style="font-size: 0.88rem; color: var(--ink-muted);">
                Only the table owner can modify charter details or dissolve the campaign.
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem;">
              <button type="button" class="btn-archive btn-parchment" @click="showEditTableModal = true">
                <i class="fas fa-pen-to-square"></i> Edit Charter
              </button>
              <button type="button" class="btn-archive btn-danger-outline" @click="deleteTable">
                <i class="fas fa-trash-can"></i> Dissolve Table
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
    errorMsg.value = err.message || 'Unable to load RPG table.';
  } finally {
    loading.value = false;
  }
}

async function addMember() {
  memberMsg.value = '';
  try {
    await apiFetch(`/api/tables/${table.value.id}/members`, {
      method: 'POST',
      body: {
        username: memberForm.username,
        role: memberForm.role
      }
    });
    memberMsgType.value = 'success';
    memberMsg.value = `User "${memberForm.username}" has been inducted into the table.`;
    memberForm.username = '';
    await loadTableDetail();
  } catch (err) {
    memberMsgType.value = 'error';
    memberMsg.value = err.message || 'Could not add member.';
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
    window.alert(err.message || 'Failed to update role.');
  }
}

async function removeMember(m) {
  if (!window.confirm(`Remove ${m.display_name} (@${m.username}) from ${table.value.name}?`)) return;
  try {
    await apiFetch(`/api/tables/${table.value.id}/members/${m.user_id}`, {
      method: 'DELETE'
    });
    await loadTableDetail();
  } catch (err) {
    window.alert(err.message || 'Failed to remove member.');
  }
}

async function leaveTable() {
  if (!window.confirm(`Leave the RPG table "${table.value.name}"?`)) return;
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
  if (!window.confirm(`Delete chronicle "${entry.title}"?`)) return;
  await apiFetch(`/api/diaries/${entry.id}`, { method: 'DELETE' });
  selectedEntry.value = null;
  await loadTableDetail();
}

async function deleteTable() {
  if (!window.confirm(`Permanently dissolve "${table.value.name}" and all its characters and chronicles?`)) return;
  await apiFetch(`/api/tables/${table.value.id}`, { method: 'DELETE' });
  router.push('/tables');
}

watch(() => route.params.id, loadTableDetail);
onMounted(loadTableDetail);
</script>

