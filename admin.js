const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function saveLocalAnnouncements(items) { localStorage.setItem('carrieres-rdc-announcements', JSON.stringify(items)); }
function localAnnouncements() { return JSON.parse(localStorage.getItem('carrieres-rdc-announcements') || '[]'); }

async function renderAdminList() {
  let announcements;
  try { announcements = await apiRequest('/announcements', { headers: adminHeaders() }); }
  catch { announcements = localAnnouncements(); }
  document.querySelector('#announcement-count').textContent = `${announcements.length} en ligne`;
  document.querySelector('#admin-list').innerHTML = announcements.map((item) => `<article class="manage-item"><div><span class="tag">${escapeHtml(item.category || item.type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.company)} · ${escapeHtml(item.location)}</p></div><button class="delete-button" type="button" data-delete="${item.id || ''}" data-title="${escapeHtml(item.title)}" aria-label="Supprimer ${escapeHtml(item.title)}"><i data-lucide="trash-2"></i></button></article>`).join('');
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
    try { if (button.dataset.delete) await apiRequest(`/announcements/${button.dataset.delete}`, { method: 'DELETE', headers: adminHeaders() }); else { const items = localAnnouncements().filter((item) => item.title !== button.dataset.title); saveLocalAnnouncements(items); } }
    catch { return; }
    renderAdminList();
  }));
  lucide.createIcons();
}

async function renderMessages() {
  let messages;
  try { messages = await apiRequest('/messages', { headers: adminHeaders() }); }
  catch { messages = JSON.parse(localStorage.getItem('carrieres-rdc-messages') || '[]'); }
  document.querySelector('#message-count').textContent = `${messages.length} message${messages.length > 1 ? 's' : ''}`;
  document.querySelector('#empty-inbox').hidden = messages.length > 0;
  document.querySelector('#message-list').innerHTML = messages.map((item) => `<article class="message-item"><div class="message-topline"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.created_at || item.date || '')}</span></div><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a><h3>${escapeHtml(item.subject)}</h3><p>${escapeHtml(item.message)}</p><button class="delete-button" type="button" data-message-delete="${item.id || ''}">Supprimer <i data-lucide="trash-2"></i></button></article>`).join('');
  document.querySelectorAll('[data-message-delete]').forEach((button) => button.addEventListener('click', async () => {
    try { if (button.dataset.messageDelete) await apiRequest(`/messages/${button.dataset.messageDelete}`, { method: 'DELETE', headers: adminHeaders() }); else { const items = JSON.parse(localStorage.getItem('carrieres-rdc-messages') || '[]'); items.splice(Number(button.dataset.messageDelete), 1); localStorage.setItem('carrieres-rdc-messages', JSON.stringify(items)); } }
    catch { return; }
    renderMessages();
  }));
  lucide.createIcons();
}

async function openDashboard() { loginView.hidden = true; dashboardView.hidden = false; await renderAdminList(); await renderMessages(); }
document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const feedback = document.querySelector('#login-feedback');
  try {
    const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#email-input').value, password: document.querySelector('#password-input').value }) });
    sessionStorage.setItem('carrieres-admin-token', data.token);
    await openDashboard();
  } catch { feedback.textContent = 'Identifiants incorrects ou API indisponible.'; }
});
document.querySelector('#logout-button').addEventListener('click', () => { sessionStorage.removeItem('carrieres-admin-token'); dashboardView.hidden = true; loginView.hidden = false; });
document.querySelector('#admin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const feedback = document.querySelector('#admin-feedback');
  try { await apiRequest('/announcements', { method: 'POST', headers: adminHeaders(), body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); event.currentTarget.reset(); feedback.textContent = 'Annonce publiée avec succès.'; await renderAdminList(); }
  catch { feedback.textContent = 'Impossible de publier. Vérifiez la connexion au serveur.'; }
});
window.addEventListener('storage', () => { if (!dashboardView.hidden) { renderAdminList(); renderMessages(); } });
document.querySelector('#refresh-messages').addEventListener('click', renderMessages);
if (sessionStorage.getItem('carrieres-admin-token')) openDashboard();
lucide.createIcons();
