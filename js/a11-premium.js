(()=>{
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const progress=$('#scrollProgress'), glow=$('#a11Glow');
 const update=()=>{const d=document.documentElement, max=d.scrollHeight-innerHeight; progress.style.width=(max>0?(scrollY/max)*100:0)+'%';};
 addEventListener('scroll',update,{passive:true}); addEventListener('resize',update); update();
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('a11-visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -8%'});
 $$('.reveal').forEach(e=>io.observe(e));
 $$('.product-card,.showcase-card,.category-chip').forEach(e=>{e.dataset.tilt='';e.addEventListener('pointermove',ev=>{if(innerWidth<701)return;const r=e.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;e.style.transform=`perspective(900px) rotateX(${-y*4}deg) rotateY(${x*5}deg) translateY(-6px)`});e.addEventListener('pointerleave',()=>e.style.transform='')});
 if(glow){addEventListener('pointermove',e=>{if(innerWidth<701)return;glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true})}
 $$('[data-a11-nav]').forEach(b=>b.addEventListener('click',()=>document.querySelector(b.dataset.a11Nav)?.scrollIntoView({behavior:'smooth'})));
 $('#a11Account')?.addEventListener('click',()=>$('#profileOverlay')?.classList.add('open'));
 const sections=['home','perfumes','explore']; const navs=$$('[data-a11-nav]');
 const si=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){navs.forEach(n=>n.classList.toggle('a11-nav-active',n.dataset.a11Nav==='#'+e.target.id))}}),{threshold:.35});
 sections.map(id=>$('#'+id)).filter(Boolean).forEach(e=>si.observe(e));
 // Gentle press feedback for touch controls.
 document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b){b.animate([{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1)'}],{duration:170,easing:'ease-out'})}}, {passive:true});
 // Make product images fail gracefully instead of showing broken-image icons.
 $$('img').forEach(img=>img.addEventListener('error',()=>{img.style.opacity='.25';img.alt='Imagen no disponible'}));
})();
