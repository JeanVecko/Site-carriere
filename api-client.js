const API_BASE = (window.CARRIERES_API_URL || 'http://localhost:10000/api').replace(/\/$/, '');

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || 'La requête a échoué.');
  return data;
}

function adminHeaders() {
  const token = sessionStorage.getItem('carrieres-admin-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
