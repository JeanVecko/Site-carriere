const category = document.body.dataset.category;
const labels = { jobs: 'Offres d’emploi', notices: 'Annonces', tenders: 'Appel d’offre' };
const displayLabels = { jobs: 'Offres d’emploi', notices: 'Annonces', tenders: 'Appels d’offres' };
const storageKey = 'carrieres-rdc-announcements';
const fallback = [
  { title: 'Responsable de projet culturel', category: 'Offre d’emploi', company: 'Kivu Culture', location: 'Kinshasa · Hybride', date: 'Aujourd’hui', description: 'Coordonner des projets culturels qui rapprochent les publics en RDC.' },
  { title: 'Développeur·se web junior', category: 'Offre d’emploi', company: 'Congo Digital', location: 'Lubumbashi · Flexible', date: 'Il y a 2 jours', description: 'Transformer des idées utiles en outils simples et accessibles.' },
  { title: 'Photographe pour série documentaire', category: 'Annonce', company: 'Regards du Congo', location: 'Goma · Sur place', date: 'Hier', description: 'Raconter en images les initiatives et les talents de la communauté.' },
  { title: 'Identité visuelle pour commerce local', category: 'Annonce', company: 'Maison Tshopo', location: 'Kisangani · À distance', date: 'Il y a 3 jours', description: 'Donner une identité forte à une nouvelle activité congolaise.' },
  { title: 'Fourniture de matériel informatique', category: 'Appel d’offre', company: 'Impact RDC', location: 'Kinshasa · Date limite : 30 sept.', date: 'Nouveau', description: 'Consultation pour la fourniture de matériel informatique aux équipes.' },
  { title: 'Construction d’un centre communautaire', category: 'Appel d’offre', company: 'Initiative Kivu', location: 'Bukavu · Date limite : 15 oct.', date: 'Cette semaine', description: 'Appel à candidatures pour les travaux d’un centre communautaire.' }
];
const storedItems = JSON.parse(localStorage.getItem(storageKey) || 'null');
let items = storedItems || fallback;
const query = document.querySelector('#category-search');
const list = document.querySelector('#category-list');
const title = document.querySelector('#category-title');
document.title = `${displayLabels[category]} — Carrières RDC`;
title.innerHTML = `${displayLabels[category].split(' ')[0]}<br><em>${displayLabels[category].split(' ').slice(1).join(' ')}</em>`;

function matches(item) {
  const itemCategory = item.category || (item.type === 'Emploi' ? 'Offre d’emploi' : item.type === 'Appel d’offre' ? 'Appel d’offre' : 'Annonce');
  const text = `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase();
  return itemCategory === labels[category] && text.includes(query.value.trim().toLowerCase());
}
function render() {
  const visible = items.filter(matches);
  list.innerHTML = visible.map((item) => `<article class="announcement-card category-item"><div class="card-meta"><span class="tag">${item.category || item.type}</span><span class="date">${item.date}</span></div><h3>${escapeHtml(item.title)}</h3><span class="company">${escapeHtml(item.company)}</span><p class="category-description">${escapeHtml(item.description)}</p><span class="location"><i data-lucide="map-pin"></i>${escapeHtml(item.location)}</span></article>`).join('');
  document.querySelector('#category-empty').hidden = visible.length > 0;
  lucide.createIcons();
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
query.addEventListener('input', render);
render();
lucide.createIcons();
