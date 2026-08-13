const XAQ_PROF_SB_URL='https://bpvcghqofdhdpxwbqmdz.supabase.co';
const XAQ_PROF_SB_KEY='sb_publishable_5ZriIb-_ECy0LpMNCpFZgQ_cBzPDV_W';
const XAQ_PROF_SB=window.sb||supabase.createClient(XAQ_PROF_SB_URL,XAQ_PROF_SB_KEY);
function escProf(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
function profImg(p){return p.foto_url||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#FAF8F3"/><circle cx="400" cy="225" r="90" fill="#003070" opacity=".12"/><path d="M250 510c18-120 282-120 300 0" fill="#1B5E3F" opacity=".16"/><text x="400" y="560" text-anchor="middle" font-family="Arial" font-size="28" fill="#003070">Centro Médico X'Aquizolo</text></svg>`);}
function renderProfissionais(data){const g=document.getElementById('profissionaisGrid');if(!g)return;if(!data?.length){g.innerHTML='<div class="prof-empty">A nossa equipa será apresentada aqui em breve.</div>';return;}g.innerHTML=data.map(p=>{const h=Array.isArray(p.horarios)?p.horarios.filter(x=>x&&x.disponivel!==false):[];return `<article class="prof-card rev"><div class="prof-photo-wrap"><img class="prof-photo" src="${escProf(profImg(p))}" alt="${escProf(p.nome)}" loading="lazy"></div><div class="prof-body"><h3 class="prof-name">${escProf(p.nome)}</h3>${p.cargo?`<div class="prof-role">${escProf(p.cargo)}</div>`:''}${p.area_atuacao?`<div class="prof-area">${escProf(p.area_atuacao)}</div>`:''}${p.biografia?`<p class="prof-bio">${escProf(p.biografia)}</p>`:''}${p.descricao?`<p class="prof-desc">${escProf(p.descricao)}</p>`:''}<div class="prof-hours"><div class="prof-hours-title">Horários de atendimento</div>${h.length?h.map(x=>`<div class="prof-hours-row"><span>${escProf(x.dia)}</span><strong>${escProf(x.inicio)} – ${escProf(x.fim)}</strong></div>`).join(''):'<div class="prof-hours-row"><span>Horários</span><strong>A confirmar</strong></div>'}</div><a class="prof-cta" href="#marcacao" onclick="marcarServico('${escProf(p.area_atuacao||p.cargo||'Consulta')}')">Marcar atendimento</a></div></article>`;}).join('');}
async function carregarProfissionais(){try{const {data,error}=await XAQ_PROF_SB.from('profissionais').select('*').eq('ativo',true).order('ordem',{ascending:true}).order('nome',{ascending:true});if(error)throw error;renderProfissionais(data||[]);}catch(e){console.warn('Profissionais indisponíveis:',e.message||e);renderProfissionais([]);}}

/* Estilo isolado da equipa: segue o sistema visual existente sem alterar o style.css. */
(function(){if(document.getElementById('profissionaisStyle'))return;const s=document.createElement('style');s.id='profissionaisStyle';s.textContent=`
#profissionais{background:var(--creme,#FAF8F3);position:relative}
#profissionais .sh{max-width:650px}
#profissionaisGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:36px}
.prof-card{background:var(--branco,#fff);border:1px solid var(--bd,rgba(27,58,107,.12));border-radius:var(--radius,14px);overflow:hidden;box-shadow:var(--shadow,0 4px 24px rgba(27,58,107,.08));display:flex;flex-direction:column;transition:transform .3s,box-shadow .3s,border-color .3s}
.prof-card:hover{transform:translateY(-5px);box-shadow:var(--shadow-h,0 12px 40px rgba(27,58,107,.14));border-color:rgba(27,94,63,.25)}
.prof-photo-wrap{aspect-ratio:4/3;background:var(--areia,#F2EEE3);overflow:hidden;position:relative}
.prof-photo-wrap:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 65%,rgba(27,58,107,.08))}
.prof-photo{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease}
.prof-card:hover .prof-photo{transform:scale(1.035)}
.prof-body{padding:24px 24px 22px;display:flex;flex-direction:column;flex:1}
.prof-name{font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:600;line-height:1.1;color:var(--texto,#1A1F1C);margin:0 0 5px}
.prof-role{font-size:.66rem;letter-spacing:.13em;text-transform:uppercase;color:var(--verde,#1B5E3F);font-weight:600;margin-bottom:13px}
.prof-area{display:inline-flex;align-self:flex-start;padding:6px 12px;border-radius:20px;background:rgba(27,94,63,.08);color:var(--verde,#1B5E3F);font-size:.67rem;letter-spacing:.03em;font-weight:600;margin-bottom:15px}
.prof-bio,.prof-desc{font-size:.82rem;line-height:1.75;color:var(--texto-s,#5A6560);font-weight:300;margin:0 0 10px}
.prof-desc{color:var(--texto,#1A1F1C)}
.prof-hours{border-top:1px solid var(--bd,rgba(27,58,107,.12));margin-top:auto;padding-top:15px;margin-top:16px}
.prof-hours-title{font-size:.61rem;letter-spacing:.16em;text-transform:uppercase;color:var(--azul,#1B3A6B);font-weight:600;margin-bottom:8px}
.prof-hours-row{display:flex;justify-content:space-between;gap:14px;padding:4px 0;font-size:.74rem;color:var(--texto-s,#5A6560)}
.prof-hours-row strong{color:var(--verde,#1B5E3F);font-weight:600;white-space:nowrap}
.prof-cta{display:flex;align-items:center;justify-content:center;width:100%;margin-top:18px;padding:12px 18px;border-radius:8px;background:var(--verde,#1B5E3F);color:var(--branco,#fff);font-size:.69rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;text-decoration:none;transition:background .2s,transform .2s}
.prof-cta:hover{background:var(--verde-c,#2D7D57);transform:translateY(-1px)}
.prof-empty,.prof-loading{grid-column:1/-1;text-align:center;padding:42px 24px;color:var(--texto-s,#5A6560);border:1px dashed var(--bd,rgba(27,58,107,.12));border-radius:var(--radius,14px);background:rgba(255,255,255,.5)}
@media(max-width:700px){#profissionaisGrid{grid-template-columns:1fr;gap:18px}.prof-body{padding:21px}.prof-photo-wrap{aspect-ratio:16/10}.prof-name{font-size:1.4rem}.prof-hours-row{font-size:.72rem}}
@media(min-width:701px) and (max-width:1050px){#profissionaisGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px)}}
`;document.head.appendChild(s)})();

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',carregarProfissionais);else carregarProfissionais();
