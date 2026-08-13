/* Sincroniza o email público com o email oficial da empresa. */
(function(){
  const EMAIL='centromedicoxaquizolo@gmail.com';
  function apply(){
    document.querySelectorAll('[href^="mailto:"]').forEach(a=>{a.href='mailto:'+EMAIL;a.textContent=a.textContent.includes('@')?EMAIL:a.textContent;});
    document.querySelectorAll('a,span,p,div,li').forEach(el=>{
      if(el.children.length===0 && /geral@xaquizolo\.co\.ao/i.test(el.textContent)) el.textContent=el.textContent.replace(/geral@xaquizolo\.co\.ao/gi,EMAIL);
    });
    const ld=document.querySelector('script[type="application/ld+json"]');
    if(ld){try{const o=JSON.parse(ld.textContent);o.email=EMAIL;ld.textContent=JSON.stringify(o);}catch(e){}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
