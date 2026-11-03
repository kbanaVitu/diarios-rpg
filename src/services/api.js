import { reactive } from 'vue';

const TOKEN_KEY = 'rpg_diaries_token';

export const authState = reactive({
  user: null,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  initialized: false
});

export function setAuth(token, user) {
  authState.token = token;
  authState.user = user;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function clearAuth() {
  setAuth(null, null);
}

export async function apiFetch(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (authState.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include'
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/api/auth/login')) {
      clearAuth();
    }
    const err = new Error((data && data.error) || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function initAuth() {
  if (authState.initialized) return authState.user;
  if (!authState.token) {
    authState.initialized = true;
    return null;
  }
  try {
    const res = await apiFetch('/api/auth/me');
    authState.user = res.user;
  } catch {
    clearAuth();
  } finally {
    authState.initialized = true;
  }
  return authState.user;
}

export function formatArchiveDate(isoString) {
  if (!isoString) return 'Unknown Date';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function formatArchiveDateTime(isoString) {
  if (!isoString) return 'Unknown Date';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

