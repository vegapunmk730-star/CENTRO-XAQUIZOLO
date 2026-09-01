/* Renderiza a grelha de profissionais na página pública a partir do Supabase */
(function () {
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  function renderHorarios(horarios) {
    if (!Array.isArray(horarios) || !horarios.length) return '';

    const linhas = horarios
      .filter(h => h && h.dia !== undefined && h.inicio && h.fim)
      .map(h => `
        <div class="prof-hours-row">
          <span>${esc(DIAS[h.dia] ?? h.dia)}</span>
          <strong>${esc(h.inicio)} – ${esc(h.fim)}</strong>
        </div>
      `).join('');

    if (!linhas) return '';

    return `
      <div class="prof-hours">
        <div class="prof-hours-title">Horários</div>
        ${linhas}
      </div>`;
  }

  function renderCard(p) {
    return `
      <div class="prof-card">
        <div class="prof-photo-wrap">
          ${
            p.foto_url
              ? `<img class="prof-photo" src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy">`
              : `<div class="prof-photo" style="display:flex;align-items:center;justify-content:center;color:#9aa5ad;font-size:.75rem">Sem foto</div>`
          }
        </div>
        <div class="prof-body">
          <div class="prof-name">${esc(p.nome)}</div>
          ${p.cargo ? `<div class="prof-role">${esc(p.cargo)}</div>` : ''}
          ${p.area_atuacao ? `<span class="prof-area">${esc(p.area_atuacao)}</span>` : ''}
          ${p.descricao ? `<p class="prof-desc">${esc(p.descricao)}</p>` : ''}
          ${p.biografia ? `<p class="prof-bio">${esc(p.biografia)}</p>` : ''}
          ${renderHorarios(p.horarios)}
        </div>
      </div>`;
  }

  async function carregarProfissionaisPublico() {
    const grid = document.getElementById('profissionaisGrid');
    if (!grid || typeof sb === 'undefined') return;

    try {
      const { data, error } = await sb
        .from('profissionais')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;

      if (!data || !data.length) {
        grid.innerHTML = '<div class="prof-empty">A equipa será apresentada em breve.</div>';
        return;
      }

      grid.innerHTML = data.map(renderCard).join('');

    } catch (e) {
      grid.innerHTML = '<div class="prof-empty">Não foi possível carregar a equipa neste momento.</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', carregarProfissionaisPublico);
})();
