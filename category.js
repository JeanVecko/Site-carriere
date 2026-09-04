const category = document.body.dataset.category;
const labels = { jobs: 'Offre d’emploi', notices: 'Annonce', tenders: 'Appel d’offre' };
const displayLabels = { jobs: 'Offres d’emploi', notices: 'Annonces', tenders: 'Appels d’offres' };
const query = document.querySelector('#category-search');
const list = document.querySelector('#category-list');
const title = document.querySelector('#category-title');
document.title = `${displayLabels[category]} — Carrières RDC`;
title.innerHTML = `${displayLabels[category].split(' ')[0]}<br><em>${displayLabels[category].split(' ').slice(1).join(' ')}</em>`;

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
async function render() {
  let items;
  try { items = await apiRequest(`/announcements?category=${encodeURIComponent(labels[category])}`); }
  catch { items = []; }
  const search = query.value.trim().toLowerCase();
  const visible = items.filter((item) => `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(search));
  list.innerHTML = visible.map((item) => `<article class="announcement-card category-item"><div class="card-meta"><span class="tag">${escapeHtml(item.category)}</span><span class="date">${new Date(item.created_at).toLocaleDateString('fr-FR')}</span></div><h3>${escapeHtml(item.title)}</h3><span class="company">${escapeHtml(item.company)}</span><p class="category-description">${escapeHtml(item.description)}</p><span class="location"><i data-lucide="map-pin"></i>${escapeHtml(item.location)}</span></article>`).join('');
  document.querySelector('#category-empty').hidden = visible.length > 0;
  lucide.createIcons();
}
query.addEventListener('input', render);
lucide.createIcons();
render();
