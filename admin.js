const adminPassword = 'admin2026';
const storageKey = 'carriere-announcements';
const defaultAnnouncements = [
  { title: 'Responsable de projet culturel', type: 'Emploi', company: 'Maison Commune', location: 'Lyon · Hybride', date: 'Aujourd’hui', description: 'Coordonner des projets qui rapprochent les publics de la culture.' },
  { title: 'Photographe pour série éditoriale', type: 'Mission', company: 'Studio Minuit', location: 'Paris · Sur place', date: 'Hier', description: 'Une série de portraits sensibles pour raconter les métiers d’aujourd’hui.' },
  { title: 'Développeur·se no-code', type: 'Emploi', company: 'Les Idées Claires', location: 'Nantes · Flexible', date: 'Il y a 2 jours', description: 'Transformer des idées utiles en outils simples et accessibles.' },
  { title: 'Identité visuelle pour café engagé', type: 'Projet', company: 'Café Météore', location: 'Bordeaux · À distance', date: 'Il y a 3 jours', description: 'Donner une voix graphique à un nouveau lieu de quartier.' },
  { title: 'Chargé·e de communication', type: 'Emploi', company: 'Collectif Horizon', location: 'Marseille · Hybride', date: 'Il y a 4 jours', description: 'Faire circuler les histoires d’une association en mouvement.' },
  { title: 'Mission UX research', type: 'Mission', company: 'Atelier Possible', location: 'Lille · À distance', date: 'Il y a 5 jours', description: 'Écouter les usages pour concevoir des expériences plus justes.' }
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

document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (document.querySelector('#password-input').value !== adminPassword) { document.querySelector('#login-feedback').textContent = 'Mot de passe incorrect.'; return; }
  sessionStorage.setItem('carriere-admin', 'true');
  loginView.hidden = true; dashboardView.hidden = false; renderAdminList();
});
document.querySelector('#logout-button').addEventListener('click', () => { sessionStorage.removeItem('carriere-admin'); dashboardView.hidden = true; loginView.hidden = false; });
document.querySelector('#admin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  announcements.unshift({ title: data.get('title'), type: data.get('type'), location: data.get('location'), company: data.get('company'), description: data.get('description'), date: 'À l’instant' });
  save(); event.currentTarget.reset(); document.querySelector('#admin-feedback').textContent = 'Annonce publiée avec succès.'; renderAdminList();
});
if (sessionStorage.getItem('carriere-admin') === 'true') { loginView.hidden = true; dashboardView.hidden = false; renderAdminList(); }
lucide.createIcons();
