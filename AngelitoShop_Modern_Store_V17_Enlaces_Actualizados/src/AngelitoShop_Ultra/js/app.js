(() => {
  'use strict';
  const CONFIG = {
    whatsapp: '529615712599',
    adminEmail: 'maluvasa12@gmail.com',
    introVideo: 'assets/intro-user.mp4',
    introAudio: 'assets/audio/calmness-for-once.mp3',
    storeAudio: 'assets/audio/up-una-aventura.mp3'
  };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const local = {
    get(k, fallback){try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch{return fallback}},
    set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  };
  let products = [], perfumes = [], pdfCatalogProducts = [], activeFilter='all', searchTerm='', currentProduct=null, currentPerfume=0, selected=local.get('angelitoSelection',[]), wishes=new Set(local.get('angelitoWishes',[]));
  let spinTimer=null, viewerRotX=0, viewerRotY=0, viewerDrag=null, ambientAudio=null, ambientGain=null, ambientPlaying=false, carouselTimer=null;
  let firebaseReady=false, auth=null, db=null, currentUser=null, authMode='login';
  const status = $('#authStatus');

  const showToast = msg => { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>t.classList.remove('show'),2600); };
  const scrollTo = sel => document.querySelector(sel)?.scrollIntoView({behavior:'smooth',block:'start'});

  // Firebase: real auth when credentials exist; local demo otherwise.
  try {
    if(window.ANGELITO_FIREBASE_CONFIG?.apiKey){
      firebase.initializeApp(window.ANGELITO_FIREBASE_CONFIG);
      auth=firebase.auth(); db=firebase.firestore(); firebaseReady=true;
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
      auth.onAuthStateChanged(async user => { if(user) await completeLogin(user); });
    }
  } catch(e){ console.warn('Firebase init:',e); }

  const intro = $('#intro');
  $('#emailInput') && ($('#emailInput').value = CONFIG.adminEmail);
  const authScreen = $('#auth');
  const app = $('#app');
  const introVideo = $('#introVideo');
  const introAudio = $('#introAudio');
  const storeAudio = $('#storeAudio');
  let introStarted=false;
  introVideo?.addEventListener('error',()=>{ introVideo.src=CONFIG.introVideo; introVideo.load(); introVideo.play().catch(()=>{}); });
  function finishIntro(){
    if(!intro || !intro.parentNode)return;
    intro.classList.add('exit');
    try{introAudio?.pause(); if(introAudio)introAudio.currentTime=0;}catch(e){}
    setTimeout(()=>{intro.remove();authScreen.classList.remove('is-hidden');document.body.classList.remove('lock');$('#emailInput')?.focus()},900);
  }
  function startIntroExperience(){
    if(introStarted)return;
    introStarted=true;
    intro.classList.add('playing');
    const startAt=0;
    try{introVideo.currentTime=startAt;}catch(e){}
    try{introAudio.currentTime=startAt;}catch(e){}
    introVideo.muted=true;
    introVideo.play().catch(()=>{});
    introAudio.volume=.72;
    introAudio.play().catch(()=>{});
    $('#enterIntro').querySelector('span').textContent='Disfrutar experiencia…';
    $('#enterIntro').disabled=true;
    introVideo.onended=finishIntro;
  }
  $('#enterIntro').addEventListener('click',startIntroExperience);

  // Auth UI
  $$('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.auth-tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); authMode=btn.dataset.mode;
    $('.name-field').style.display=authMode==='register'?'block':'none';
    $('#authSubmitText').textContent=authMode==='register'?'Crear cuenta':'Entrar al catálogo';
    $('#passwordInput').autocomplete=authMode==='register'?'new-password':'current-password';
    $('#forgotBtn').style.display=authMode==='register'?'none':'inline';
    status.textContent='';
  }));
  $('#showPassword').addEventListener('change',e=>$('#passwordInput').type=e.target.checked?'text':'password');
  $('#forgotBtn').addEventListener('click', async()=>{
    const email=$('#emailInput').value.trim(); if(!email)return setAuthStatus('Escribe tu correo primero.');
    if(firebaseReady){try{await auth.sendPasswordResetEmail(email);setAuthStatus('Revisa tu correo para restablecer la contraseña.',true)}catch(e){setAuthStatus(readAuthError(e))}}
    else setAuthStatus('El restablecimiento real se activa al conectar Firebase.');
  });
  $('#authForm').addEventListener('submit', async e=>{
    e.preventDefault(); const email=$('#emailInput').value.trim(), pass=$('#passwordInput').value, name=$('#nameInput').value.trim();
    if(!/^\S+@\S+\.\S+$/.test(email)) return setAuthStatus('Introduce un correo electrónico válido.');
    if(pass.length<6) return setAuthStatus('La contraseña debe tener al menos 6 caracteres.');
    setAuthStatus('Verificando acceso…',true);
    try{
      if(!firebaseReady && authMode==='register'){
        const accounts=local.get('angelitoAccounts',[]);
        if(accounts.some(a=>a.email.toLowerCase()===email.toLowerCase())) return setAuthStatus('Ese correo ya tiene una cuenta. Inicia sesión.');
        const account={uid:'local-'+Date.now(),email,name:name||email.split('@')[0],password:pass};
        accounts.unshift(account); local.set('angelitoAccounts',accounts.slice(0,100));
        setAuthStatus('Cuenta creada correctamente. Ahora inicia sesión con tu correo y contraseña.',true);
        $$('.auth-tab').forEach(x=>x.classList.toggle('active',x.dataset.mode==='login')); authMode='login'; $('.name-field').style.display='none'; $('#authSubmitText').textContent='Entrar al catálogo'; $('#passwordInput').autocomplete='current-password'; $('#forgotBtn').style.display='inline'; $('#passwordInput').value='';
        return;
      }
      if(firebaseReady){
        if(authMode==='register'){
          const cred=await auth.createUserWithEmailAndPassword(email,pass);
          if(name) await cred.user.updateProfile({displayName:name});
          await cred.user.sendEmailVerification();
          setAuthStatus('Cuenta creada. Revisa tu correo y confirma la dirección antes de entrar.',true);
          await auth.signOut();
        } else {
          const cred=await auth.signInWithEmailAndPassword(email,pass);
          if(!cred.user.emailVerified && cred.user.providerData.some(p=>p.providerId==='password')){ await auth.signOut(); return setAuthStatus('Tu correo aún no está verificado. Revisa tu bandeja de entrada.'); }
          await completeLogin(cred.user);
        }
      } else {
        // Demo mode: an account must actually be registered locally before login.
        const accounts=local.get('angelitoAccounts',[]);
        const found=accounts.find(a=>a.email.toLowerCase()===email.toLowerCase());
        if(!found) return setAuthStatus('Esta cuenta todavía no existe en Angelito Shop. Cambia a “Crear cuenta” para registrarla.');
        if(found.password!==pass) return setAuthStatus('La contraseña no coincide con la cuenta registrada.');
        const user={uid:found.uid,email:found.email,displayName:found.name||email.split('@')[0],emailVerified:true};
        local.set('angelitoUser',user); await completeLogin(user,true);
      }
    }catch(e){setAuthStatus(readAuthError(e));}
  });
  $('#googleBtn').addEventListener('click',async()=>{
    if(!firebaseReady){
      $('#emailInput').value=CONFIG.adminEmail; $('#nameInput').value='';
      setAuthStatus('Google real queda disponible al conectar Firebase. La demo ya reconoce la cuenta administradora.',true); return;
    }
    try{
      const provider=new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
      try{await auth.signInWithPopup(provider)}catch(e){ if(['auth/popup-blocked','auth/popup-closed-by-user','auth/operation-not-supported-in-this-environment'].includes(e.code)) await auth.signInWithRedirect(provider); else throw e; }
    }catch(e){setAuthStatus(readAuthError(e));}
  });
  function setAuthStatus(msg,ok=false){status.textContent=msg;status.style.color=ok?'#5b3aa6':'#d64b74';}
  function readAuthError(e){const m={ 'auth/invalid-credential':'Correo o contraseña incorrectos.','auth/user-not-found':'No existe una cuenta con ese correo.','auth/wrong-password':'La contraseña no es correcta.','auth/email-already-in-use':'Ese correo ya tiene una cuenta.','auth/weak-password':'Usa una contraseña de al menos 6 caracteres.','auth/too-many-requests':'Demasiados intentos. Espera un momento.','auth/popup-closed-by-user':'Se cerró la ventana de Google.'};return m[e.code]||e.message||'No se pudo completar el acceso.'; }

  function startStoreMusic(){
    if(!storeAudio)return;
    storeAudio.volume=.13;
    storeAudio.loop=true;
    storeAudio.play().then(()=>{$('#soundToggle')?.classList.add('on');$('#soundToggle')?.setAttribute('aria-pressed','true')}).catch(()=>{
      // Browsers that block delayed autoplay can start it from the next tap.
      showToast('Toca el botón de música para activar la canción de la tienda.');
    });
  }
  function stopStoreMusic(){if(!storeAudio)return;storeAudio.pause();storeAudio.currentTime=0;$('#soundToggle')?.classList.remove('on');$('#soundToggle')?.setAttribute('aria-pressed','false')}
  function toggleStoreMusic(){if(!storeAudio)return;if(storeAudio.paused){startStoreMusic()}else{stopStoreMusic()}}
  $('#soundToggle')?.addEventListener('click',toggleStoreMusic);
  async function completeLogin(user,localDemo=false){
    currentUser=user;
    const name=user.displayName||user.email.split('@')[0];
    local.set('angelitoUser',{uid:user.uid,email:user.email,displayName:name,emailVerified:user.emailVerified!==false});
    if(firebaseReady && db){
      try{await db.collection('users').doc(user.uid).set({name,email:user.email,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),lastLoginAt:firebase.firestore.FieldValue.serverTimestamp(),provider:(user.providerData?.[0]?.providerId||'unknown')},{merge:true});}catch(e){console.warn(e)}
      try{await db.collection('activity').add({uid:user.uid,email:user.email,name,type:'login',createdAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){}
    }
    authScreen.classList.add('is-hidden');
    const loader=$('#catalogLoading'); loader.classList.remove('is-hidden'); document.body.classList.add('lock');
    updateUserUI(); updateSelection(); renderAll(); observeReveals();
    if(user.email?.toLowerCase()===CONFIG.adminEmail.toLowerCase()) $('#adminMenu').classList.remove('is-hidden'); else $('#adminMenu').classList.add('is-hidden');
    if(localDemo){rememberDemoUser();}
    setTimeout(()=>{loader.classList.add('is-hidden');app.classList.remove('is-hidden');document.body.classList.remove('lock');window.scrollTo({top:0,behavior:'instant'});startStoreMusic();showToast(localDemo?'Modo demo activo — conecta Firebase para datos reales.':'Bienvenido a Angelito Shop.');},4600);
  }
  function updateUserUI(){const u=currentUser||local.get('angelitoUser',{email:'',displayName:'Invitado'}); const name=u.displayName||u.email?.split('@')[0]||'Invitado'; $('#menuUserName').textContent=name;$('#menuUserEmail').textContent=u.email||'—';$('#userAvatar').textContent=name[0]?.toUpperCase()||'A';$('#profileAvatar').textContent=name[0]?.toUpperCase()||'A';$('#profileName').textContent=name;$('#profileEmail').textContent=u.email||'—';}
  $('#logoutBtn').addEventListener('click',async()=>{if(firebaseReady)await auth.signOut().catch(()=>{});localStorage.removeItem('angelitoUser');location.reload()});

  // Load catalog
  async function loadProducts(){
    try{products=await fetch('assets/catalog/products.json').then(r=>r.json())}catch{products=[]}
    const names=[
      [1,'Live Adventure L’Bel','Fragancia masculina de perfil fresco y limpio, presentada en un frasco elegante y sobrio.','Fresco · masculino · elegante'],
      [2,'Cherie L’Bel','Aroma femenino floral y luminoso, con una presencia delicada y sofisticada.','Floral · femenino · luminoso'],
      [3,'Kalos Champion Ésika','Fragancia masculina de carácter fresco y moderno, con una imagen dorada y marcada.','Fresco · masculino · moderno'],
      [4,'Kalos Sport Ésika','Aroma masculino deportivo y vibrante, pensado para una sensación fresca y energética.','Fresco · deportivo · energético'],
      [5,'Magnat Exclusive Ésika','Fragancia masculina intensa y elegante, con un perfil profundo y sofisticado.','Intenso · elegante · amaderado'],
      [6,'D’Orsay Grand','Aroma masculino de carácter sobrio y envolvente, con una presencia elegante.','Elegante · intenso · masculino'],
      [7,'Magnat Elite Ésika','Fragancia masculina de presencia fuerte, fresca y contemporánea.','Fresco · intenso · masculino'],
      [8,'You Ésika','Fragancia limpia y ligera, con una estética sencilla y fresca para todos los días.','Limpio · fresco · cotidiano'],
      [9,'Momentos Libertad Ésika','Aroma fresco y luminoso para acompañar momentos cotidianos con una sensación ligera.','Fresco · luminoso · femenino'],
      [10,'Impredecible Glamour Ésika','Fragancia intensa y sofisticada, con un frasco oscuro y una personalidad marcada.','Intenso · glamour · sofisticado'],
      [11,'Y25 Cyzone','Fragancia juvenil de estética moderna, con una presencia fresca y expresiva.','Juvenil · moderno · expresivo']
    ];
    perfumes=names.map((x,i)=>({id:'pf-'+(i+1),name:x[1],description:x[2],tags:x[3],category:'perfumes',image:`assets/perfumes/pdf-${String(i+1).padStart(2,'0')}.png`}));
    // Existing catalog: avoid old perfume duplicates in the main grid so the PDF gallery remains the perfume signature.
    products=products.filter(p=>p.category!=='perfumes');
    products=[...perfumes,...products];
  }
  function renderAll(){renderPerfumeCarousel();renderShowcases();renderGrid();}
  function renderPerfumeCarousel(){
    const track=$('#carouselTrack'); track.innerHTML=perfumes.map((p,i)=>`<article class="perf-card" data-i="${i}"><div class="perf-glass"></div><img src="${p.image}" alt="${esc(p.name)}"></article>`).join(''); positionPerfumes(); startCarouselAuto();
  }
  function startCarouselAuto(){clearInterval(carouselTimer); carouselTimer=setInterval(()=>{if(!document.hidden && !document.body.classList.contains('lock'))stepPerfume(1)},5200)}
  function positionPerfumes(){const cards=$$('.perf-card'); const n=cards.length; cards.forEach((card,i)=>{let d=i-currentPerfume; if(d>n/2)d-=n;if(d<-n/2)d+=n; const abs=Math.abs(d); const mobile=window.matchMedia('(max-width:600px)').matches; const step=mobile?Math.min(225,window.innerWidth*.60):230; const x=d*step; const z=-abs*(mobile?95:120); const rot=d*(mobile?13:20); const scale=Math.max(mobile?.72:.64,1-abs*(mobile?.10:.12)); card.style.transform=`translate3d(calc(-50% + ${x}px),-50%,${z}px) rotateY(${rot}deg) scale(${scale})`;card.style.opacity=abs>3?0:Math.max(.18,1-abs*.27);card.style.filter=abs===0?'none':`blur(${Math.min(abs*1.2,4)}px)`;card.classList.toggle('active',d===0);}); const p=perfumes[currentPerfume];$('#carouselName').textContent=p.name;$('#carouselDesc').textContent=p.description;$('#carouselTags').innerHTML=(p.tags||'').split('·').map(t=>`<span>${esc(t.trim())}</span>`).join('');$('#carouselProgress').style.width=((currentPerfume+1)/n*100)+'%'; }
  function stepPerfume(dir){currentPerfume=(currentPerfume+dir+perfumes.length)%perfumes.length;positionPerfumes();}
  $('#prevPerfume').addEventListener('click',()=>stepPerfume(-1));$('#nextPerfume').addEventListener('click',()=>stepPerfume(1));$('#carouselOpen').addEventListener('click',()=>openProduct(perfumes[currentPerfume]));
  let dragStart=null;$('#perfumeCarousel').addEventListener('pointerenter',()=>clearInterval(carouselTimer));$('#perfumeCarousel').addEventListener('pointerleave',()=>startCarouselAuto());$('#perfumeCarousel').addEventListener('pointerdown',e=>{dragStart=e.clientX;$('#perfumeCarousel').setPointerCapture?.(e.pointerId)});$('#perfumeCarousel').addEventListener('pointerup',e=>{if(dragStart==null)return;const dx=e.clientX-dragStart;if(Math.abs(dx)>35)stepPerfume(dx<0?1:-1);dragStart=null}); window.addEventListener('resize',()=>positionPerfumes(),{passive:true});

  async function buildPdfCatalog(){
    try{const base=await fetch('source/catalog-76-products.json').then(r=>r.json());const extra=await fetch('source/catalog-extra-products.json').then(r=>r.json()).catch(()=>[]);pdfCatalogProducts=[...base,...extra]}catch{pdfCatalogProducts=[]}
    const host=$('#pdfCatalogGrid');
    if(host){host.innerHTML=pdfCatalogProducts.map(p=>`<article class="pdf-catalog-card" data-pdf-id="${p.id}"><div class="pdf-catalog-image"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy"></div><div class="pdf-catalog-copy"><small>${esc(p.category)}</small><strong>${esc(p.name)}</strong><span>Mirar de cerca · 3D · Girar ↗</span></div></article>`).join('');$$('#pdfCatalogGrid .pdf-catalog-card').forEach(c=>c.addEventListener('click',()=>openProduct(pdfCatalogProducts.find(p=>p.id===c.dataset.pdfId))))}
  }

  function renderShowcases(){
    const sets={showcaseMakeup:'maquillaje',showcaseSkin:'skincare',showcaseHair:'cabello'};
    Object.entries(sets).forEach(([id,cat])=>{
      const host=$('#'+id); if(!host)return;
      const arr=products.filter(p=>p.category===cat).slice(0,4);
      host.innerHTML=arr.map(p=>`<article class="showcase-card" data-id="${p.id}"><button class="showcase-wish" data-wish="${p.id}">${wishes.has(p.id)?'♥':'♡'}</button><div class="showcase-image"><img src="${p.image}" alt="${esc(p.name)}"></div><div class="showcase-copy"><small>${esc(p.category)}</small><strong>${esc(p.name)}</strong><span>Consultar ↗</span></div></article>`).join('');
      $$('#'+id+' .showcase-card').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('[data-wish]'))return;openProduct(products.find(p=>p.id===c.dataset.id))}));
      $$('#'+id+' [data-wish]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleWish(b.dataset.wish,b)}));
    });
  }
  function renderGrid(){const grid=$('#productGrid');if(!grid)return;let arr=pdfCatalogProducts.filter(p=>(activeFilter==='all'||p.category===activeFilter)&&((p.name+' '+p.description+' '+p.tags).toLowerCase().includes(searchTerm.toLowerCase())));grid.innerHTML=arr.map(p=>`<article class="product-card" data-id="${p.id}"><button class="wish" data-wish="${p.id}">${wishes.has(p.id)?'♥':'♡'}</button><div class="product-image"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy"></div><div class="product-copy"><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p></div><button class="product-open">Mirar de cerca · 3D · Girar ↗</button></article>`).join('');$$('.product-card').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('[data-wish]'))return;openProduct(pdfCatalogProducts.find(p=>p.id===c.dataset.id))}));$$('[data-wish]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleWish(b.dataset.wish,b)}));}
  function toggleWish(id,button){if(wishes.has(id))wishes.delete(id);else wishes.add(id);local.set('angelitoWishes',[...wishes]);button.textContent=wishes.has(id)?'♥':'♡';showToast(wishes.has(id)?'Añadido a favoritos':'Quitado de favoritos');track('favorite',id);}
  $$('#filters .filter').forEach(b=>b.addEventListener('click',()=>{$$('#filters .filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;renderGrid()}));
  $('#searchInput').addEventListener('input',e=>{searchTerm=e.target.value;renderGrid()});
  $('#searchBtn').addEventListener('click',()=>{$('#searchOverlay').classList.add('open');$('#overlaySearch').focus()});$('#overlaySearch').addEventListener('input',e=>renderSearchResults(e.target.value));
  function renderSearchResults(q){const r=pdfCatalogProducts.filter(p=>(p.name+' '+p.description+' '+p.tags).toLowerCase().includes(q.toLowerCase())).slice(0,10);$('#searchResults').innerHTML=r.map(p=>`<div class="search-result" data-id="${p.id}"><img src="${p.image}"><div><strong>${esc(p.name)}</strong><small>${esc(p.description)}</small></div></div>`).join('')||'<p style="color:#887d90;font-size:12px;padding:20px 0">No encontramos coincidencias.</p>';$$('.search-result').forEach(x=>x.addEventListener('click',()=>{closeOverlay('searchOverlay');openProduct(pdfCatalogProducts.find(p=>p.id===x.dataset.id))}));}
  $$('.category-chip').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;$('#explore').scrollIntoView({behavior:'smooth'});setTimeout(()=>{$$('#filters .filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===activeFilter));renderGrid()},350)}));
  $$('[data-filter-jump]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filterJump;$('#explore').scrollIntoView({behavior:'smooth'});setTimeout(()=>{$$('#filters .filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===activeFilter));renderGrid()},350)}));
  $$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>scrollTo(b.dataset.scroll)));
  $$('.rail-arrow').forEach(b=>b.addEventListener('click',()=>{$('#'+b.dataset.rail).scrollBy({left:Number(b.dataset.dir)*500,behavior:'smooth'})}));

  // Product modal — smooth pseudo-3D viewer with drag on touch/mouse + automatic rotation.
  let zoom=1, spinFrame=0, resumeSpinTimer=null;
  function openProduct(p){if(!p)return;currentProduct=p;zoom=1;viewerRotX=0;viewerRotY=0;stopSpin();applyViewer();$('#modalProductImg').src=p.image;$('#modalProductImg').alt=p.name;$('#modalCategory').textContent=(p.category||'product').toUpperCase();$('#modalName').textContent=p.name;$('#modalDesc').textContent=p.description;$('#modalTags').innerHTML=(p.tags||'').split('·').map(t=>`<span class="tag">${esc(t.trim())}</span>`).join('');setDeliveryDate();$('#productModal').classList.add('open');document.body.classList.add('lock');track('product_view',p.id);setTimeout(()=>startSpin(),500);}
  function applyViewer(){const o=$('#viewerObject');if(o)o.style.transform=`translate3d(0,0,0) rotateX(${viewerRotX}deg) rotateY(${viewerRotY}deg) scale(${zoom})`}
  function stopSpin(){if(spinFrame){cancelAnimationFrame(spinFrame);spinFrame=0}clearTimeout(resumeSpinTimer);$('#spinToggle')?.classList.remove('active')}
  function startSpin(){stopSpin();$('#spinToggle')?.classList.add('active');const started=performance.now(),duration=8000,startRotation=((viewerRotY%360)+360)%360;const tick=(now)=>{const elapsed=(now-started)%duration;const phase=elapsed/duration;const base=(startRotation+phase*360)%360;viewerRotY=base;const floatY=Math.sin(phase*Math.PI*2)*10;const o=$('#viewerObject');if(o)o.style.transform=`translate3d(0,${floatY}px,0) rotateX(${viewerRotX}deg) rotateY(${base}deg) scale(${zoom})`;spinFrame=requestAnimationFrame(tick)};spinFrame=requestAnimationFrame(tick)}
  function toggleSpin(){spinFrame?stopSpin():startSpin()}
  $('#spinToggle')?.addEventListener('click',toggleSpin);
  $('#zoomIn').addEventListener('click',()=>{zoom=Math.min(1.45,zoom+.1);applyViewer()});$('#zoomOut').addEventListener('click',()=>{zoom=Math.max(.75,zoom-.1);applyViewer()});
  const viewer=$('#viewer');
  viewer?.addEventListener('pointerdown',e=>{viewerDrag={x:e.clientX,y:e.clientY,rx:viewerRotX,ry:viewerRotY};viewer.setPointerCapture?.(e.pointerId);stopSpin();$('#viewerObject')?.classList.add('dragging')});
  viewer?.addEventListener('pointermove',e=>{if(!viewerDrag)return;const dx=e.clientX-viewerDrag.x,dy=e.clientY-viewerDrag.y;viewerRotY=viewerDrag.ry+dx*.55;viewerRotX=Math.max(-24,Math.min(24,viewerDrag.rx-dy*.28));applyViewer()});
  const resumeAfterDrag=()=>{if(!viewerDrag)return;viewerDrag=null;$('#viewerObject')?.classList.remove('dragging');clearTimeout(resumeSpinTimer);resumeSpinTimer=setTimeout(()=>{if($('#productModal')?.classList.contains('open'))startSpin()},900)};
  viewer?.addEventListener('pointerup',resumeAfterDrag);viewer?.addEventListener('pointercancel',resumeAfterDrag);

  function addBusinessDays(date,count){const d=new Date(date);let n=0;while(n<count){d.setDate(d.getDate()+1);const day=d.getDay();if(day!==0&&day!==6)n++;}return d;}
  function fmtDate(d){return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'}).replace('.','');}
  function setDeliveryDate(){const input=$('#deliveryDate');if(!input)return;const today=new Date();const iso=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);input.value=iso;updateDeliveryRange(iso);}
  function updateDeliveryRange(iso){const base=new Date(iso+'T12:00:00');if(Number.isNaN(base.getTime()))return;const start=addBusinessDays(base,3);const end=addBusinessDays(base,11);$('#deliveryRange').textContent=`${fmtDate(start)} — ${fmtDate(end)}`;}
  $('#deliveryDate')?.addEventListener('change',e=>updateDeliveryRange(e.target.value));
  $('#modalSelect').addEventListener('click',()=>{if(!currentProduct)return;if(!selected.some(x=>x.id===currentProduct.id))selected.push(currentProduct);local.set('angelitoSelection',selected);updateSelection();showToast('Producto añadido a tu selección');track('selection_add',currentProduct.id)});
  $('#modalWhatsApp').addEventListener('click',()=>sendWhatsApp([currentProduct]));
  $('#modalShare').addEventListener('click',async()=>{if(!currentProduct)return;const link=location.href.split('#')[0]+'#product='+encodeURIComponent(currentProduct.id);try{await navigator.clipboard.writeText(link);showToast('Enlace del producto copiado.');}catch{window.prompt('Copia este enlace:',link)}});
  function productLink(p){return location.href.split('#')[0]+'#product='+encodeURIComponent(p.id)}
  function updateSelection(){$('#selectionCount').textContent=selected.length;$('#selectionList').innerHTML=selected.map(p=>`<div class="selection-item"><img src="${p.image}"><div><strong>${esc(p.name)}</strong><small>${esc(p.category)}</small></div><button data-remove="${p.id}">×</button></div>`).join('')||'<div style="padding:35px 0;color:#8c8192;font-size:12px">Todavía no has agregado productos.</div>';$$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{selected=selected.filter(x=>x.id!==b.dataset.remove);local.set('angelitoSelection',selected);updateSelection()}));}
  $('#selectionBtn').addEventListener('click',()=>{$('#selectionPanel').classList.add('open');$('#panelOverlay').classList.add('open')});$('#closeSelection').addEventListener('click',closeSelection);$('#panelOverlay').addEventListener('click',closeSelection);function closeSelection(){$('#selectionPanel').classList.remove('open');$('#panelOverlay').classList.remove('open')}
  $('#selectionWhatsApp').addEventListener('click',()=>{if(!selected.length)return showToast('Agrega al menos un producto.');sendWhatsApp(selected)});
  function sendWhatsApp(list){const lines=list.map(p=>`• ${p.name} — ${productLink(p)}`).join('\n');const msg=`Hola, me interesa solicitar información de estos productos de Angelito Shop:\n${lines}`;const url=`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;if(CONFIG.whatsapp.includes('X'))showToast('Configura tu número de WhatsApp en js/app.js');else window.open(url,'_blank','noopener');track('whatsapp',list.map(p=>p.id).join(','));}

  // Menu/profile/admin
  $('#menuBtn').addEventListener('click',()=>{$('#sideMenu').classList.add('open');$('#sideOverlay').classList.add('open')});$('#closeMenu').addEventListener('click',closeMenu);$('#sideOverlay').addEventListener('click',closeMenu);$$('.side-links a').forEach(a=>a.addEventListener('click',closeMenu));function closeMenu(){$('#sideMenu').classList.remove('open');$('#sideOverlay').classList.remove('open')}
  $('#profileMenu').addEventListener('click',()=>{closeMenu();const u=currentUser||local.get('angelitoUser',{});$('#profileName').textContent=u.displayName||u.email?.split('@')[0]||'Usuario';$('#profileEmail').textContent=u.email||'—';$('#profileViews').textContent=local.get('angelitoLocalInteractions',[]).length;$('#profileSaved').textContent=selected.length;$('#profileOverlay').classList.add('open')});$('#profileClose').addEventListener('click',()=>closeOverlay('profileOverlay'));
  $('#adminMenu').addEventListener('click',()=>{closeMenu();openAdmin()});
  async function openAdmin(){const u=currentUser||local.get('angelitoUser',{});if(u.email?.toLowerCase()!==CONFIG.adminEmail)return showToast('Área restringida.');$('#adminOverlay').classList.add('open');await loadAdmin();}
  $('#refreshAdmin').addEventListener('click',loadAdmin);$('#adminSearch').addEventListener('input',loadAdmin);
  async function loadAdmin(){let rows=[];let acts=[];if(firebaseReady&&db){try{const snap=await db.collection('users').orderBy('lastLoginAt','desc').limit(100).get();rows=snap.docs.map(d=>({id:d.id,...d.data()}));const a=await db.collection('activity').orderBy('createdAt','desc').limit(250).get();acts=a.docs.map(d=>d.data());}catch(e){console.warn(e)}}else{rows=local.get('angelitoDemoUsers',[]);acts=local.get('angelitoLocalInteractions',[]).map(x=>({email:x.email,name:x.name,type:x.type,createdAt:x.at}));}
    const q=$('#adminSearch').value.toLowerCase();if(q)rows=rows.filter(r=>(r.email+' '+r.name).toLowerCase().includes(q));$('#adminUsers').textContent=rows.length;$('#adminInteractions').textContent=acts.length;$('#adminSelections').textContent=acts.filter(a=>a.type==='selection_add').length;$('#adminTable').innerHTML=rows.map(r=>{const count=acts.filter(a=>a.email===r.email).length;const date=r.lastLoginAt?.toDate?r.lastLoginAt.toDate().toLocaleString('es-MX'):r.lastLoginAt||'—';return `<tr><td><strong>${esc(r.name||'Sin nombre')}</strong></td><td>${esc(r.email||'')}</td><td><small>${esc(date)}</small></td><td><strong>${count}</strong></td></tr>`}).join('');$('#adminEmpty').style.display=rows.length?'none':'block';}
  function track(type,productId=''){
    const u=currentUser||local.get('angelitoUser',{});if(!u.email)return;const record={uid:u.uid||'local',email:u.email,name:u.displayName||u.email.split('@')[0],type,productId,at:new Date().toLocaleString('es-MX')};const localActs=local.get('angelitoLocalInteractions',[]);localActs.unshift(record);local.set('angelitoLocalInteractions',localActs.slice(0,300));
    if(!firebaseReady||!db)return;
    db.collection('activity').add({uid:u.uid,email:u.email,name:record.name,type,productId,createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
  }
  // Demo admin list: current users entered locally.
  function rememberDemoUser(){if(firebaseReady||!currentUser?.email)return;const arr=local.get('angelitoDemoUsers',[]);const i=arr.findIndex(x=>x.email===currentUser.email);const u={uid:currentUser.uid,email:currentUser.email,name:currentUser.displayName||currentUser.email.split('@')[0],lastLoginAt:new Date().toLocaleString('es-MX')};if(i>=0)arr[i]=u;else arr.unshift(u);local.set('angelitoDemoUsers',arr.slice(0,100));}

  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeOverlay(b.dataset.close)));
  function closeOverlay(id){$('#'+id)?.classList.remove('open');if(id==='productModal')stopSpin();if(!$$('.overlay.open').length)document.body.classList.remove('lock')}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.overlay.open').forEach(x=>x.classList.remove('open'));closeSelection();closeMenu();document.body.classList.remove('lock')}});
  document.addEventListener('mousemove',e=>{const g=$('#cursorGlow');if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'}});
  function observeReveals(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});$$('.reveal').forEach(x=>io.observe(x));}

  (async()=>{await loadProducts();await buildPdfCatalog();renderAll();observeReveals();updateSelection();rememberDemoUser();const hash=new URLSearchParams(location.hash.replace('#','?'));const pid=hash.get('product');if(pid){const target=pdfCatalogProducts.find(p=>p.id===pid)||products.find(p=>p.id===pid);if(target)setTimeout(()=>openProduct(target),700);}})();
})();

/* V10 — interaction polish */
(()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  // Magnetic buttons / subtle tilt, disabled on coarse pointers for stability.
  const fine=matchMedia('(pointer:fine)').matches;
  if(fine){
    $$('.magnetic,.primary-btn,.carousel-open-btn').forEach(el=>{
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/r.width;const y=(e.clientY-r.top-r.height/2)/r.height;el.style.transform=`translate(${x*5}px,${y*4}px)`});
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });
    $$('.product-card,.pdf-catalog-card,.showcase-card,.category-chip').forEach(el=>{
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(800px) rotateX(${-y*2.5}deg) rotateY(${x*3}deg) translateY(-5px)`});
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });
  }
  // Section-aware active navigation.
  const links=$$('.main-nav a'); const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-30% 0px -55% 0px',threshold:0});sections.forEach(s=>io.observe(s));}
  // Smooth page transition for internal navigation.
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');const t=document.querySelector(id);if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'',id)}}));
  // Double tap/click on the product viewer resets its orientation.
  const viewer=$('#viewer');
  if(viewer){let last=0;viewer.addEventListener('pointerup',()=>{const now=Date.now();if(now-last<280){window.viewerRotX=0;window.viewerRotY=0;try{const o=$('#viewerObject');o.style.transform='translateZ(0) rotateX(0deg) rotateY(0deg) scale(1)'}catch{} }last=now});}
  // Image reveal for lazy-loaded catalog imagery.
  const imgObs='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('img-ready');imgObs.unobserve(e.target)}}),{rootMargin:'120px'}):null;
  if(imgObs) $$('img[loading="lazy"]').forEach(i=>{i.classList.add('img-loading');imgObs.observe(i)});
  // Haptic feedback on primary touch controls when supported.
  $$('button,.filter,.category-chip').forEach(b=>b.addEventListener('click',()=>{if(navigator.vibrate)navigator.vibrate(8)},{passive:true}));
})();

/* V15 — music fallback for mobile autoplay policies */
(()=>{const audio=document.querySelector('#storeAudio');if(!audio)return;
 const unlock=()=>{if(document.querySelector('#app')?.classList.contains('is-hidden'))return;if(audio.paused)audio.play().then(()=>document.querySelector('#soundToggle')?.classList.add('on')).catch(()=>{});};
 ['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,unlock,{passive:true}));
})();
