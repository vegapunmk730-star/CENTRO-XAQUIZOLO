const SUPABASE_URL = 'https://bpvcghqofdhdpxwbqmdz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5ZriIb-_ECy0LpMNCpFZgQ_cBzPDV_W';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let ULTIMA_MARCACAO = null;

function parseDataLocal(str) {
  if (!str || str === '—') return null;
  let m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = String(str).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
function fmtDataCurta(str) {
  const d = parseDataLocal(str);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function openModal() {
  document.getElementById('modalRes').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalRes').classList.remove('open');
  document.body.style.overflow = '';
  const ok = document.getElementById('fOk');
  if (ok.style.display === 'block') {
    ok.style.display = 'none';
    document.getElementById('formWrap').style.display = '';
    document.getElementById('fBtn').disabled = false;
    document.getElementById('fBtn').textContent = 'Enviar Pedido de Marcação';
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function marcarServico(nome) {
  openModal();
  setTimeout(() => {
    document.getElementById('fsv').value = nome;
    const h = document.getElementById('formHint');
    h.textContent = '✓ ' + nome + ' selecionado — complete os dados abaixo.';
    h.className = 'form-hint-modal selected';
  }, 50);
}
function onServicoChange() {}

async function submitForm() {
  const nome = document.getElementById('fn').value.trim();
  const tel = document.getElementById('ft').value.trim();
  const email = document.getElementById('fe').value.trim();
  const err = document.getElementById('fErr');
  err.style.display = 'none';
  const telRx = /^[\d\s\+\-]{7,15}$/;
  if (nome.length < 2) { err.textContent = 'Por favor insira o seu nome completo.'; err.style.display = 'block'; return; }
  if (!tel || !telRx.test(tel)) { err.textContent = 'Por favor insira um número de telefone válido.'; err.style.display = 'block'; return; }
  const servico = document.getElementById('fsv').value;
  if (!servico) { err.textContent = 'Por favor seleccione o serviço pretendido.'; err.style.display = 'block'; return; }

  const btn = document.getElementById('fBtn');
  btn.disabled = true; btn.textContent = 'A enviar...';
  const dados = {
    nome, telefone: tel, email: email || null,
    servico,
    data: document.getElementById('fd').value || null,
    hora: document.getElementById('fh').value || null,
    observacoes: document.getElementById('fo').value.trim() || null
  };
  try {
    const { data, error } = await sb.from('marcacoes').insert(dados).select('codigo').single();
    if (error) throw error;
    const codigo = data && data.codigo ? data.codigo : '';
    ULTIMA_MARCACAO = { ...dados, codigo };

    const msg = `🏥 *Marcação — Centro Médico X'Aquizolo*\n\n🔖 *Código:* ${codigo}\n👤 *Nome:* ${dados.nome}\n📞 *Telefone:* ${dados.telefone}\n🩺 *Serviço:* ${dados.servico}\n📅 *Data preferida:* ${dados.data || 'sem preferência'}\n🕐 *Hora preferida:* ${dados.hora || 'sem preferência'}\n📝 *Observações:* ${dados.observacoes || '—'}`;
    window.open('https://wa.me/244922556347?text=' + encodeURIComponent(msg), '_blank');

    document.getElementById('formWrap').style.display = 'none';
    document.getElementById('fOk').style.display = 'block';
    const codeEl = document.getElementById('resCode');
    if (codeEl) codeEl.textContent = codigo ? ('Código da marcação: ' + codigo) : '';
    ['fn', 'ft', 'fe', 'fo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('fsv').value = '';
    document.getElementById('fd').value = '';
    document.getElementById('fh').value = '';
  } catch (e) {
    err.textContent = 'Erro ao enviar. Tente pelo WhatsApp.'; err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Enviar Pedido de Marcação';
  }
}

function imprimirComprovativo() {
  if (!ULTIMA_MARCACAO) return;
  const r = ULTIMA_MARCACAO;
  const area = document.getElementById('printArea');
  if (!area) return;
  area.innerHTML = `
    <div class="print-card">
      <h1>Centro Médico X'Aquizolo</h1>
      <p class="print-sub">N'dalatando · Cuanza Norte, Angola · 922 556 347</p>
      <h2>Comprovativo de Marcação</h2>
      <p class="print-codigo">Código: <strong>${r.codigo || '—'}</strong></p>
      <table>
        <tr><td>Nome</td><td>${r.nome || '—'}</td></tr>
        <tr><td>Telefone</td><td>${r.telefone || '—'}</td></tr>
        <tr><td>Email</td><td>${r.email || '—'}</td></tr>
        <tr><td>Serviço</td><td>${r.servico || '—'}</td></tr>
        <tr><td>Data preferida</td><td>${r.data || 'sem preferência'}</td></tr>
        <tr><td>Hora preferida</td><td>${r.hora || 'sem preferência'}</td></tr>
        <tr><td>Observações</td><td>${r.observacoes || '—'}</td></tr>
      </table>
      <p class="print-nota">Marcação sujeita a confirmação pela nossa equipa.</p>
    </div>`;
  window.print();
}

function toggleMob() { document.getElementById('mobMenu').classList.toggle('open'); }
window.addEventListener('resize', () => { if (window.innerWidth > 900) document.getElementById('mobMenu').classList.remove('open'); });
document.addEventListener('click', e => {
  if (!e.target.closest('#mobMenu') && !e.target.closest('.hamburger')) document.getElementById('mobMenu').classList.remove('open');
});
window.addEventListener('scroll', () => document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50));
window.addEventListener('load', () => setTimeout(() => document.getElementById('splash').classList.add('hide'), 2900));

let slide = 0;
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.dot');
let slideInterval = setInterval(() => goSlide((slide + 1) % slides.length), 5000);
function goSlide(n) {
  slides[slide].classList.remove('active'); dots[slide].classList.remove('active');
  slide = n; slides[slide].classList.add('active'); dots[slide].classList.add('active');
  clearInterval(slideInterval); slideInterval = setInterval(() => goSlide((slide + 1) % slides.length), 5000);
}

const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .1 });
document.querySelectorAll('.rev').forEach(r => obs.observe(r));

function abrirMaps() {
  window.open('https://maps.google.com/?q=-9.2978,14.9116', '_blank', 'noopener noreferrer');
}

document.getElementById('fyear').textContent = new Date().getFullYear();
const todayIso = new Date().toISOString().split('T')[0];
const fdEl = document.getElementById('fd');
if (fdEl) fdEl.min = todayIso;

function fecharAvisoBanner() {
  const banner = document.getElementById('avisoBanner');
  if (!banner) return;
  banner.style.display = 'none';
  const id = banner.dataset.avisoId;
  if (id) sessionStorage.setItem('aviso_fechado_' + id, '1');
}
async function carregarAvisos() {
  try {
    const { data, error } = await sb.from('avisos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    const avisos = data || [];

    const destaque = avisos.find(a => a.destaque && sessionStorage.getItem('aviso_fechado_' + a.id) !== '1');
    const banner = document.getElementById('avisoBanner');
    if (banner) {
      if (destaque) {
        banner.dataset.avisoId = destaque.id;
        const img = document.getElementById('avisoBannerImg');
        if (destaque.imagem_url) { img.src = destaque.imagem_url; img.style.display = ''; } else { img.style.display = 'none'; }
        document.getElementById('avisoBannerTitulo').textContent = destaque.titulo || '';
        document.getElementById('avisoBannerDesc').textContent = destaque.descricao || '';
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    }

    const grid = document.getElementById('novidadesGrid');
    const section = document.getElementById('novidades');
    if (grid && section) {
      if (avisos.length) {
        grid.innerHTML = avisos.map(a => {
          const periodo = (a.data_inicio || a.data_fim)
            ? `${a.data_inicio ? fmtDataCurta(a.data_inicio) : '—'} a ${a.data_fim ? fmtDataCurta(a.data_fim) : '—'}`
            : '';
          return `<div class="nov-card">
            ${a.imagem_url ? `<div class="nov-card-imgwrap"><img class="nov-card-img" src="${a.imagem_url}" alt="${(a.titulo || '').replace(/"/g, '')}" loading="lazy"></div>` : ''}
            <div class="nov-card-body">
              <div class="nov-card-title">${a.titulo || ''}</div>
              <div class="nov-card-desc">${a.descricao || ''}</div>
              ${periodo ? `<div class="nov-card-period">${periodo}</div>` : ''}
            </div>
          </div>`;
        }).join('');
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    }
  } catch (e) { console.error('Erro ao carregar avisos:', e.message || e); }
}
carregarAvisos();
