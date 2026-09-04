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
function closeDetail() { document.querySelector('#detail-modal').hidden = true; document.body.classList.remove('modal-open'); }
function openDetail(item) {
  const modal = document.querySelector('#detail-modal');
  modal.querySelector('.detail-tag').textContent = item.category;
  modal.querySelector('.detail-title').textContent = item.title;
  modal.querySelector('.detail-company').textContent = item.company;
  modal.querySelector('.detail-location').lastChild.textContent = item.location;
  modal.querySelector('.detail-description').innerHTML = descriptionParagraphs(item.description);
  modal.hidden = false;
  document.body.classList.add('modal-open');
}
function createDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'detail-modal'; modal.className = 'detail-modal'; modal.hidden = true;
  modal.innerHTML = `<div class="detail-backdrop" data-close-detail></div><section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button class="detail-close" type="button" aria-label="Fermer" data-close-detail><i data-lucide="x"></i></button><span class="detail-tag tag"></span><h2 class="detail-title" id="detail-title"></h2><strong class="detail-company"></strong><span class="detail-location location"><i data-lucide="map-pin"></i></span><div class="detail-description"></div></section>`;
  document.body.append(modal);
  modal.querySelectorAll('[data-close-detail]').forEach((element) => element.addEventListener('click', closeDetail));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeDetail(); });
  lucide.createIcons();
}
async function render() {
  let items;
  try { items = await apiRequest(`/announcements?category=${encodeURIComponent(labels[category])}`); }
  catch { items = []; }
  const search = query.value.trim().toLowerCase();
  const visible = items.filter((item) => `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(search));
  list.innerHTML = visible.map((item, index) => `<article class="announcement-card category-item" tabindex="0" role="button" data-detail-index="${index}"><div class="card-meta"><span class="tag">${escapeHtml(item.category)}</span><span class="date">${new Date(item.created_at).toLocaleDateString('fr-FR')}</span></div><h3>${escapeHtml(item.title)}</h3><span class="company">${escapeHtml(item.company)}</span><p class="category-description">${escapeHtml(String(item.description).split(/\n+|(?<=;)\s+/)[0])}</p><span class="location"><i data-lucide="map-pin"></i>${escapeHtml(item.location)}</span><span class="detail-hint">Voir le détail <i data-lucide="arrow-up-right"></i></span></article>`).join('');
  list.querySelectorAll('[data-detail-index]').forEach((card) => { const item = visible[Number(card.dataset.detailIndex)]; card.addEventListener('click', () => openDetail(item)); card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(item); } }); });
  document.querySelector('#category-empty').hidden = visible.length > 0;
  lucide.createIcons();
}
query.addEventListener('input', render);
createDetailModal();
lucide.createIcons();
render();
