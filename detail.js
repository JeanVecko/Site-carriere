const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const content = document.querySelector('#detail-content');
const error = document.querySelector('#detail-error');

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function paragraphs(value) { return String(value).split(/\n+|(?<=;)\s+/).map((part) => part.trim()).filter(Boolean).map((part) => `<p>${escapeHtml(part)}</p>`).join(''); }
async function loadDetail() {
  if (!id) { content.hidden = true; error.hidden = false; return; }
  try {
    let item;
    try { item = await apiRequest(`/announcements/${encodeURIComponent(id)}`); }
    catch {
      const items = await apiRequest('/announcements');
      item = items.find((announcement) => String(announcement.id) === String(id));
      if (!item) throw new Error('Annonce introuvable.');
    }
    document.title = `${item.title} — Carrières RDC`;
    document.querySelector('.detail-page-tag').textContent = item.category;
    document.querySelector('.detail-page-title').textContent = item.title;
    document.querySelector('.detail-page-company').textContent = item.company;
    document.querySelector('.detail-page-location').append(document.createTextNode(item.location));
    document.querySelector('.detail-page-description').innerHTML = paragraphs(item.description);
    const categoryUrl = item.category === 'Offre d’emploi' ? 'offres.html' : item.category === 'Annonce' ? 'annonces.html' : 'appels-offres.html';
    document.querySelector('#back-link').href = categoryUrl;
  } catch { content.hidden = true; error.hidden = false; }
  lucide.createIcons();
}
lucide.createIcons();
loadDetail();
