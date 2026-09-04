const defaultAnnouncements = [
  { title: 'Responsable de projet culturel', type: 'Emploi', company: 'Maison Commune', location: 'Lyon · Hybride', date: 'Aujourd’hui', description: 'Coordonner des projets qui rapprochent les publics de la culture.' },
  { title: 'Photographe pour série éditoriale', type: 'Mission', company: 'Studio Minuit', location: 'Paris · Sur place', date: 'Hier', description: 'Une série de portraits sensibles pour raconter les métiers d’aujourd’hui.' },
  { title: 'Développeur·se no-code', type: 'Emploi', company: 'Les Idées Claires', location: 'Nantes · Flexible', date: 'Il y a 2 jours', description: 'Transformer des idées utiles en outils simples et accessibles.' },
  { title: 'Identité visuelle pour café engagé', type: 'Projet', company: 'Café Météore', location: 'Bordeaux · À distance', date: 'Il y a 3 jours', description: 'Donner une voix graphique à un nouveau lieu de quartier.' },
  { title: 'Chargé·e de communication', type: 'Emploi', company: 'Collectif Horizon', location: 'Marseille · Hybride', date: 'Il y a 4 jours', description: 'Faire circuler les histoires d’une association en mouvement.' },
  { title: 'Mission UX research', type: 'Mission', company: 'Atelier Possible', location: 'Lille · À distance', date: 'Il y a 5 jours', description: 'Écouter les usages pour concevoir des expériences plus justes.' }
];

let announcements = JSON.parse(localStorage.getItem('carriere-announcements') || 'null') || defaultAnnouncements;
let currentFilter = 'Toutes';
let newestFirst = true;

const list = document.querySelector('#announcement-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');

function renderAnnouncements() {
  const search = searchInput.value.trim().toLowerCase();
  const visible = announcements.filter((announcement) => {
    const matchesFilter = currentFilter === 'Toutes' || announcement.type === currentFilter;
    const searchable = `${announcement.title} ${announcement.company} ${announcement.location} ${announcement.description}`.toLowerCase();
    return matchesFilter && searchable.includes(search);
  });
  const sorted = newestFirst ? visible : [...visible].reverse();
  list.innerHTML = sorted.map((announcement) => `
    <article class="announcement-card">
      <div class="card-meta"><span class="tag">${announcement.type}</span><span class="date">${announcement.date}</span></div>
      <h3>${escapeHtml(announcement.title)}</h3>
      <span class="company">${escapeHtml(announcement.company)}</span>
      <span class="location"><i data-lucide="map-pin"></i>${escapeHtml(announcement.location)}</span>
    </article>
  `).join('');
  emptyState.hidden = sorted.length > 0;
  lucide.createIcons();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderAnnouncements();
  });
});

searchInput.addEventListener('input', renderAnnouncements);
document.querySelector('#sort-button').addEventListener('click', (event) => {
  newestFirst = !newestFirst;
  event.currentTarget.firstChild.textContent = newestFirst ? 'Plus récentes ' : 'Plus anciennes ';
  renderAnnouncements();
});

lucide.createIcons();
renderAnnouncements();
