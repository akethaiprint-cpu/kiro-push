/* ThaiPrint Admin Dashboard JS */
const DB={get(k,f){try{const v=localStorage.getItem('tp_'+k);return v?JSON.parse(v):(f!==undefined?f:[])}catch{return f!==undefined?f:[]}},set(k,v){localStorage.setItem('tp_'+k,JSON.stringify(v))}};
const TL={interested:'สนใจบริการ',quote:'สอบถามราคา',issue:'แจ้งปัญหา',partner:'ร่วมงานกับเรา'};
const SL={pending:'รอดำเนินการ',contacted:'ติดต่อแล้ว',closed:'ปิดการขาย'};
const BC=['blue','green','orange','red'];
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmtDate(iso){if(!iso)return'-';return new Date(iso).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}

// Navigation
document.querySelectorAll('.admin-nav a[data-page]').forEach(link=>{
  link.addEventListener('click',function(e){
    e.preventDefault();const pg=this.dataset.page;
    document.querySelectorAll('.admin-nav a').forEach(a=>a.classList.remove('active'));this.classList.add('active');
    document.querySelectorAll('.admin-page').forEach(p=>p.style.display='none');
    const el=document.getElementById('page-'+pg);if(el)el.style.display='block';
    document.getElementById('pageTitle').textContent={dashboard:'Dashboard',leads:'Lead Management',content:'Content Editor',analytics:'Analytics',pricing:'จัดการราคา'}[pg]||pg;
    if(pg==='dashboard')refreshDash();if(pg==='leads')refreshLeads();if(pg==='analytics')refreshAnalytics();if(pg==='content')loadEditor();if(pg==='pricing'&&typeof AdminPricing!=='undefined')AdminPricing.init();
  });
});

// Dashboard
function refreshDash(){
  const leads=DB.get('leads');
  document.getElementById('totalLeads').textContent=leads.length;
  document.getElementById('pendingLeads').textContent=leads.filter(l=>l.status==='pending').length;
  document.getElementById('contactedLeads').textContent=leads.filter(l=>l.status==='contacted').length;
  document.getElementById('closedLeads').textContent=leads.filter(l=>l.status==='closed').length;
  const tb=document.getElementById('recentLeadsBody');
  if(!leads.length){tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--g400);padding:40px">ยังไม่มีข้อมูลผู้ติดต่อ</td></tr>';return}
  tb.innerHTML=leads.slice(0,5).map(l=>`<tr><td><strong>${esc(l.name)}</strong></td><td>${TL[l.type]||l.type}</td><td>${fmtDate(l.date)}</td><td><span class="badge ${l.status}" onclick="cycleStatus(${l.id})">${SL[l.status]}</span></td></tr>`).join('');
}

// Leads
function refreshLeads(search='',sf=''){
  let leads=DB.get('leads');
  if(search){const q=search.toLowerCase();leads=leads.filter(l=>l.name.toLowerCase().includes(q)||l.email.toLowerCase().includes(q)||(l.company&&l.company.toLowerCase().includes(q)))}
  if(sf)leads=leads.filter(l=>l.status===sf);
  const tb=document.getElementById('allLeadsBody');
  if(!leads.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--g400);padding:40px">ไม่พบข้อมูล</td></tr>';return}
  tb.innerHTML=leads.map(l=>`<tr><td><strong>${esc(l.name)}</strong></td><td>${esc(l.company)}</td><td>${esc(l.email)}</td><td>${esc(l.phone)}</td><td>${TL[l.type]||l.type}</td><td>${fmtDate(l.date)}</td><td><span class="badge ${l.status}" onclick="cycleStatus(${l.id})">${SL[l.status]}</span></td></tr>`).join('');
}
const si=document.getElementById('searchLeads'),fs=document.getElementById('filterStatus');
if(si)si.addEventListener('input',()=>refreshLeads(si.value,fs?fs.value:''));
if(fs)fs.addEventListener('change',()=>refreshLeads(si?si.value:'',fs.value));

// Status cycle
function cycleStatus(id){
  const leads=DB.get('leads'),l=leads.find(x=>x.id===id);if(!l)return;
  const o=['pending','contacted','closed'];l.status=o[(o.indexOf(l.status)+1)%3];
  DB.set('leads',leads);refreshDash();refreshLeads(si?si.value:'',fs?fs.value:'');
}

// Analytics
function refreshAnalytics(){
  const leads=DB.get('leads'),a={};
  leads.forEach(l=>{a[l.type]=(a[l.type]||0)+1});
  document.getElementById('analyticsTotal').textContent=leads.length;
  const now=new Date();
  document.getElementById('analyticsMonth').textContent=leads.filter(l=>{const d=new Date(l.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length;
  const ch=document.getElementById('analyticsChart'),tot=leads.length||1,entries=Object.entries(a).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){ch.innerHTML='<p style="color:var(--g400);text-align:center;padding:40px">ยังไม่มีข้อมูล</p>';return}
  ch.innerHTML=entries.map(([t,c],i)=>{const p=Math.round(c/tot*100);return`<div class="bar-item"><div class="bar-label">${TL[t]||t}</div><div class="bar-track"><div class="bar-fill ${BC[i%4]}" style="width:${p}%">${p}%</div></div><div class="bar-count">${c}</div></div>`}).join('');
}

// Content Editor
function loadEditor(){
  const c=DB.get('siteContent',{});
  if(c.companyName)document.getElementById('editCompanyName').value=c.companyName;
  if(c.slogan)document.getElementById('editSlogan').value=c.slogan;
  if(c.phone)document.getElementById('editPhone').value=c.phone;
  if(c.email)document.getElementById('editEmail').value=c.email;
  if(c.address)document.getElementById('editAddress').value=c.address;
  if(c.bannerUrl)document.getElementById('editBannerUrl').value=c.bannerUrl;
  if(c.heroTitle)document.getElementById('editHeroTitle').value=c.heroTitle;
  if(c.heroDesc)document.getElementById('editHeroDesc').value=c.heroDesc;
  const svcs=c.services||[
    {name:'พิมพ์สติ๊กเกอร์',desc:'สติ๊กเกอร์ทุกชนิด กระดาษ PVC PP PET'},
    {name:'ฉลากสินค้า',desc:'ออกแบบและพิมพ์ฉลากสินค้าคุณภาพสูง'},
    {name:'กล่องบรรจุภัณฑ์',desc:'กล่องสบู่ เครื่องสำอาง สินค้าทั่วไป'},
    {name:'ออกแบบกราฟิก',desc:'บริการออกแบบฉลาก กล่อง สิ่งพิมพ์ทุกชนิด'},
    {name:'พิมพ์ออฟเซ็ท',desc:'โบรชัวร์ แคตตาล็อก ใบปลิว แผ่นพับ'},
    {name:'งานพิเศษ',desc:'เคลือบเงา เคลือบด้าน ปั๊มเค ปั๊มนูน Spot UV'}
  ];
  document.getElementById('servicesEditor').innerHTML=svcs.map((s,i)=>`<div class="ed-row" style="margin-bottom:12px"><div class="ed-field" style="margin-bottom:0"><label>ชื่อบริการ ${i+1}</label><input type="text" class="svc-n" value="${esc(s.name)}"></div><div class="ed-field" style="margin-bottom:0"><label>รายละเอียด</label><input type="text" class="svc-d" value="${esc(s.desc)}"></div></div>`).join('');
}
function saveCompanyInfo(){const c=DB.get('siteContent',{});c.companyName=document.getElementById('editCompanyName').value;c.slogan=document.getElementById('editSlogan').value;c.phone=document.getElementById('editPhone').value;c.email=document.getElementById('editEmail').value;c.address=document.getElementById('editAddress').value;DB.set('siteContent',c);toast('บันทึกข้อมูลบริษัทเรียบร้อย')}
function saveBannerInfo(){const c=DB.get('siteContent',{});c.bannerUrl=document.getElementById('editBannerUrl').value;c.heroTitle=document.getElementById('editHeroTitle').value;c.heroDesc=document.getElementById('editHeroDesc').value;DB.set('siteContent',c);toast('บันทึก Banner เรียบร้อย')}
function saveServices(){const c=DB.get('siteContent',{});const n=document.querySelectorAll('.svc-n'),d=document.querySelectorAll('.svc-d');c.services=Array.from(n).map((x,i)=>({name:x.value,desc:d[i]?d[i].value:''}));DB.set('siteContent',c);toast('บันทึกบริการเรียบร้อย')}

function toast(msg){
  let t=document.getElementById('adminToast');
  if(!t){t=document.createElement('div');t.id='adminToast';t.style.cssText='position:fixed;bottom:24px;right:24px;background:#10b981;color:#fff;padding:14px 28px;border-radius:12px;font-weight:600;font-size:.9rem;z-index:9999;opacity:0;transform:translateY(20px);transition:all .3s ease;box-shadow:0 4px 20px rgba(0,0,0,.15)';document.body.appendChild(t)}
  t.textContent=msg;t.style.opacity='1';t.style.transform='translateY(0)';
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(20px)'},3000);
}

window.cycleStatus=cycleStatus;window.saveCompanyInfo=saveCompanyInfo;window.saveBannerInfo=saveBannerInfo;window.saveServices=saveServices;
refreshDash();
