const SUPABASE_URL = 'https://bpvcghqofdhdpxwbqmdz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5ZriIb-_ECy0LpMNCpFZgQ_cBzPDV_W';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Carrega o gestor de profissionais sem alterar o restante do ADM. */
(function(){
  const load = () => {
    if(document.querySelector('script[data-profissionais-admin]')) return;
    const s=document.createElement('script');
    s.src='profissionais-admin.js';
    s.defer=true;
    s.dataset.profissionaisAdmin='true';
    document.head.appendChild(s);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();


/* PROFISSIONAIS ADMIN LOADER */
(function(){const x=document.createElement('script');x.src='profissionais-admin.js';x.defer=true;document.head.appendChild(x);})();
