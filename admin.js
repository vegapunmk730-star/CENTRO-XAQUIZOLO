const SUPABASE_URL = 'https://bpvcghqofdhdpxwbqmdz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5ZriIb-_ECy0LpMNCpFZgQ_cBzPDV_W';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SITE_URL = 'https://xaquizolo.com';
const ADMIN_EMAIL_PADRAO = '';

const PER_PAGE = 15;
let allData = [], filteredData = [], currentPage = 1;
let pendingDelId = null;
let currentDetailIdx = -1;
let avisosData = [];
let editingAvisoId = null;
let avisoImgFile = null;

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function bc(s) { return { confirmada: 'confirmada', cancelada: 'cancelada', pendente: 'pendente', atendido: 'atendido' }[(s || 'pendente').toLowerCase()] || 'pendente'; }

function fmtData(str) {
  if (!str) return '—';
  const d = parseDataLocal(str);
  if (!d) return str;
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseDataLocal(str) {
  if (!str || str === '—') return null;
  const s = String(str).trim();

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function togglePass(id, btn) {
  const el = document.getElementById(id);
  const mostrar = el.type === 'password';
  el.type = mostrar ? 'text' : 'password';
  btn.textContent = mostrar ? '🙈' : '👁️';
}

async function doLogin() {
  const u = document.getElementById('lUser').value.trim();
  const p = document.getElementById('lPass').value;
  const btn = document.querySelector('.login-btn');
  const errEl = document.getElementById('loginErr');

  errEl.style.display = 'none';

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'A verificar...';
  }

  try {
    const { error } = await sb.auth.signInWithPassword({
      email: u,
      password: p
    });

    if (error) throw error;

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    setDate();
    loadMarcacoes();
    carregarAvisosAdmin();
    initAutomacaoIA();

  } catch (e) {
    errEl.textContent =
      e.message === 'Invalid login credentials'
        ? 'Email ou palavra-passe incorrectos.'
        : ('Erro: ' + e.message);

    errEl.style.display = 'block';
    document.getElementById('lPass').value = '';

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Entrar no Painel';
    }
  }
}

async function doLogout() {
  await sb.auth.signOut();

  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('lPass').value = '';
}

async function verificarSessao() {
  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    setDate();
    loadMarcacoes();
    carregarAvisosAdmin();
    initAutomacaoIA();
  }
}

async function mudarPassword() {
  const p1 = document.getElementById('novaPass1').value;
  const p2 = document.getElementById('novaPass2').value;
  const msgEl = document.getElementById('passMsg');
  const btn = document.getElementById('passBtn');

  function mostrarMsg(texto, tipo) {
    msgEl.textContent = texto;
    msgEl.style.display = 'block';
    msgEl.style.background =
      tipo === 'ok'
        ? 'rgba(45,138,78,0.1)'
        : 'rgba(192,57,43,0.1)';
    msgEl.style.color =
      tipo === 'ok'
        ? '#2d8a4e'
        : '#c0392b';
  }

  if (p1.length < 6) {
    mostrarMsg(
      'A palavra-passe tem de ter pelo menos 6 caracteres.',
      'err'
    );
    return;
  }

  if (p1 !== p2) {
    mostrarMsg(
      'As duas palavras-passe não coincidem.',
      'err'
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A guardar...';

  try {
    const { error } = await sb.auth.updateUser({
      password: p1
    });

    if (error) throw error;

    mostrarMsg(
      'Palavra-passe alterada com sucesso!',
      'ok'
    );

    document.getElementById('novaPass1').value = '';
    document.getElementById('novaPass2').value = '';

  } catch (e) {
    mostrarMsg('Erro: ' + e.message, 'err');

  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar nova palavra-passe';
  }
}

function setDate() {
  document.getElementById('topbarDate').textContent =
    new Date().toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
}

function showTab(tab, el) {
  document.querySelectorAll('.tab-content')
    .forEach(t => t.classList.remove('active'));

  document.querySelectorAll('.sb-link')
    .forEach(l => l.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');

  if (el) el.classList.add('active');

  document.getElementById('topbarTitle').textContent = {
    dashboard: 'Dashboard',
    marcacoes: 'Marcações',
    novidades: 'Novidades',
    automacao: 'Automação IA',
    config: 'Configurações'
  }[tab] || tab;
}

function toggleAdmSidebar() {
  document.querySelector('.sidebar').classList.toggle('mob-open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeAdmSidebar() {
  document.querySelector('.sidebar').classList.remove('mob-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

document.querySelectorAll('.sb-link')
  .forEach(l => l.addEventListener('click', closeAdmSidebar));

async function loadMarcacoes(tentativa = 1) {
  const refreshBtn = document.querySelector('.refresh-btn');

  if (refreshBtn && tentativa === 1) {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.5';
  }

  [
    'tableArea',
    'recentList',
    'tipoBars',
    'todayList',
    'resumoEstados'
  ].forEach(id => {
    const el = document.getElementById(id);

    if (el) {
      el.innerHTML =
        '<div class="loading"><div class="spinner"></div>A carregar...</div>';
    }
  });

  try {
    const { data, error } = await sb
      .from('marcacoes')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) throw error;

    allData = data || [];
    filteredData = [...allData];

    renderStats();
    renderDashboard();
    renderTable();

    const el = document.getElementById('lastUpdate');

    if (el) {
      el.textContent =
        'Actualizado às ' +
        new Date().toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit'
        });
    }

    showToast('Dados actualizados ✓', 'ok');

    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.style.opacity = '';
    }

  } catch (e) {

    if (tentativa < 3) {

      setTimeout(
        () => loadMarcacoes(tentativa + 1),
        2000
      );

      document.getElementById('tableArea').innerHTML =
        `<div class="no-data"><p>A tentar ligação... (${tentativa}/3)</p></div>`;

    } else {

      document.getElementById('tableArea').innerHTML =
        '<div class="no-data"><p>⚠️ Sem ligação ao servidor.</p></div>';

      showToast(
        'Erro de ligação ao servidor.',
        'err'
      );

      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '';
      }
    }
  }
}

function renderStats() {
  document.getElementById('sTot').textContent =
    allData.length;

  document.getElementById('sPend').textContent =
    allData.filter(
      r => (r.estado || 'pendente').toLowerCase() === 'pendente'
    ).length;

  document.getElementById('sConf').textContent =
    allData.filter(
      r => (r.estado || '').toLowerCase() === 'confirmada'
    ).length;

  document.getElementById('sAtend').textContent =
    allData.filter(
      r => (r.estado || '').toLowerCase() === 'atendido'
    ).length;

  document.getElementById('sCanc').textContent =
    allData.filter(
      r => (r.estado || '').toLowerCase() === 'cancelada'
    ).length;
}

function renderDashboard() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const naoCancelada =
    r => (r.estado || '').toLowerCase() !== 'cancelada';

  const hojeList = allData.filter(r => {
    if (!naoCancelada(r)) return false;

    const d = parseDataLocal(r.data);

    if (!d) return false;

    return d.getTime() === hoje.getTime();
  });

  document.getElementById('todayList').innerHTML =
    hojeList.length
      ? hojeList.map(r =>
          `<div class="titem" onclick="abrirPorId('${r.id}')">
            <span class="badge ${bc(r.estado)}">
              ${esc(r.estado || 'Pendente')}
            </span>
            <div>
              <strong>${esc(r.nome || '—')}</strong>
              <br>
              <span style="font-size:0.72rem;color:var(--czc)">
                ${esc(r.servico || '—')} · ${esc(r.hora || 'sem hora')}
              </span>
            </div>
          </div>`
        ).join('')
      : '<div class="tempty">Nenhuma marcação para hoje</div>';

  document.getElementById('recentList').innerHTML =
    allData.slice(0, 8).map(r =>
      `<div class="recent-item" onclick="abrirPorId('${r.id}')">
        <div class="ri-dot" style="background:${
          r.estado === 'Confirmada'
            ? '#2d8a4e'
            : r.estado === 'Cancelada'
              ? '#c0392b'
              : r.estado === 'Atendido'
                ? '#1B3A6B'
                : '#d4860b'
        }"></div>

        <div>
          <div class="ri-name">
            ${esc(r.nome || '—')}
          </div>

          <div class="ri-meta">
            ${esc(r.servico || '—')} ·
            ${fmtData(r.data)} ·
            <b style="color:var(--v)">
              ${esc(r.estado || 'Pendente')}
            </b>
          </div>
        </div>
      </div>`
    ).join('') ||
    '<div class="no-data"><p>Sem marcações ainda.</p></div>';

  const servicos = {};

  allData.forEach(r => {
    const s = r.servico || 'Outro';
    servicos[s] = (servicos[s] || 0) + 1;
  });

  const max = Math.max(
    ...Object.values(servicos),
    1
  );

  document.getElementById('tipoBars').innerHTML =
    Object.entries(servicos)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) =>
        `<div class="tipo-row">
          <div class="tipo-label">${esc(s)}</div>
          <div class="tipo-track">
            <div class="tipo-fill"
                 style="width:${Math.round(n / max * 100)}%">
            </div>
          </div>
          <div class="tipo-count">${n}</div>
        </div>`
      ).join('') ||
      '<p style="font-size:0.8rem;color:var(--czc)">Sem dados</p>';

  const estados = [
    'Pendente',
    'Confirmada',
    'Atendido',
    'Cancelada'
  ];

  document.getElementById('resumoEstados').innerHTML =
    estados.map(es => {
      const n = allData.filter(
        r => (r.estado || 'Pendente') === es
      ).length;

      return `
        <div class="tipo-row">
          <div class="tipo-label">${es}</div>
          <div class="tipo-track">
            <div class="tipo-fill"
                 style="width:${
                   allData.length
                     ? Math.round(n / allData.length * 100)
                     : 0
                 }%">
            </div>
          </div>
          <div class="tipo-count">${n}</div>
        </div>`;
    }).join('');
}

function abrirPorId(id) {
  const idx = filteredData.findIndex(
    r => r.id === id
  );

  if (idx >= 0) {
    showTab(
      'marcacoes',
      document.querySelectorAll('.sb-link')[1]
    );

    openDetail(idx);

  } else {

    filteredData = [...allData];
    renderTable();

    const i = filteredData.findIndex(
      r => r.id === id
    );

    if (i >= 0) openDetail(i);
  }
}

function renderTable() {
  if (!filteredData.length) {

    document.getElementById('tableArea').innerHTML =
      '<div class="no-data"><p>Nenhum resultado.</p></div>';

    document.getElementById('paginationBar').style.display =
      'none';

    return;
  }

  const total = filteredData.length;
  const pages = Math.ceil(total / PER_PAGE);

  if (currentPage > pages) currentPage = 1;

  const start =
    (currentPage - 1) * PER_PAGE;

  const slice =
    filteredData.slice(
      start,
      start + PER_PAGE
    );

  document.getElementById('tableArea').innerHTML =
    `<div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Serviço</th>
            <th>Data</th>
            <th>Hora</th>
            <th>Estado</th>
            <th>Recebida</th>
            <th colspan="3">Acções</th>
          </tr>
        </thead>

        <tbody>
          ${slice.map((r, i) =>
            `<tr>
              <td style="color:var(--czc);font-size:0.75rem;font-weight:600">
                ${esc(r.codigo || r.id || '—')}
              </td>

              <td>
                <strong style="font-weight:500">
                  ${esc(r.nome || '—')}
                </strong>
              </td>

              <td style="font-size:0.78rem">
                <a href="tel:${esc(r.telefone || '')}"
                   style="color:var(--v)">
                  ${esc(r.telefone || '—')}
                </a>
              </td>

              <td style="font-size:0.78rem">
                ${esc(r.servico || '—')}
              </td>

              <td style="font-size:0.78rem">
                ${fmtData(r.data)}
              </td>

              <td style="font-size:0.78rem">
                ${esc(r.hora || '—')}
              </td>

              <td>
                <span class="badge ${bc(r.estado)}">
                  ${esc(r.estado || 'Pendente')}
                </span>
              </td>

              <td style="font-size:0.75rem;color:var(--czc)">
                ${esc(fmtDataHora(r.criado_em))}
              </td>

              <td>
                <button class="action-btn"
                        onclick="openDetail(${start + i})">
                  Ver
                </button>
              </td>

              <td>
                <button class="action-btn"
                        onclick="gerarPDFMarcacao(${start + i})">
                  PDF
                </button>
              </td>

              <td>
                <button class="action-btn del"
                        onclick="pedirApagar('${r.id}',${start + i})">
                  Apagar
                </button>
              </td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('paginationBar').style.display =
    'flex';

  document.getElementById('pagInfo').textContent =
    `${start + 1}–${Math.min(start + PER_PAGE, total)} de ${total}`;

  document.getElementById('pagBtns').innerHTML =
    `<button class="pag-btn"
             onclick="goPage(${currentPage - 1})"
             ${currentPage === 1 ? 'disabled' : ''}>
       ‹
     </button>` +

    Array.from(
      { length: pages },
      (_, i) =>
        `<button class="pag-btn${
          i + 1 === currentPage ? ' active' : ''
        }"
         onclick="goPage(${i + 1})">
          ${i + 1}
        </button>`
    ).join('') +

    `<button class="pag-btn"
             onclick="goPage(${currentPage + 1})"
             ${currentPage === pages ? 'disabled' : ''}>
       ›
     </button>`;
}

function goPage(p) {
  const pages =
    Math.ceil(filteredData.length / PER_PAGE);

  if (p < 1 || p > pages) return;

  currentPage = p;
  renderTable();
}

function filterTable(q) {
  const s =
    document.getElementById('statusFilter').value.toLowerCase();

  q = (q || '').toLowerCase();

  filteredData = allData.filter(r => {

    const matchQ =
      !q ||
      (r.nome || '').toLowerCase().includes(q) ||
      (r.telefone || '').toLowerCase().includes(q) ||
      (r.servico || '').toLowerCase().includes(q) ||
      (r.codigo || '').toLowerCase().includes(q);

    const matchS =
      !s ||
      (r.estado || 'pendente').toLowerCase() === s;

    return matchQ && matchS;
  });

  currentPage = 1;
  renderTable();
}

function filterStatus(v) {
  document.getElementById('statusFilter').value =
    v || '';

  filterTable(
    document.getElementById('searchInput').value || ''
  );
}

function irParaMarcacoesEstado(estado) {
  showTab(
    'marcacoes',
    document.querySelectorAll('.sb-link')[1]
  );

  document.getElementById('searchInput').value = '';

  const cap =
    estado.charAt(0).toUpperCase() +
    estado.slice(1).toLowerCase();

  document.getElementById('statusFilter').value =
    cap;

  filterTable('');
}

function openDetail(idx) {
  const r = filteredData[idx];

  if (!r) return;

  currentDetailIdx = idx;

  document.getElementById('modalNome').textContent =
    r.nome || 'Sem nome';

  document.getElementById('modalMeta').textContent =
    'Marcação ' +
    (r.codigo || r.id || '—') +
    ' · Recebida em ' +
    fmtDataHora(r.criado_em);

  document.getElementById('clienteGrid').innerHTML = `
    <div class="detail-item">
      <div class="detail-lb">Nome completo</div>
      <div class="detail-val">
        ${esc(r.nome || '—')}
      </div>
    </div>

    <div class="detail-item">
      <div class="detail-lb">Telefone</div>
      <div class="detail-val">
        <a href="tel:${esc(r.telefone || '')}">
          ${esc(r.telefone || '—')}
        </a>
      </div>
    </div>

    <div class="detail-item">
      <div class="detail-lb">Email</div>
      <div class="detail-val">
        ${
          r.email
            ? `<a href="mailto:${esc(r.email)}">
                 ${esc(r.email)}
               </a>`
            : '—'
        }
      </div>
    </div>

    <div class="detail-item">
      <div class="detail-lb">Estado actual</div>
      <div class="detail-val">
        <span class="badge ${bc(r.estado)}">
          ${esc(r.estado || 'Pendente')}
        </span>
      </div>
    </div>`;

  document.getElementById('marcacaoGrid').innerHTML = `
    <div class="detail-item">
      <div class="detail-lb">Serviço</div>
      <div class="detail-val">
        ${esc(r.servico || '—')}
      </div>
    </div>

    <div class="detail-item">
      <div class="detail-lb">Data</div>
      <div class="detail-val">
        ${fmtData(r.data)}
      </div>
    </div>

    <div class="detail-item">
      <div class="detail-lb">Hora</div>
      <div class="detail-val">
        ${esc(r.hora || 'sem preferência')}
      </div>
    </div>

    <div class="detail-item full">
      <div class="detail-lb">Observações</div>
      <div class="detail-val">
        ${esc(r.observacoes || 'Sem observações')}
      </div>
    </div>`;

  const tel =
    (r.telefone || '').replace(/\D/g, '');

  const wa = encodeURIComponent(
    `Olá ${r.nome || ''}! A sua marcação (${r.codigo || r.id || ''}) no Centro Médico X'Aquizolo foi confirmada.\n\n🩺 Serviço: ${r.servico || '—'}\n📅 Data: ${fmtData(r.data)}\n🕐 Hora: ${r.hora || 'a combinar'}\n\nObrigado pela preferência!`
  );

  const est =
    (r.estado || 'pendente').toLowerCase();

  let btnTransicao = '';

  if (est === 'pendente') {
    btnTransicao =
      `<button class="btn-confirm"
               onclick="updateStatus(${idx},'Confirmada')">
         ✓ Confirmar
       </button>`;

  } else if (est === 'confirmada') {
    btnTransicao =
      `<button class="btn-confirm"
               onclick="updateStatus(${idx},'Atendido')">
         🩺 Marcar como Atendido
       </button>`;
  }

  const btnCancelar =
    (est === 'atendido' || est === 'cancelada')
      ? ''
      : `<button class="btn-cancel-res"
                 onclick="updateStatus(${idx},'Cancelada')">
           ✗ Cancelar
         </button>`;

  document.getElementById('modalActions').innerHTML = `
    ${btnTransicao}

    <button class="btn-email"
            onclick="gerarPDFMarcacao(${idx})">
      <svg viewBox="0 0 24 24">
        <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
      </svg>
      PDF
    </button>

    <button class="btn-email"
            onclick="imprimirMarcacao(${idx})"
            style="background:#555">
      <svg viewBox="0 0 24 24">
        <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
      </svg>
      Imprimir
    </button>

    <a class="btn-wa"
       href="https://wa.me/${tel}?text=${wa}"
       target="_blank"
       rel="noopener noreferrer">

      <svg viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </a>

    ${btnCancelar}

    <button class="btn-delete"
            onclick="pedirApagar('${r.id}',${idx})">
      🗑 Apagar
    </button>`;

  document.getElementById('modalOverlay')
    .classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay')
    .classList.remove('open');
}

async function updateStatus(idx, status) {
  const r = filteredData[idx];

  if (!r) return;

  try {
    const { error } = await sb
      .from('marcacoes')
      .update({ estado: status })
      .eq('id', r.id);

    if (error) throw error;

    r.estado = status;

    const orig =
      allData.find(a => a.id === r.id);

    if (orig) orig.estado = status;

    renderStats();
    renderDashboard();
    renderTable();

    closeModal();

    showToast(
      'Marcação ' +
      (r.codigo || r.id) +
      ' — ' +
      status,
      status === 'Cancelada'
        ? 'err'
        : 'ok'
    );

  } catch (e) {
    showToast(
      'Erro ao actualizar.',
      'err'
    );
  }
}

function pedirApagar(id, idx) {
  pendingDelId = id;

  const r =
    filteredData[idx] ||
    allData.find(a => a.id === id);

  document.getElementById('delMsg').textContent =
    `Vai apagar a marcação ${
      r ? (r.codigo || id) : id
    }${
      r ? ' de ' + r.nome : ''
    }. Esta acção é permanente.`;

  closeModal();

  document.getElementById('modalDel')
    .classList.add('open');
}

function fecharDel() {
  document.getElementById('modalDel')
    .classList.remove('open');

  pendingDelId = null;
}

async function confirmarApagar() {
  if (!pendingDelId) return;

  const id = pendingDelId;

  fecharDel();

  try {
    const { error } = await sb
      .from('marcacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    allData =
      allData.filter(r => r.id !== id);

    filteredData =
      filteredData.filter(r => r.id !== id);

    renderStats();
    renderDashboard();
    renderTable();

    showToast(
      'Marcação apagada com sucesso.',
      'ok'
    );

  } catch (e) {
    showToast(
      'Erro de ligação. Não foi apagada.',
      'err'
    );
  }
}

function abrirNovaMarcacao() {
  const today =
    new Date().toISOString().split('T')[0];

  [
    'nf_nome',
    'nf_tel',
    'nf_email',
    'nf_obs'
  ].forEach(id =>
    document.getElementById(id).value = ''
  );

  document.getElementById('nf_data').min =
    today;

  document.getElementById('nf_data').value = '';
  document.getElementById('nf_hora').value = '';
  document.getElementById('nf_servico').selectedIndex = 0;
  document.getElementById('nf_estado').selectedIndex = 0;

  document.getElementById('nfErr')
    .style.display = 'none';

  document.getElementById('nfBtn').disabled = false;
  document.getElementById('nfBtn').textContent =
    '💾 Guardar Marcação';

  document.getElementById('modalNova')
    .classList.add('open');
}

function fecharNova() {
  document.getElementById('modalNova')
    .classList.remove('open');
}

async function guardarNova() {
  const nome =
    document.getElementById('nf_nome').value.trim();

  const tel =
    document.getElementById('nf_tel').value.trim();

  const email =
    document.getElementById('nf_email').value.trim();

  const servico =
    document.getElementById('nf_servico').value;

  const data =
    document.getElementById('nf_data').value || null;

  const hora =
    document.getElementById('nf_hora').value || null;

  const obs =
    document.getElementById('nf_obs').value.trim() || null;

  const estado =
    document.getElementById('nf_estado').value;

  const errEl =
    document.getElementById('nfErr');

  errEl.style.display = 'none';

  if (nome.length < 2) {
    errEl.textContent =
      'Nome obrigatório.';
    errEl.style.display = 'block';
    return;
  }

  if (!tel) {
    errEl.textContent =
      'Telefone obrigatório.';
    errEl.style.display = 'block';
    return;
  }

  const btn =
    document.getElementById('nfBtn');

  btn.disabled = true;
  btn.textContent = 'A guardar...';

  const dados = {
    nome,
    telefone: tel,
    email: email || null,
    servico,
    data,
    hora,
    observacoes: obs,
    estado
  };

  try {
    const {
      data: row,
      error
    } = await sb
      .from('marcacoes')
      .insert(dados)
      .select()
      .single();

    if (error) throw error;

    allData.unshift(row);
    filteredData = [...allData];

    renderStats();
    renderDashboard();
    renderTable();

    fecharNova();

    showToast(
      'Marcação criada! Código: ' +
      (row.codigo || '—'),
      'ok'
    );

  } catch (e) {

    errEl.textContent =
      'Erro ao guardar. Verifique a ligação.';

    errEl.style.display = 'block';

    btn.disabled = false;
    btn.textContent = '💾 Guardar Marcação';
  }
}

function gerarPDFMarcacao(idx) {
  const r = filteredData[idx];

  if (!r) return;

  if (!window.jspdf) {
    showToast(
      'A carregar biblioteca de PDF, tente novamente.',
      'err'
    );
    return;
  }

  const { jsPDF } = window.jspdf;

  const doc =
    new jsPDF({
      unit: 'mm',
      format: 'a4'
    });

  doc.setFillColor(27, 58, 107);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(18);

  doc.text(
    "Centro Médico X'Aquizolo",
    14,
    15
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(10);

  doc.text(
    "Bairro Catome de Cima, N'dalatando, Angola",
    14,
    22
  );

  doc.text(
    '922 556 347',
    14,
    27
  );

  doc.setTextColor(20, 20, 20);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(14);

  doc.text(
    'Comprovativo de Marcação',
    14,
    44
  );

  doc.setDrawColor(200, 200, 200);

  doc.line(
    14,
    48,
    196,
    48
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.text(
    'Código: ' +
    (r.codigo || r.id || '—'),
    14,
    57
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.text(
    'Estado: ' +
    (r.estado || 'Pendente'),
    130,
    57
  );

  const linhas = [
    ['Nome do paciente', r.nome || '—'],
    ['Telefone', r.telefone || '—'],
    ['Email', r.email || '—'],
    ['Serviço', r.servico || '—'],
    ['Data', fmtData(r.data)],
    ['Hora', r.hora || 'sem preferência'],
    ['Observações', r.observacoes || 'Sem observações']
  ];

  let y = 68;

  doc.setFontSize(10);

  linhas.forEach(([label, val]) => {

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      label + ':',
      14,
      y
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    const wrapped =
      doc.splitTextToSize(
        String(val),
        110
      );

    doc.text(
      wrapped,
      70,
      y
    );

    y += 7 * wrapped.length;
  });

  y += 10;

  doc.setFontSize(8);

  doc.setTextColor(
    140,
    140,
    140
  );

  doc.text(
    'Documento gerado pelo Centro Médico X\'Aquizolo. Contacto: 922 556 347.',
    14,
    285
  );

  doc.save(
    'Marcacao-' +
    (r.codigo || r.id || 'comprovativo') +
    '.pdf'
  );
}

function imprimirMarcacao(idx) {
  const r = filteredData[idx];

  if (!r) return;

  const area =
    document.getElementById('printArea');

  if (!area) return;

  area.innerHTML = `
    <div class="print-card">
      <h1>Centro Médico X'Aquizolo</h1>

      <p class="print-sub">
        N'dalatando · Cuanza Norte, Angola · 922 556 347
      </p>

      <h2>Ficha de Marcação</h2>

      <p class="print-codigo">
        Código:
        <strong>
          ${esc(r.codigo || r.id || '—')}
        </strong>
        &nbsp;·&nbsp;
        Estado:
        <strong>
          ${esc(r.estado || 'Pendente')}
        </strong>
      </p>

      <table>
        <tr>
          <td>Nome</td>
          <td>${esc(r.nome || '—')}</td>
        </tr>

        <tr>
          <td>Telefone</td>
          <td>${esc(r.telefone || '—')}</td>
        </tr>

        <tr>
          <td>Email</td>
          <td>${esc(r.email || '—')}</td>
        </tr>

        <tr>
          <td>Serviço</td>
          <td>${esc(r.servico || '—')}</td>
        </tr>

        <tr>
          <td>Data</td>
          <td>${fmtData(r.data)}</td>
        </tr>

        <tr>
          <td>Hora</td>
          <td>${esc(r.hora || 'sem preferência')}</td>
        </tr>

        <tr>
          <td>Observações</td>
          <td>${esc(r.observacoes || 'Sem observações')}</td>
        </tr>
      </table>

      <p class="print-nota">
        Documento gerado pelo painel administrativo em
        ${new Date().toLocaleString('pt-PT')}.
      </p>
    </div>`;

  window.print();
}

function imprimirHistorico() {
  const area =
    document.getElementById('printArea');

  if (!area) return;

  const linhas =
    filteredData.map(r =>
      `<tr>
        <td>${esc(r.codigo || r.id || '—')}</td>
        <td>${esc(r.nome || '—')}</td>
        <td>${esc(r.servico || '—')}</td>
        <td>${fmtData(r.data)}</td>
        <td>${esc(r.hora || '—')}</td>
        <td>${esc(r.estado || 'Pendente')}</td>
      </tr>`
    ).join('');

  area.innerHTML = `
    <div class="print-card">
      <h1>Centro Médico X'Aquizolo</h1>

      <p class="print-sub">
        Histórico de Marcações —
        gerado em ${new Date().toLocaleString('pt-PT')}
        · ${filteredData.length} registo(s)
      </p>

      <table class="print-hist">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Serviço</th>
            <th>Data</th>
            <th>Hora</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          ${
            linhas ||
            '<tr><td colspan="6">Sem marcações para os filtros actuais.</td></tr>'
          }
        </tbody>
      </table>
    </div>`;

  window.print();
}

function exportCSV() {
  if (!filteredData.length) {
    showToast(
      'Sem dados para exportar.'
    );
    return;
  }

  const h = [
    'Código',
    'Nome',
    'Telefone',
    'Email',
    'Serviço',
    'Data',
    'Hora',
    'Estado',
    'Recebida',
    'Observações'
  ];

  const rows =
    filteredData.map(r =>
      [
        r.codigo || r.id,
        r.nome,
        r.telefone,
        r.email,
        r.servico,
        r.data,
        r.hora,
        r.estado || 'Pendente',
        fmtDataHora(r.criado_em),
        r.observacoes
      ].map(v =>
        `"${(v || '').toString().replace(/"/g, '""')}"`
      )
    );

  const csv =
    [
      h.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

  const a =
    document.createElement('a');

  a.href =
    'data:text/csv;charset=utf-8,\uFEFF' +
    encodeURIComponent(csv);

  a.download =
    `marcacoes_xaquizolo_${
      new Date().toISOString().split('T')[0]
    }.csv`;

  a.click();

  showToast(
    'CSV exportado!',
    'ok'
  );
}

function redimensionarImagem(
  file,
  larguraAlvo = 1200,
  alturaAlvo = 750,
  qualidade = 0.85
) {
  return new Promise((resolve, reject) => {

    const img = new Image();

    const url =
      URL.createObjectURL(file);

    img.onload = () => {

      URL.revokeObjectURL(url);

      const racioAlvo =
        larguraAlvo / alturaAlvo;

      const racioImg =
        img.width / img.height;

      let sx, sy, sw, sh;

      if (racioImg > racioAlvo) {
        sh = img.height;
        sw = sh * racioAlvo;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = sw / racioAlvo;
        sx = 0;
        sy = (img.height - sh) / 2;
      }

      const canvas =
        document.createElement('canvas');

      canvas.width = larguraAlvo;
      canvas.height = alturaAlvo;

      const ctx =
        canvas.getContext('2d');

      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        larguraAlvo,
        alturaAlvo
      );

      canvas.toBlob(
        blob => {

          if (!blob) {
            reject(
              new Error(
                'Falha ao processar imagem.'
              )
            );
            return;
          }

          resolve(
            new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '') +
              '.jpg',
              {
                type: 'image/jpeg'
              }
            )
          );
        },
        'image/jpeg',
        qualidade
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error(
          'Não foi possível ler a imagem.'
        )
      );
    };

    img.src = url;
  });
}

async function previewAvisoImg() {
  const inp =
    document.getElementById('av_imagem');

  const prev =
    document.getElementById('av_imagem_preview');

  const f = inp.files[0];

  if (!f) {
    avisoImgFile = null;
    return;
  }

  if (f.size > 8 * 1024 * 1024) {
    showToast(
      'Imagem demasiado grande (máx. 8MB).',
      'err'
    );

    inp.value = '';
    return;
  }

  try {

    prev.style.opacity = '.4';

    const recortada =
      await redimensionarImagem(f);

    avisoImgFile = recortada;

    const reader =
      new FileReader();

    reader.onload = e => {
      prev.src = e.target.result;
      prev.style.display = 'block';
      prev.style.opacity = '1';
    };

    reader.readAsDataURL(recortada);

  } catch (e) {

    showToast(
      'Não foi possível processar a imagem.',
      'err'
    );

    inp.value = '';
    avisoImgFile = null;
    prev.style.opacity = '1';
  }
}

async function carregarAvisosAdmin() {
  const area =
    document.getElementById('avisosArea');

  try {

    const {
      data,
      error
    } = await sb
      .from('avisos')
      .select('*')
      .order('criado_em', {
        ascending: false
      });

    if (error) throw error;

    avisosData = data || [];

    if (!avisosData.length) {
      area.innerHTML =
        '<div class="no-data"><p>Ainda não criaste nenhum aviso.</p></div>';
      return;
    }

    area.innerHTML = `
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Título</th>
              <th>Período</th>
              <th>Destaque</th>
              <th>Estado</th>
              <th colspan="4">Acções</th>
            </tr>
          </thead>

          <tbody>
            ${avisosData.map(a =>
              `<tr>

                <td>
                  ${
                    a.imagem_url
                      ? `<img src="${esc(a.imagem_url)}"
                              style="width:44px;height:44px;object-fit:cover;border-radius:8px">`
                      : '—'
                  }
                </td>

                <td>
                  <strong style="font-weight:500">
                    ${esc(a.titulo || '—')}
                  </strong>

                  <div style="font-size:.72rem;color:var(--czc);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${esc(a.descricao || '')}
                  </div>
                </td>

                <td style="font-size:.75rem">
                  ${a.data_inicio ? fmtData(a.data_inicio) : '—'}
                  —
                  ${a.data_fim ? fmtData(a.data_fim) : '—'}
                </td>

                <td>
                  ${
                    a.destaque
                      ? '<span class="badge confirmada">Sim</span>'
                      : '<span class="badge pendente" style="opacity:.5">Não</span>'
                  }
                </td>

                <td>
                  ${
                    a.ativo
                      ? '<span class="badge confirmada">Activo</span>'
                      : '<span class="badge cancelada">Inactivo</span>'
                  }
                </td>

                <td>
                  <button class="action-btn"
                          onclick="editarAviso('${a.id}')">
                    Editar
                  </button>
                </td>

                <td>
                  <button class="share-btn fb"
                          onclick="partilharFacebook('${a.id}')"
                          title="Partilhar no Facebook">
                    <svg viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    FB
                  </button>
                </td>

                <td>
                  <button class="share-btn ig"
                          onclick="partilharInstagram('${a.id}')"
                          title="Copiar texto para o Instagram">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.28-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    IG
                  </button>
                </td>

                <td>
                  <button class="action-btn del"
                          onclick="apagarAviso('${a.id}')">
                    Apagar
                  </button>
                </td>

              </tr>`
            ).join('')}
          </tbody>
        </table>
      </div>`;

  } catch (e) {
    area.innerHTML =
      '<div class="no-data"><p>⚠️ Erro ao carregar avisos.</p></div>';
  }
}

async function apagarAviso(id) {
  if (!confirm(
    'Apagar este aviso? Esta acção não pode ser desfeita.'
  )) return;

  try {

    const { error } = await sb
      .from('avisos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast(
      'Aviso apagado.',
      'ok'
    );

    carregarAvisosAdmin();

  } catch (e) {
    showToast(
      'Erro ao apagar.',
      'err'
    );
  }
}

function partilharFacebook(id) {
  const a =
    avisosData.find(x => x.id === id);

  if (!a) return;

  const texto =
    a.titulo +
    (a.descricao
      ? ' — ' + a.descricao
      : '');

  const url =
    'https://www.facebook.com/sharer/sharer.php?u=' +
    encodeURIComponent(SITE_URL) +
    '&quote=' +
    encodeURIComponent(texto);

  window.open(
    url,
    '_blank',
    'noopener noreferrer,width=600,height=500'
  );
}

async function partilharInstagram(id) {
  const a =
    avisosData.find(x => x.id === id);

  if (!a) return;

  const texto =
    (a.titulo || '') +
    '\n\n' +
    (a.descricao || '') +
    '\n\n' +
    SITE_URL;

  try {

    await navigator.clipboard.writeText(texto);

    showToast(
      'Texto copiado! Cola no Instagram (o Instagram não permite publicar directamente pelo browser).',
      'ok'
    );

  } catch (e) {

    showToast(
      'Não foi possível copiar automaticamente. Copia o texto manualmente.',
      'err'
    );
  }

  window.open(
    'https://www.instagram.com/',
    '_blank',
    'noopener noreferrer'
  );
}

function abrirNovoAviso() {
  editingAvisoId = null;
  avisoImgFile = null;

  document.getElementById('avisoModalTitulo').textContent =
    'Novo Aviso';

  document.getElementById('av_titulo').value = '';
  document.getElementById('av_descricao').value = '';
  document.getElementById('av_imagem').value = '';

  document.getElementById('av_imagem_preview')
    .style.display = 'none';

  document.getElementById('av_data_inicio').value = '';
  document.getElementById('av_data_fim').value = '';
  document.getElementById('av_destaque').checked = false;
  document.getElementById('av_ativo').checked = true;

  document.getElementById('avErr')
    .style.display = 'none';

  document.getElementById('avBtn').disabled = false;
  document.getElementById('avBtn').textContent =
    '💾 Guardar Aviso';

  document.getElementById('modalAviso')
    .classList.add('open');
}

function editarAviso(id) {
  const a =
    avisosData.find(x => x.id === id);

  if (!a) return;

  editingAvisoId = id;
  avisoImgFile = null;

  document.getElementById('avisoModalTitulo').textContent =
    'Editar Aviso';

  document.getElementById('av_titulo').value =
    a.titulo || '';

  document.getElementById('av_descricao').value =
    a.descricao || '';

  document.getElementById('av_imagem').value = '';

  const prev =
    document.getElementById('av_imagem_preview');

  if (a.imagem_url) {
    prev.src = a.imagem_url;
    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }

  document.getElementById('av_data_inicio').value =
    a.data_inicio || '';

  document.getElementById('av_data_fim').value =
    a.data_fim || '';

  document.getElementById('av_destaque').checked =
    !!a.destaque;

  document.getElementById('av_ativo').checked =
    a.ativo !== false;

  document.getElementById('avErr')
    .style.display = 'none';

  document.getElementById('avBtn').disabled = false;

  document.getElementById('avBtn').textContent =
    '💾 Guardar Aviso';

  document.getElementById('modalAviso')
    .classList.add('open');
}

function fecharAviso() {
  document.getElementById('modalAviso')
    .classList.remove('open');
}

async function guardarAviso() {
  const titulo =
    document.getElementById('av_titulo').value.trim();

  const errEl =
    document.getElementById('avErr');

  errEl.style.display = 'none';

  if (titulo.length < 3) {
    errEl.textContent =
      'O título é obrigatório (mínimo 3 caracteres).';

    errEl.style.display = 'block';

    return;
  }

  const btn =
    document.getElementById('avBtn');

  btn.disabled = true;
  btn.textContent = 'A guardar...';

  try {

    let imagem_url =
      editingAvisoId
        ? (
            avisosData.find(
              a => a.id === editingAvisoId
            ) || {}
          ).imagem_url
        : null;

    if (avisoImgFile) {

      btn.textContent =
        'A enviar imagem...';

      const path =
        Date.now() +
        '-' +
        avisoImgFile.name.replace(
          /[^a-zA-Z0-9.\-]/g,
          '_'
        );

      const {
        error: upErr
      } = await sb
        .storage
        .from('avisos-imagens')
        .upload(
          path,
          avisoImgFile
        );

      if (upErr) throw upErr;

      const {
        data: pub
      } =
        sb
          .storage
          .from('avisos-imagens')
          .getPublicUrl(path);

      imagem_url =
        pub.publicUrl;
    }

    const dados = {
      titulo,

      descricao:
        document
          .getElementById('av_descricao')
          .value
          .trim() || null,

      imagem_url,

      data_inicio:
        document
          .getElementById('av_data_inicio')
          .value || null,

      data_fim:
        document
          .getElementById('av_data_fim')
          .value || null,

      destaque:
        document
          .getElementById('av_destaque')
          .checked,

      ativo:
        document
          .getElementById('av_ativo')
          .checked
    };

    btn.textContent =
      'A guardar...';

    if (editingAvisoId) {

      const { error } =
        await sb
          .from('avisos')
          .update(dados)
          .eq('id', editingAvisoId);

      if (error) throw error;

    } else {

      const { error } =
        await sb
          .from('avisos')
          .insert(dados);

      if (error) throw error;
    }

    fecharAviso();

    showToast(
      'Aviso guardado com sucesso!',
      'ok'
    );

    carregarAvisosAdmin();

  } catch (e) {

    errEl.textContent =
      'Erro ao guardar: ' +
      e.message;

    errEl.style.display = 'block';

  } finally {

    btn.disabled = false;
    btn.textContent =
      '💾 Guardar Aviso';
  }
}

let configIA = null;
let temasIA = [];
let conhecimentoData = [];
let publicacoesData = [];
let editingConhId = null;
let editingPubId = null;

function showIaSub(id, el) {
  document.querySelectorAll('.ia-sub')
    .forEach(s => s.classList.remove('active'));

  document.querySelectorAll('#iaSubNav .pill-btn')
    .forEach(b => b.classList.remove('active'));

  document.getElementById('ia-' + id)
    .classList.add('active');

  if (el) el.classList.add('active');
}

async function initAutomacaoIA() {
  await carregarConfigIA();
  await carregarTemas();
  await carregarConhecimento();
  await carregarPublicacoes();
}

async function carregarConfigIA() {
  try {

    const {
      data,
      error
    } = await sb
      .from('automacao_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    configIA = data;

    document.getElementById('ia_ativo').checked =
      !!data.ativo;

    document.getElementById('ia_modo').value =
      data.modo || 'aprovacao';

    document.getElementById('ia_frequencia').value =
      data.frequencia || '1_semana';

    const idn =
      data.identidade || {};

    document.getElementById('ia_cor1').value =
      idn.cor1 || '';

    document.getElementById('ia_cor2').value =
      idn.cor2 || '';

    document.getElementById('ia_estilo').value =
      idn.estilo || '';

    renderFluxo(
      data.fluxo || []
    );

  } catch (e) {

    showToast(
      'Não foi possível carregar as definições de IA. Confirma se correste o SQL do supabase_setup.txt.',
      'err'
    );
  }
}

async function guardarConfigIA() {
  const dados = {

    ativo:
      document
        .getElementById('ia_ativo')
        .checked,

    modo:
      document
        .getElementById('ia_modo')
        .value,

    frequencia:
      document
        .getElementById('ia_frequencia')
        .value,

    identidade: {

      cor1:
        document
          .getElementById('ia_cor1')
          .value
          .trim(),

      cor2:
        document
          .getElementById('ia_cor2')
          .value
          .trim(),

      estilo:
        document
          .getElementById('ia_estilo')
          .value
          .trim()
    },

    atualizado_em:
      new Date().toISOString()
  };

  try {

    const { error } =
      await sb
        .from('automacao_config')
        .update(dados)
        .eq('id', 1);

    if (error) throw error;

    showToast(
      'Definições guardadas!',
      'ok'
    );

  } catch (e) {

    showToast(
      'Erro ao guardar definições.',
      'err'
    );
  }
}

function renderFluxo(lista) {
  const el =
    document.getElementById('fluxoLista');

  el.innerHTML =
    lista.map((nome, i) =>
      `<div class="fluxo-item">

        <div class="fluxo-num">
          ${i + 1}
        </div>

        <span class="fluxo-nome">
          ${esc(nome)}
        </span>

        <div class="fluxo-btns">

          <button onclick="moverFluxo(${i},-1)"
                  ${i === 0 ? 'disabled' : ''}>
            ↑
          </button>

          <button onclick="moverFluxo(${i},1)"
                  ${i === lista.length - 1 ? 'disabled' : ''}>
            ↓
          </button>

          <button onclick="removerFluxo(${i})"
                  style="color:var(--err)">
            ✕
          </button>

        </div>
      </div>`
    ).join('') ||
    '<p style="font-size:.8rem;color:var(--czc)">Sem categorias definidas.</p>';
}

function adicionarFluxo() {
  const inp =
    document.getElementById('fluxo_novo');

  const nome =
    inp.value.trim();

  if (!nome) return;

  const lista =
    configIA.fluxo || [];

  lista.push(nome);

  configIA.fluxo = lista;

  renderFluxo(lista);

  inp.value = '';
}

function moverFluxo(i, dir) {
  const lista =
    configIA.fluxo;

  const j =
    i + dir;

  if (
    j < 0 ||
    j >= lista.length
  ) return;

  [lista[i], lista[j]] =
    [lista[j], lista[i]];

  renderFluxo(lista);
}

function removerFluxo(i) {
  configIA.fluxo.splice(i, 1);
  renderFluxo(configIA.fluxo);
}

async function guardarFluxo() {
  try {

    const { error } =
      await sb
        .from('automacao_config')
        .update({
          fluxo: configIA.fluxo,
          atualizado_em:
            new Date().toISOString()
        })
        .eq('id', 1);

    if (error) throw error;

    showToast(
      'Fluxo guardado!',
      'ok'
    );

  } catch (e) {

    showToast(
      'Erro ao guardar fluxo.',
      'err'
    );
  }
}

async function carregarTemas() {
  try {

    const {
      data,
      error
    } = await sb
      .from('temas_ia')
      .select('*')
      .order('criado_em');

    if (error) throw error;

    temasIA = data || [];

    renderTemas();

  } catch (e) {}
}

function renderTemas() {
  const permitidos =
    temasIA.filter(
      t => t.tipo === 'permitido'
    );

  const bloqueados =
    temasIA.filter(
      t => t.tipo === 'bloqueado'
    );

  document.getElementById('temasPermitidos').innerHTML =
    permitidos.map(t =>
      `<span class="tema-tag">
        ${esc(t.nome)}
        <button onclick="removerTema('${t.id}')">
          ✕
        </button>
      </span>`
    ).join('') ||
    '<p style="font-size:.8rem;color:var(--czc)">Nenhum tema definido — a IA pode escolher livremente dentro do contexto de saúde.</p>';

  document.getElementById('temasBloqueados').innerHTML =
    bloqueados.map(t =>
      `<span class="tema-tag">
        ${esc(t.nome)}
        <button onclick="removerTema('${t.id}')">
          ✕
        </button>
      </span>`
    ).join('') ||
    '<p style="font-size:.8rem;color:var(--czc)">Nenhum tema bloqueado.</p>';
}

async function adicionarTema(tipo) {
  const inp =
    document.getElementById(
      tipo === 'permitido'
        ? 'tema_novo_p'
        : 'tema_novo_b'
    );

  const nome =
    inp.value.trim();

  if (!nome) return;

  try {

    const {
      data,
      error
    } = await sb
      .from('temas_ia')
      .insert({
        nome,
        tipo
      })
      .select()
      .single();

    if (error) throw error;

    temasIA.push(data);

    renderTemas();

    inp.value = '';

  } catch (e) {

    showToast(
      'Erro ao adicionar tema.',
      'err'
    );
  }
}

async function removerTema(id) {
  try {

    const { error } =
      await sb
        .from('temas_ia')
        .delete()
        .eq('id', id);

    if (error) throw error;

    temasIA =
      temasIA.filter(
        t => t.id !== id
      );

    renderTemas();

  } catch (e) {

    showToast(
      'Erro ao remover tema.',
      'err'
    );
  }
}

async function carregarConhecimento() {
  const area =
    document.getElementById(
      'conhecimentoArea'
    );

  try {

    const {
      data,
      error
    } = await sb
      .from('base_conhecimento')
      .select('*')
      .order('categoria');

    if (error) throw error;

    conhecimentoData =
      data || [];

    if (!conhecimentoData.length) {

      area.innerHTML =
        '<div class="no-data"><p>Ainda não há registos na base de conhecimento.</p></div>';

      return;
    }

    area.innerHTML = `
      <div style="overflow-x:auto">
        <table>

          <thead>
            <tr>
              <th>Categoria</th>
              <th>Título</th>
              <th>Estado</th>
              <th colspan="2">Acções</th>
            </tr>
          </thead>

          <tbody>
            ${conhecimentoData.map(c =>
              `<tr>

                <td style="font-size:.78rem">
                  ${esc(c.categoria)}
                </td>

                <td>
                  <strong style="font-weight:500">
                    ${esc(c.titulo)}
                  </strong>

                  <div style="font-size:.72rem;color:var(--czc);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${esc(c.conteudo)}
                  </div>
                </td>

                <td>
                  ${
                    c.ativo
                      ? '<span class="badge confirmada">Activo</span>'
                      : '<span class="badge cancelada">Inactivo</span>'
                  }
                </td>

                <td>
                  <button class="action-btn"
                          onclick="editarConhecimento('${c.id}')">
                    Editar
                  </button>
                </td>

                <td>
                  <button class="action-btn del"
                          onclick="apagarConhecimento('${c.id}')">
                    Apagar
                  </button>
                </td>

              </tr>`
            ).join('')}
          </tbody>

        </table>
      </div>`;

  } catch (e) {

    area.innerHTML =
      '<div class="no-data"><p>⚠️ Erro ao carregar. Confirma se a tabela base_conhecimento existe (supabase_setup.txt).</p></div>';
  }
}

function abrirNovoConhecimento() {
  editingConhId = null;

  document.getElementById(
    'conhModalTitulo'
  ).textContent =
    'Novo Registo';

  document.getElementById(
    'conh_categoria'
  ).selectedIndex = 0;

  document.getElementById(
    'conh_titulo'
  ).value = '';

  document.getElementById(
    'conh_conteudo'
  ).value = '';

  document.getElementById(
    'conh_ativo'
  ).checked = true;

  document.getElementById(
    'conhErr'
  ).style.display = 'none';

  document.getElementById(
    'modalConhecimento'
  ).classList.add('open');
}

function editarConhecimento(id) {
  const c =
    conhecimentoData.find(
      x => x.id === id
    );

  if (!c) return;

  editingConhId = id;

  document.getElementById(
    'conhModalTitulo'
  ).textContent =
    'Editar Registo';

  document.getElementById(
    'conh_categoria'
  ).value =
    c.categoria;

  document.getElementById(
    'conh_titulo'
  ).value =
    c.titulo;

  document.getElementById(
    'conh_conteudo'
  ).value =
    c.conteudo;

  document.getElementById(
    'conh_ativo'
  ).checked =
    c.ativo !== false;

  document.getElementById(
    'conhErr'
  ).style.display =
    'none';

  document.getElementById(
    'modalConhecimento'
  ).classList.add('open');
}

function fecharConhecimento() {
  document.getElementById(
    'modalConhecimento'
  ).classList.remove('open');
}

async function guardarConhecimento() {
  const titulo =
    document.getElementById(
      'conh_titulo'
    ).value.trim();

  const conteudo =
    document.getElementById(
      'conh_conteudo'
    ).value.trim();

  const errEl =
    document.getElementById(
      'conhErr'
    );

  errEl.style.display =
    'none';

  if (
    titulo.length < 3 ||
    conteudo.length < 5
  ) {
    errEl.textContent =
      'Preenche o título e o conteúdo.';

    errEl.style.display =
      'block';

    return;
  }

  const dados = {
    categoria:
      document.getElementById(
        'conh_categoria'
      ).value,

    titulo,
    conteudo,

    ativo:
      document.getElementById(
        'conh_ativo'
      ).checked
  };

  try {

    if (editingConhId) {

      const { error } =
        await sb
          .from('base_conhecimento')
          .update(dados)
          .eq('id', editingConhId);

      if (error) throw error;

    } else {

      const { error } =
        await sb
          .from('base_conhecimento')
          .insert(dados);

      if (error) throw error;
    }

    fecharConhecimento();

    showToast(
      'Registo guardado!',
      'ok'
    );

    carregarConhecimento();

  } catch (e) {

    errEl.textContent =
      'Erro: ' + e.message;

    errEl.style.display =
      'block';
  }
}

async function apagarConhecimento(id) {
  if (!confirm(
    'Apagar este registo da base de conhecimento?'
  )) return;

  try {

    const { error } =
      await sb
        .from('base_conhecimento')
        .delete()
        .eq('id', id);

    if (error) throw error;

    showToast(
      'Registo apagado.',
      'ok'
    );

    carregarConhecimento();

  } catch (e) {

    showToast(
      'Erro ao apagar.',
      'err'
    );
  }
}

async function carregarPublicacoes() {
  const area =
    document.getElementById(
      'publicacoesArea'
    );

  try {

    const {
      data,
      error
    } = await sb
      .from('publicacoes_ia')
      .select('*')
      .order(
        'criado_em',
        {
          ascending: false
        }
      );

    if (error) throw error;

    publicacoesData =
      data || [];

    if (!publicacoesData.length) {

      area.innerHTML =
        '<div class="no-data"><p>Ainda não há conteúdo gerado. Usa "Gerar Novo Conteúdo".</p></div>';

      return;
    }

    area.innerHTML = `
      <div style="overflow-x:auto">
        <table>

          <thead>
            <tr>
              <th>Data</th>
              <th>Tema</th>
              <th>Categoria</th>
              <th>Plataforma</th>
              <th>Estado</th>
              <th colspan="2">Acções</th>
            </tr>
          </thead>

          <tbody>
            ${publicacoesData.map(p =>
              `<tr>

                <td style="font-size:.78rem">
                  ${
                    p.data_agendada
                      ? fmtDataHora(p.data_agendada)
                      : fmtDataHora(p.criado_em)
                  }
                </td>

                <td style="font-size:.78rem">
                  ${esc(p.tema || '—')}
                </td>

                <td style="font-size:.78rem">
                  ${esc(p.categoria || '—')}
                </td>

                <td style="font-size:.78rem">
                  ${esc(p.plataforma || 'ambas')}
                </td>

                <td>
                  <span class="est-badge ${estClasse(p.estado)}">
                    ${esc(p.estado || 'Rascunho')}
                  </span>
                </td>

                <td>
                  <button class="action-btn"
                          onclick="abrirPublicacao('${p.id}')">
                    Ver / Editar
                  </button>
                </td>

                <td>
                  <button class="action-btn del"
                          onclick="apagarPublicacao('${p.id}')">
                    Apagar
                  </button>
                </td>

              </tr>`
            ).join('')}
          </tbody>

        </table>
      </div>`;

  } catch (e) {

    area.innerHTML =
      '<div class="no-data"><p>⚠️ Erro ao carregar. Confirma se a tabela publicacoes_ia existe.</p></div>';
  }
}

function estClasse(e) {
  return {
    'Rascunho': 'rascunho',
    'Gerado': 'gerado',
    'Aguardando aprovação': 'aguardando',
    'Agendado': 'agendado',
    'Publicado': 'publicado',
    'Erro': 'erro'
  }[e] || 'rascunho';
}

async function gerarConteudoIA() {
  const btn = document.getElementById('gerarBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'A gerar...';
  }

  try {
    const temaEl = document.getElementById('pub_tema');
    const categoriaEl = document.getElementById('pub_categoria');
    const plataformaEl = document.getElementById('pub_plataforma');

    const tema = temaEl?.value?.trim() || '';
    const categoria = categoriaEl?.value?.trim() || '';
    const plataforma = plataformaEl?.value || 'ambas';

    const { data, error } = await sb.functions.invoke('smart-api', {
      body: {
        prompt: tema || undefined,
        tema: tema || undefined,
        categoria: categoria || undefined,
        plataforma
      }
    });

    if (error) throw error;

    const result = data || {};
    let generated = result.content ?? result.text ?? result;

    if (typeof generated === 'string') {
      try { generated = JSON.parse(generated); } catch (_) {}
    }

    const titulo = String(generated.titulo || generated.title || result.titulo || '').trim();
    const texto = String(generated.texto || generated.conteudo || generated.content || result.texto || result.content || result.text || '').trim();
    const legenda = String(generated.legenda || generated.caption || result.legenda || '').trim();
    const hashtags = String(generated.hashtags || result.hashtags || '').trim();

    if (!titulo && !texto) {
      throw new Error('A IA respondeu, mas não devolveu título ou texto utilizável.');
    }

    const registro = {
      tema: tema || titulo,
      categoria: categoria || 'Educação',
      plataforma,
      titulo: titulo || tema || 'Publicação Centro Médico X’Aquizolo',
      texto: texto || legenda,
      legenda: legenda || texto,
      hashtags,
      estado: 'Gerado'
    };

    const { data: saved, error: saveError } = await sb
      .from('publicacoes_ia')
      .insert(registro)
      .select()
      .single();

    if (saveError) throw saveError;

    showToast('Conteúdo gerado e guardado com sucesso!', 'ok');
    await carregarPublicacoes();

    if (saved?.id && typeof abrirPublicacao === 'function') {
      abrirPublicacao(saved.id);
    }

    return saved;
  } catch (e) {
    console.error('Erro ao gerar conteúdo IA:', e);
    showToast('Erro ao gerar conteúdo: ' + (e.message || 'verifique a Edge Function smart-api'), 'err');
    return null;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Gerar Novo Conteúdo';
    }
  }
}

function abrirPublicacao(id) {
  const p =
    publicacoesData.find(
      x => x.id === id
    );

  if (!p) return;

  editingPubId = id;

  document.getElementById(
    'pubModalMeta'
  ).textContent =
    'Criado em ' +
    fmtDataHora(p.criado_em);

  document.getElementById(
    'pub_tema'
  ).value =
    p.tema || '';

  document.getElementById(
    'pub_categoria'
  ).value =
    p.categoria || '';

  document.getElementById(
    'pub_plataforma'
  ).value =
    p.plataforma || 'ambas';

  document.getElementById(
    'pub_data'
  ).value =
    p.data_agendada
      ? p.data_agendada.slice(0, 16)
      : '';

  document.getElementById(
    'pub_titulo'
  ).value =
    p.titulo || '';

  document.getElementById(
    'pub_texto'
  ).value =
    p.texto || '';

  document.getElementById(
    'pub_hashtags'
  ).value =
    p.hashtags || '';

  const img =
    document.getElementById(
      'pub_img_preview'
    );

  if (p.imagem_url) {
    img.src = p.imagem_url;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  const est =
    p.estado || 'Rascunho';

  let acoes =
    `<button class="btn-confirm"
             onclick="salvarEdicaoPublicacao()">
       💾 Guardar Edição
     </button>`;

  if (
    est === 'Rascunho' ||
    est === 'Gerado'
  ) {
    acoes +=
      `<button class="btn-email"
               onclick="gerarImagemPublicacao('${id}')">
         🎨 Gerar Imagem
       </button>`;
  }

  if (est !== 'Publicado') {
    acoes +=
      `<button class="btn-confirm"
               onclick="aprovarPublicacao('${id}')"
               style="background:var(--az)">
         ✓ Aprovar
       </button>`;
  }

  if (
    est === 'Agendado' ||
    est === 'Aguardando aprovação'
  ) {
    acoes +=
      `<button class="btn-confirm"
               onclick="publicarAgora('${id}')">
         🚀 Publicar Agora
       </button>`;
  }

  acoes +=
    `<button class="btn-delete"
             onclick="apagarPublicacao('${id}')">
       🗑 Apagar
     </button>`;

  document.getElementById(
    'pubModalActions'
  ).innerHTML =
    acoes;

  document.getElementById(
    'modalPublicacao'
  ).classList.add('open');
}

function fecharPublicacao() {
  document.getElementById(
    'modalPublicacao'
  ).classList.remove('open');

  editingPubId = null;
}

async function salvarEdicaoPublicacao() {
  if (!editingPubId) return;

  const dados = {

    tema:
      document.getElementById(
        'pub_tema'
      ).value.trim(),

    categoria:
      document.getElementById(
        'pub_categoria'
      ).value.trim(),

    plataforma:
      document.getElementById(
        'pub_plataforma'
      ).value,

    data_agendada:
      document.getElementById(
        'pub_data'
      ).value || null,

    titulo:
      document.getElementById(
        'pub_titulo'
      ).value.trim(),

    texto:
      document.getElementById(
        'pub_texto'
      ).value.trim(),

    hashtags:
      document.getElementById(
        'pub_hashtags'
      ).value.trim()
  };

  try {

    const { error } =
      await sb
        .from('publicacoes_ia')
        .update(dados)
        .eq('id', editingPubId);

    if (error) throw error;

    showToast(
      'Publicação actualizada!',
      'ok'
    );

    fecharPublicacao();
    carregarPublicacoes();

  } catch (e) {

    showToast(
      'Erro ao guardar.',
      'err'
    );
  }
}


/* ============================================================
   FUNÇÃO ACTUALIZADA PARA GERAR IMAGEM DA PUBLICAÇÃO
   ============================================================ */

async function gerarImagemPublicacao(id) {
  const targetId = id || editingPubId;
  const p = publicacoesData.find(x => x.id === targetId);

  if (!p) {
    showToast('Selecione ou abra uma publicação primeiro.', 'err');
    return;
  }

  const promptParaImagem = [
    p.tema,
    p.titulo,
    p.texto ? p.texto.substring(0, 300) : '',
    'Imagem médica profissional, educativa, limpa e adequada para uma clínica de saúde.'
  ].filter(Boolean).join('. ');

  showToast('A pedir imagem à IA... Aguarde um momento.', '');

  try {
    const { data, error } = await sb.functions.invoke('gerar-imagem', {
      body: { prompt: promptParaImagem }
    });

    if (error) throw error;

    const novaUrlImagem = data?.imageUrl || data?.url;
    if (!novaUrlImagem) throw new Error('A IA não retornou o link da imagem.');

    let imagemFinal = novaUrlImagem;

    // Tenta tornar a imagem permanente no Storage do Supabase.
    try {
      const response = await fetch(novaUrlImagem);
      if (response.ok) {
        const blob = await response.blob();
        const ext = (blob.type || 'image/png').split('/')[1] || 'png';
        const filePath = `ia/${targetId}-${Date.now()}.${ext}`;
        const { error: uploadError } = await sb.storage
          .from('publicacoes-imagens')
          .upload(filePath, blob, {
            contentType: blob.type || 'image/png',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicData } = sb.storage
            .from('publicacoes-imagens')
            .getPublicUrl(filePath);
          if (publicData?.publicUrl) imagemFinal = publicData.publicUrl;
        }
      }
    } catch (storageError) {
      console.warn('Não foi possível persistir a imagem no Storage; mantendo URL retornada pela IA.', storageError);
    }

    const { error: updateErr } = await sb
      .from('publicacoes_ia')
      .update({ imagem_url: imagemFinal })
      .eq('id', targetId);

    if (updateErr) throw updateErr;

    p.imagem_url = imagemFinal;

    const imgPreview = document.getElementById('pub_img_preview');
    if (imgPreview) {
      imgPreview.src = imagemFinal;
      imgPreview.style.display = 'block';
    }

    showToast('Imagem gerada e guardada com sucesso!', 'ok');
    await carregarPublicacoes();
    if (typeof abrirPublicacao === 'function') abrirPublicacao(targetId);
  } catch (e) {
    console.error('Erro na geração de imagem:', e);
    showToast('Erro ao gerar imagem: ' + (e.message || 'verifique a Edge Function gerar-imagem'), 'err');
  }
}


/* ============================================================
   RESTANTE DO ADMIN.JS
   ============================================================ */

async function aprovarPublicacao(id) {
  try {

    const novoEstado =
      document.getElementById(
        'pub_data'
      ).value
        ? 'Agendado'
        : 'Aguardando aprovação';

    const { error } =
      await sb
        .from('publicacoes_ia')
        .update({
          estado:
            'Agendado' === novoEstado
              ? 'Agendado'
              : 'Aguardando aprovação'
        })
        .eq('id', id);

    if (error) throw error;

    showToast(
      'Publicação aprovada.',
      'ok'
    );

    fecharPublicacao();
    carregarPublicacoes();

  } catch (e) {

    showToast(
      'Erro ao aprovar.',
      'err'
    );
  }
}

async function publicarAgora(id) {

  if (!confirm(
    'Publicar já no Facebook/Instagram?'
  )) return;

  showToast(
    'A publicar...',
    ''
  );

  try {

    const { error } =
      await sb.functions.invoke(
        'publicar-meta',
        {
          body: { id }
        }
      );

    if (error) throw error;

    showToast(
      'Publicado com sucesso!',
      'ok'
    );

    fecharPublicacao();
    carregarPublicacoes();

  } catch (e) {

    showToast(
      'A função "publicar-meta" ainda não está publicada no Supabase.',
      'err'
    );
  }
}

async function apagarPublicacao(id) {

  if (!confirm(
    'Apagar esta publicação?'
  )) return;

  try {

    const { error } =
      await sb
        .from('publicacoes_ia')
        .delete()
        .eq('id', id);

    if (error) throw error;

    showToast(
      'Publicação apagada.',
      'ok'
    );

    fecharPublicacao();
    carregarPublicacoes();

  } catch (e) {

    showToast(
      'Erro ao apagar.',
      'err'
    );
  }
}

setDate();
verificarSessao();
