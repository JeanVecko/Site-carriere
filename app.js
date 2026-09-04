const defaultAnnouncements = [];
let announcements = [];
let currentFilter = 'Toutes';
let newestFirst = true;

const list = document.querySelector('#announcement-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function categoryFor(item) { return item.category || (item.type === 'Emploi' ? 'Offre d’emploi' : item.type === 'Appel d’offre' ? 'Appel d’offre' : 'Annonce'); }
function categoryMatches(item) { return currentFilter === 'Toutes' || categoryFor(item) === currentFilter; }

function renderDirectoryPreviews() {
  const categories = { 'Offre d’emploi': 'jobs-preview', Annonce: 'notices-preview', 'Appel d’offre': 'tenders-preview' };
  Object.entries(categories).forEach(([category, elementId]) => {
    const items = announcements.filter((item) => categoryFor(item) === category).slice(0, 2);
    document.querySelector(`#${elementId}`).innerHTML = items.length ? items.map((item) => `<li>${escapeHtml(item.title)} <small>${escapeHtml(item.location)}</small></li>`).join('') : '<li class="preview-empty">Aucune publication</li>';
  });
}

function renderAnnouncements() {
  const search = searchInput.value.trim().toLowerCase();
  const visible = announcements.filter((announcement) => {
    const searchable = `${announcement.title} ${announcement.company} ${announcement.location} ${announcement.description}`.toLowerCase();
    return categoryMatches(announcement) && searchable.includes(search);
  });
  const sorted = newestFirst ? visible : [...visible].reverse();
  list.innerHTML = sorted.slice(0, 4).map((announcement) => `<a class="announcement-card" href="detail.html?id=${encodeURIComponent(announcement.id ?? announcement._id ?? '')}"><div class="card-meta"><span class="tag">${escapeHtml(categoryFor(announcement))}</span><span class="date">${escapeHtml(announcement.date || 'Récent')}</span></div><h3>${escapeHtml(announcement.title)}</h3><span class="company">${escapeHtml(announcement.company)}</span><span class="location"><i data-lucide="map-pin"></i>${escapeHtml(announcement.location)}</span><span class="detail-hint">Voir le détail complet <i data-lucide="arrow-up-right"></i></span></a>`).join('');
  emptyState.hidden = sorted.length > 0;
  renderDirectoryPreviews();
  lucide.createIcons();
}

async function loadAnnouncements() {
  try { announcements = await apiRequest('/announcements'); }
  catch { announcements = JSON.parse(localStorage.getItem('carrieres-rdc-announcements') || 'null') || defaultAnnouncements; }
  renderAnnouncements();
}

document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  renderAnnouncements();
}));
searchInput.addEventListener('input', renderAnnouncements);
document.querySelector('#sort-button').addEventListener('click', (event) => { newestFirst = !newestFirst; event.currentTarget.firstChild.textContent = newestFirst ? 'Plus récentes ' : 'Plus anciennes '; renderAnnouncements(); });
document.querySelector('#contact-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const feedback = document.querySelector('#contact-feedback');
  try { await apiRequest('/messages', { method: 'POST', body: JSON.stringify(data) }); }
  catch { const messages = JSON.parse(localStorage.getItem('carrieres-rdc-messages') || '[]'); messages.unshift({ ...data, date: new Date().toLocaleString('fr-FR') }); localStorage.setItem('carrieres-rdc-messages', JSON.stringify(messages)); }
  event.currentTarget.reset(); feedback.textContent = 'Votre message a bien été envoyé.';
});
lucide.createIcons();
loadAnnouncements();
