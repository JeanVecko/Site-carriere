const defaultAnnouncements = [
  { title: 'Responsable de projet culturel', type: 'Emploi', category: 'Offre d’emploi', company: 'Kivu Culture', location: 'Kinshasa · Hybride', date: 'Aujourd’hui', description: 'Coordonner des projets qui rapprochent les publics de la culture en RDC.' },
  { title: 'Développeur·se web junior', type: 'Emploi', category: 'Offre d’emploi', company: 'Congo Digital', location: 'Lubumbashi · Flexible', date: 'Il y a 2 jours', description: 'Transformer des idées utiles en outils simples et accessibles.' },
  { title: 'Photographe pour série documentaire', type: 'Mission', category: 'Annonce', company: 'Regards du Congo', location: 'Goma · Sur place', date: 'Hier', description: 'Raconter en images les initiatives et les talents de la communauté.' },
  { title: 'Identité visuelle pour commerce local', type: 'Projet', category: 'Annonce', company: 'Maison Tshopo', location: 'Kisangani · À distance', date: 'Il y a 3 jours', description: 'Donner une identité forte à une nouvelle activité congolaise.' },
  { title: 'Fourniture de matériel informatique', type: 'Appel d’offre', category: 'Appel d’offre', company: 'Impact RDC', location: 'Kinshasa · Date limite : 30 sept.', date: 'Nouveau', description: 'Consultation pour la fourniture de matériel informatique aux équipes.' },
  { title: 'Construction d’un centre communautaire', type: 'Appel d’offre', category: 'Appel d’offre', company: 'Initiative Kivu', location: 'Bukavu · Date limite : 15 oct.', date: 'Cette semaine', description: 'Appel à candidatures pour les travaux d’un centre communautaire.' }
];

const storedAnnouncements = JSON.parse(localStorage.getItem('carrieres-rdc-announcements') || 'null');
let announcements = storedAnnouncements || defaultAnnouncements;
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
      <div class="card-meta"><span class="tag">${announcement.category || announcement.type}</span><span class="date">${announcement.date}</span></div>
      <h3>${escapeHtml(announcement.title)}</h3>
      <span class="company">${escapeHtml(announcement.company)}</span>
      <span class="location"><i data-lucide="map-pin"></i>${escapeHtml(announcement.location)}</span>
    </article>
  `).join('');
  emptyState.hidden = sorted.length > 0;
  renderDirectoryPreviews();
  lucide.createIcons();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderDirectoryPreviews() {
  const categories = { 'Offre d’emploi': 'jobs-preview', Annonce: 'notices-preview', 'Appel d’offre': 'tenders-preview' };
  Object.entries(categories).forEach(([category, elementId]) => {
    const items = announcements.filter((item) => {
      const itemCategory = item.category || (item.type === 'Emploi' ? 'Offre d’emploi' : item.type === 'Appel d’offre' ? 'Appel d’offre' : 'Annonce');
      return itemCategory === category;
    }).slice(0, 2);
    document.querySelector(`#${elementId}`).innerHTML = items.length ? items.map((item) => `<li>${escapeHtml(item.title)} <small>${escapeHtml(item.location)}</small></li>`).join('') : '<li class="preview-empty">Aucune publication</li>';
  });
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderAnnouncements();
  });
});

searchInput.addEventListener('input', renderAnnouncements);
document.querySelector('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const messages = JSON.parse(localStorage.getItem('carrieres-rdc-messages') || '[]');
  messages.unshift({ name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message'), date: new Date().toLocaleString('fr-FR') });
  localStorage.setItem('carrieres-rdc-messages', JSON.stringify(messages));
  event.currentTarget.reset();
  document.querySelector('#contact-feedback').textContent = 'Votre message a bien été envoyé.';
});
document.querySelector('#sort-button').addEventListener('click', (event) => {
  newestFirst = !newestFirst;
  event.currentTarget.firstChild.textContent = newestFirst ? 'Plus récentes ' : 'Plus anciennes ';
  renderAnnouncements();
});

lucide.createIcons();
renderAnnouncements();
