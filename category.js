const category = document.body.dataset.category;
const labels = { jobs: 'Offre d’emploi', notices: 'Annonce', tenders: 'Appel d’offre' };
const displayLabels = { jobs: 'Offres d’emploi', notices: 'Annonces', tenders: 'Appels d’offres' };
const query = document.querySelector('#category-search');
const list = document.querySelector('#category-list');
const title = document.querySelector('#category-title');
document.title = `${displayLabels[category]} — Carrières RDC`;
title.innerHTML = `${displayLabels[category].split(' ')[0]}<br><em>${displayLabels[category].split(' ').slice(1).join(' ')}</em>`;

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function descriptionParagraphs(value) { return String(value).split(/\n+|(?<=;)\s+/).map((part) => part.trim()).filter(Boolean).map((part) => `<p>${escapeHtml(part)}</p>`).join(''); }
async function render() {
  let items;
  try { items = await apiRequest(`/announcements?category=${encodeURIComponent(labels[category])}`); }
  catch { items = []; }
  const search = query.value.trim().toLowerCase();
  const visible = items.filter((item) => `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(search));
  list.innerHTML = visible.map((item) => `<a class="announcement-card category-item" href="detail.html?id=${encodeURIComponent(item.id)}"><div class="card-meta"><span class="tag">${escapeHtml(item.category)}</span><span class="date">${new Date(item.created_at).toLocaleDateString('fr-FR')}</span></div><h3>${escapeHtml(item.title)}</h3><span class="company">${escapeHtml(item.company)}</span><p class="category-description">${escapeHtml(String(item.description).split(/\n+|(?<=;)\s+/)[0])}</p><span class="location"><i data-lucide="map-pin"></i>${escapeHtml(item.location)}</span><span class="detail-hint">Voir le détail complet <i data-lucide="arrow-up-right"></i></span></a>`).join('');
  document.querySelector('#category-empty').hidden = visible.length > 0;
  lucide.createIcons();
}
query.addEventListener('input', render);
lucide.createIcons();
render();
