/* ThaiPrint - Main JS */

// ============ CONFIG ============
// ใส่ URL ที่ได้จาก Google Apps Script Deploy ตรงนี้
const APPS_SCRIPT_URL = '';
// ================================

const DB={get(k,f=[]){try{return JSON.parse(localStorage.getItem('tp_'+k))||f}catch{return f}},set(k,v){localStorage.setItem('tp_'+k,JSON.stringify(v))}};

// Navbar scroll
const navbar=document.getElementById('navbar');
if(navbar)window.addEventListener('scroll',()=>navbar.classList.toggle('scrolled',window.scrollY>20));

// Mobile menu
const hamburger=document.getElementById('hamburger'),navLinks=document.getElementById('navLinks');
if(hamburger&&navLinks){
  hamburger.addEventListener('click',()=>{
    navLinks.classList.toggle('open');
    const s=hamburger.querySelectorAll('span');
    if(navLinks.classList.contains('open')){s[0].style.transform='rotate(45deg) translate(5px,5px)';s[1].style.opacity='0';s[2].style.transform='rotate(-45deg) translate(5px,-5px)'}
    else s.forEach(x=>{x.style.transform='';x.style.opacity=''});
  });
  navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navLinks.classList.remove('open');hamburger.querySelectorAll('span').forEach(x=>{x.style.transform='';x.style.opacity=''})}));
}

// Inquiry form
const form=document.getElementById('inquiryForm');
if(form)form.addEventListener('submit',async function(e){
  e.preventDefault();

  const btn=this.querySelector('.btn-sub');
  const origText=btn.textContent;
  btn.textContent='กำลังส่ง...';
  btn.disabled=true;

  const fd=new FormData(this);
  const inquiry={
    id:Date.now(),
    name:fd.get('name'),
    company:fd.get('company')||'-',
    email:fd.get('email'),
    phone:fd.get('phone'),
    type:fd.get('inquiryType'),
    message:fd.get('message')||'-',
    status:'pending',
    date:new Date().toISOString()
  };

  // บันทึก localStorage (สำหรับ Admin Dashboard)
  const leads=DB.get('leads');leads.unshift(inquiry);DB.set('leads',leads);
  const a=DB.get('analytics',{});a[inquiry.type]=(a[inquiry.type]||0)+1;DB.set('analytics',a);

  // ส่งไป Google Apps Script (ถ้ามี URL)
  if(APPS_SCRIPT_URL){
    try{
      await fetch(APPS_SCRIPT_URL,{
        method:'POST',
        mode:'no-cors',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(inquiry)
      });
    }catch(err){
      console.warn('Apps Script error:',err);
    }
  }

  btn.textContent=origText;
  btn.disabled=false;
  showSuccess();
  this.reset();
});

// Success overlay
function showSuccess(){const o=document.getElementById('successOverlay');if(o){o.classList.add('show');document.body.style.overflow='hidden'}}
function closeSuccess(){const o=document.getElementById('successOverlay');if(o){o.classList.remove('show');document.body.style.overflow=''}}
window.closeSuccess=closeSuccess;
const sucOv=document.getElementById('successOverlay');
if(sucOv)sucOv.addEventListener('click',function(e){if(e.target===this)closeSuccess()});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',function(e){const t=document.querySelector(this.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}}));

// Scroll reveal
const obs=new IntersectionObserver(entries=>{entries.forEach(en=>{if(en.isIntersecting){en.target.style.opacity='1';en.target.style.transform='translateY(0)';obs.unobserve(en.target)}})},{threshold:.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.svc-card,.port-item,.c-info-item,.a-feat').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(30px)';el.style.transition='opacity .6s ease,transform .6s ease';obs.observe(el)});
