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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.site-header').forEach((header) => {
    const navigation = header.querySelector('.main-nav');
    if (!navigation) return;
    navigation.id = navigation.id || `main-navigation-${Math.random().toString(36).slice(2)}`;
    let toggle = header.querySelector('.menu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'menu-toggle';
      toggle.type = 'button';
      toggle.innerHTML = '<i data-lucide="menu"></i>';
      header.append(toggle);
    }
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', navigation.id);
    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
      if (window.lucide) lucide.createIcons();
    });
  });
  if (window.lucide) lucide.createIcons();
});
