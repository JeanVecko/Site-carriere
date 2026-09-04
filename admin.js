const adminPassword = 'admin2026';
const storageKey = 'carrieres-rdc-announcements';
const defaultAnnouncements = [
  { title: 'Responsable de projet culturel', type: 'Emploi', category: 'Offre d’emploi', company: 'Kivu Culture', location: 'Kinshasa · Hybride', date: 'Aujourd’hui', description: 'Coordonner des projets qui rapprochent les publics de la culture en RDC.' },
  { title: 'Photographe pour série documentaire', type: 'Mission', company: 'Regards du Congo', location: 'Goma · Sur place', date: 'Hier', description: 'Raconter en images les initiatives et les talents de la communauté.' },
  { title: 'Développeur·se web junior', type: 'Emploi', company: 'Congo Digital', location: 'Lubumbashi · Flexible', date: 'Il y a 2 jours', description: 'Transformer des idées utiles en outils simples et accessibles.' },
  { title: 'Identité visuelle pour commerce local', type: 'Projet', company: 'Maison Tshopo', location: 'Kisangani · À distance', date: 'Il y a 3 jours', description: 'Donner une identité forte à une nouvelle activité congolaise.' },
  { title: 'Chargé·e de communication', type: 'Emploi', company: 'Impact RDC', location: 'Bukavu · Hybride', date: 'Il y a 4 jours', description: 'Faire connaître les projets d’une organisation engagée sur le terrain.' },
  { title: 'Mission en expérience utilisateur', type: 'Mission', company: 'Atelier Congo', location: 'Matadi · À distance', date: 'Il y a 5 jours', description: 'Écouter les usages pour concevoir des services plus simples et plus justes.' }
];
let announcements = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultAnnouncements;
const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function save() { localStorage.setItem(storageKey, JSON.stringify(announcements)); }
function renderAdminList() {
  document.querySelector('#announcement-count').textContent = `${announcements.length} en ligne`;
  document.querySelector('#admin-list').innerHTML = announcements.map((item, index) => `<article class="manage-item"><div><span class="tag">${item.type}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.company)} · ${escapeHtml(item.location)}</p></div><button class="delete-button" type="button" data-delete="${index}" aria-label="Supprimer ${escapeHtml(item.title)}"><i data-lucide="trash-2"></i></button></article>`).join('');
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => { announcements.splice(Number(button.dataset.delete), 1); save(); renderAdminList(); }));
  lucide.createIcons();
}
function renderMessages() {
  const messages = JSON.parse(localStorage.getItem('carrieres-rdc-messages') || '[]');
  document.querySelector('#message-count').textContent = `${messages.length} message${messages.length > 1 ? 's' : ''}`;
  document.querySelector('#empty-inbox').hidden = messages.length > 0;
  document.querySelector('#message-list').innerHTML = messages.map((item, index) => `<article class="message-item"><div class="message-topline"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.date)}</span></div><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a><h3>${escapeHtml(item.subject)}</h3><p>${escapeHtml(item.message)}</p><button class="delete-button" type="button" data-message-delete="${index}">Supprimer <i data-lucide="trash-2"></i></button></article>`).join('');
  document.querySelectorAll('[data-message-delete]').forEach((button) => button.addEventListener('click', () => { messages.splice(Number(button.dataset.messageDelete), 1); localStorage.setItem('carrieres-rdc-messages', JSON.stringify(messages)); renderMessages(); }));
  lucide.createIcons();
}
window.addEventListener('storage', (event) => { if (event.key === 'carrieres-rdc-messages') renderMessages(); });
document.querySelector('#refresh-messages').addEventListener('click', renderMessages);

document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (document.querySelector('#password-input').value !== adminPassword) { document.querySelector('#login-feedback').textContent = 'Mot de passe incorrect.'; return; }
  sessionStorage.setItem('carriere-admin', 'true');
  loginView.hidden = true; dashboardView.hidden = false; renderAdminList(); renderMessages();
});
document.querySelector('#logout-button').addEventListener('click', () => { sessionStorage.removeItem('carriere-admin'); dashboardView.hidden = true; loginView.hidden = false; });
document.querySelector('#admin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  announcements.unshift({ title: data.get('title'), category: data.get('category'), type: data.get('category'), location: data.get('location'), company: data.get('company'), description: data.get('description'), date: 'À l’instant' });
  save(); event.currentTarget.reset(); document.querySelector('#admin-feedback').textContent = 'Annonce publiée avec succès.'; renderAdminList();
});
if (sessionStorage.getItem('carriere-admin') === 'true') { loginView.hidden = true; dashboardView.hidden = false; renderAdminList(); renderMessages(); }
lucide.createIcons();
