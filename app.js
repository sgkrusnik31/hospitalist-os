'use strict';
// Clinical-only v1.4. Legacy data is read once and only non-financial fields are copied.
const KEY = 'hospitalist-os-clinical-v1', LEGACY_KEY = 'hospitalist-os-v1';
const $ = id => document.getElementById(id);
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const num = x => Number(x)||0;
const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => globalThis.crypto?.randomUUID?.() || String(Date.now())+Math.random().toString(36).slice(2);
const cleanString=(s,n=180)=>String(s??'').slice(0,n);
const newDB=()=>({version:4,shifts:[],work:[],billing:[],gme:[]});
const permitted=['shifts','work','billing','gme'];
function sanitize(raw){
 const result=newDB();
 if(!raw||typeof raw!=='object')return result;
 for(const name of permitted){
   if(!Array.isArray(raw[name]))continue;
   result[name]=raw[name].slice(0,25000).filter(x=>x&&typeof x==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')).map(x=>{
     const base={id:cleanString(x.id||uid(),80),date:x.date};
     if(name==='shifts')return {...base,type:['regular','extra','call','off'].includes(x.type)?x.type:'regular',start:cleanString(x.start||'07:00',5),end:cleanString(x.end||'19:00',5),actual:Math.max(0,num(x.actual)),paid:Math.max(0,num(x.paid)),note:cleanString(x.note)};
     if(name==='work')return {...base,census:Math.max(0,num(x.census)),admits:Math.max(0,num(x.admits)),discharges:Math.max(0,num(x.discharges)),residents:Math.max(0,num(x.residents)),interns:Math.max(0,num(x.interns))};
     if(name==='billing')return {...base,code:cleanString(x.code,12),desc:cleanString(x.desc,90),units:Math.max(0,num(x.units)),value:Math.max(0,num(x.value)),mod:cleanString(x.mod,60)};
     return {...base,type:cleanString(x.type,80),start:cleanString(x.start,5),end:cleanString(x.end,5),break:Math.max(0,num(x.break)),hours:Math.max(0,num(x.hours)),note:cleanString(x.note,160)};
   });
 }
 return result;
}
let db;
try{
 let current=localStorage.getItem(KEY);
 db=sanitize(current?JSON.parse(current):JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}'));
 if(!current)localStorage.setItem(KEY,JSON.stringify(db));
}catch(e){db=newDB();}
let shownMonth=new Date();shownMonth.setDate(1);
const sum=(rows,f)=>rows.reduce((t,x)=>t+f(x),0);
const sorted=rows=>[...rows].sort((a,b)=>b.date.localeCompare(a.date));
const hours=(start,end)=>{if(!start||!end)return 0;const [h1,m1]=start.split(':').map(Number),[h2,m2]=end.split(':').map(Number);let t=h2*60+m2-h1*60-m1;return (t<0?t+1440:t)/60;};
const month=()=>today().slice(0,7);
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));render();window.HospitalistSync?.onLocalChange?.();}catch(e){alert('Could not save locally. Export a backup and check available storage.');}}
function goto(view){
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===view));
 document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
 const title={dashboard:['Overview','Workload at a glance'],calendar:['Shift Calendar','Shift blocks, home call and post-call'],shifts:['Time & Workload','Operational tracking only'],billing:['CPT & wRVUs','Units and coding productivity — no compensation'],gme:['GME Hours','Teaching, supervision and academic time'],notes:['Note Builder','Generic patient-free templates'],settings:['Settings & Backup','Local storage and data export']};
 if(title[view]){$('page-title').textContent=title[view][0];$('page-sub').textContent=title[view][1];}
 render();window.scrollTo({top:0});
}
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>goto(b.dataset.view)));
function render(){
 const ss=db.shifts.filter(x=>x.date.startsWith(month())),ww=db.work.filter(x=>x.date.startsWith(month())),bb=db.billing.filter(x=>x.date.startsWith(month()));
 $('month-pill').textContent=new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('m-shifts').textContent=ss.filter(s=>s.type!=='off').length;
 $('m-hours').textContent=`${sum(ss,s=>num(s.actual)).toFixed(1)} / ${sum(ss,s=>num(s.paid)).toFixed(1)}`;
 $('m-admits').textContent=`${sum(ww,w=>num(w.admits))} / ${sum(bb,b=>num(b.units))}`;
 $('m-rvu').textContent=sum(bb,b=>num(b.units)*num(b.value)).toFixed(2);
 const work=sorted(db.work).slice(0,7).reverse(),max=Math.max(1,...work.map(x=>num(x.admits)));
 $('work-chart').innerHTML=work.length?work.map(x=>`<div class="barcol"><b>${num(x.admits)}</b><div class="bar" style="height:${Math.max(3,Math.round(num(x.admits)/max*100))}%"></div><span class="barlabel">${esc(x.date.slice(5))}</span></div>`).join(''):'<p class="help">No workload entries yet.</p>';
 renderCalendar();renderShifts();renderBilling();renderGME();
}
function changeMonth(delta,reset=false){shownMonth=reset?new Date():new Date(shownMonth.getFullYear(),shownMonth.getMonth()+delta,1);shownMonth.setDate(1);renderCalendar();}
function renderCalendar(){
 const y=shownMonth.getFullYear(),m=shownMonth.getMonth(),first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate();
 $('cal-month').textContent=shownMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const shiftMap={},restrictions=new Set();
 for(const s of db.shifts){(shiftMap[s.date]??=[]).push(s.type);if(s.type==='call'){
  const end=new Date(`${s.date}T12:00:00`);end.setDate(end.getDate()+1);
  for(let i=0;i<2;i++){const d=new Date(end);d.setDate(end.getDate()+i);restrictions.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}
 }}
 let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="dow">${x}</div>`).join('');
 for(let n=0;n<first;n++)html+='<div class="day fade"></div>';
 for(let n=1;n<=total;n++){
  const date=`${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  const tags=(shiftMap[date]||[]).map(x=>`<div class="event ${esc(x)}">${x==='call'?'Home call':x==='extra'?'Extra':x==='off'?'Off':'Regular'}</div>`).join('');
  html+=`<div class="day ${date===today()?'today':''}"><b class="num">${n}</b>${tags}${restrictions.has(date)?'<div class="event restrict">Post-call</div>':''}</div>`;
 }
 $('cal-grid').innerHTML=html;
}
function resetShift(){$('shift-form').reset();$('shift-id').value='';$('shift-date').value=today();$('shift-start').value='07:00';$('shift-end').value='19:00';updateOffFields();}
function resetWork(){$('work-form').reset();$('work-id').value='';$('work-date').value=today();}
function resetBill(){$('bill-form').reset();$('bill-id').value='';$('bill-date').value=today();updateCPTSelection();}
function resetGME(){$('gme-form').reset();$('gme-id').value='';$('gme-date').value=today()<'2026-12-01'?'2026-12-01':today();$('gme-start').value='12:00';$('gme-end').value='13:00';$('gme-break').value=0;updateGMEHours();}
function updateOffFields(){const off=$('shift-type').value==='off';for(const id of ['shift-start','shift-end','shift-actual','shift-paid']){$(id).disabled=off;}if(off){$('shift-start').value='';$('shift-end').value='';$('shift-actual').value='0';$('shift-paid').value='0';}}
$('shift-type').addEventListener('change',()=>{if($('shift-type').value==='call'){$('shift-start').value='19:00';$('shift-end').value='07:00';}else if($('shift-type').value!=='off'){$('shift-start').value='07:00';$('shift-end').value='19:00';}updateOffFields();});
function actionButtons(name,id){const a=esc(id);return `<button class="btn small" data-action="edit" data-list="${name}" data-id="${a}">Edit</button> <button class="btn small danger" data-action="delete" data-list="${name}" data-id="${a}">×</button>`;}
function renderShifts(){
 $('shift-rows').innerHTML=sorted(db.shifts).map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.type)}</td><td>${s.type==='off'?'—':`${esc(s.start)}–${esc(s.end)} (${hours(s.start,s.end).toFixed(1)}h)`}</td><td>${num(s.actual).toFixed(2)}</td><td>${num(s.paid).toFixed(2)}</td><td>${(num(s.paid)-num(s.actual)).toFixed(2)}</td><td>${actionButtons('shifts',s.id)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No shifts recorded.</td></tr>';
 $('work-rows').innerHTML=sorted(db.work).map(w=>`<tr><td>${esc(w.date)}</td><td>${num(w.census)}</td><td>${num(w.admits)}</td><td>${num(w.discharges)}</td><td>${num(w.residents)}</td><td>${actionButtons('work',w.id)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No workload entries recorded.</td></tr>';
}
$('shift-form').onsubmit=e=>{e.preventDefault();const isOff=$('shift-type').value==='off';const x={id:$('shift-id').value||uid(),date:$('shift-date').value,type:$('shift-type').value,start:isOff?'':$('shift-start').value,end:isOff?'':$('shift-end').value,actual:isOff?0:num($('shift-actual').value),paid:isOff?0:num($('shift-paid').value),note:cleanString($('shift-note').value)};db.shifts=db.shifts.filter(s=>s.id!==x.id);db.shifts.push(x);resetShift();save();};
$('work-form').onsubmit=e=>{e.preventDefault();const x={id:$('work-id').value||uid(),date:$('work-date').value,census:num($('work-census').value),admits:num($('work-admits').value),discharges:num($('work-discharges').value),residents:num($('work-residents').value),interns:num($('work-interns').value)};db.work=db.work.filter(s=>s.id!==x.id);db.work.push(x);resetWork();save();};
function capAdvice(){let cap=Number($('work-interns').value)===2?20:Number($('work-interns').value)===1?14:0,c=num($('work-residents').value);$('cap-advice').textContent=cap?`Usual resident cap: ${cap} with ${$('work-interns').value} intern(s). ${c>cap?'Entered team census exceeds usual cap; verify staffing.':''}`:'No resident-team cap applied when there are no interns.';}
$('work-residents').addEventListener('input',capAdvice);$('work-interns').addEventListener('change',capAdvice);
// Preset values: 2026 work RVUs (not facility total RVUs), CMS/SGO 2026 E/M table.
const COMMON_CPT=[
 ['99221','Admission · low',1.63],['99222','Admission · moderate',2.60],['99223','Admission · high',3.50],
 ['99231','Follow-up · low',1.00],['99232','Follow-up · moderate',1.59],['99233','Follow-up · high',2.40],
 ['99234','Same-day admit/DC · low',2.00],['99235','Same-day admit/DC · moderate',3.24],['99236','Same-day admit/DC · high',4.30],
 ['99238','Discharge · ≤30 min',1.50],['99239','Discharge · >30 min',2.15],
 ['99291','Critical care · first 30–74 min',4.50],['99292','Critical care · additional time',2.25],
 ['99497','Advance care planning · first service',null],['99498','Advance care planning · additional',null],
 ['99406','Tobacco cessation · 3–10 min',null],['99407','Tobacco cessation · >10 min',null]
];
function selectCPT(code){
 const preset=COMMON_CPT.find(c=>c[0]===code);
 if(!preset){$('bill-code').value='';$('bill-desc').value='';$('bill-value').value='';updateCPTSelection();return;}
 $('bill-code').value=preset[0];$('bill-desc').value=preset[1];$('bill-value').value=preset[2]===null?'':preset[2].toFixed(2);updateCPTSelection();
}
function updateCPTSelection(){
 const code=$('bill-code').value.trim().toUpperCase(),preset=COMMON_CPT.find(x=>x[0]===code);
 $('cpt-status').textContent=preset?(preset[2]===null?'Verify this code’s current wRVU before saving.':`2026 work RVU: ${preset[2].toFixed(2)} per unit. Verify coding eligibility.`):'Select a code to autofill its description and wRVU.';
}
$('bill-code').innerHTML='<option value="">Choose a CPT / HCPCS code…</option>'+COMMON_CPT.map(([code,label,value])=>`<option value="${code}">${code} — ${esc(label)}${value===null?' · verify wRVU':' · '+value.toFixed(2)+' wRVU'}</option>`).join('');
$('bill-code').addEventListener('change',()=>selectCPT($('bill-code').value));
function renderBilling(){const m=$('bill-month-filter').value||month(),list=db.billing.filter(b=>b.date.startsWith(m));$('b-rvu').textContent=sum(list,b=>num(b.units)*num(b.value)).toFixed(2);$('billing-summary').innerHTML=`<div><b>${sum(list,b=>num(b.units))}</b><span>Encounters coded</span></div><div><b>${new Set(list.map(b=>b.date)).size}</b><span>Billing dates</span></div><div><b>${(sum(list,b=>num(b.units)*num(b.value))/Math.max(1,new Set(list.map(b=>b.date)).size)).toFixed(2)}</b><span>wRVU / billing day</span></div>`;$('bill-rows').innerHTML=sorted(list).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.code)}</td><td>${esc(x.desc)}</td><td>${num(x.units)}</td><td>${num(x.value).toFixed(2)}</td><td>${(num(x.units)*num(x.value)).toFixed(2)}</td><td>${actionButtons('billing',x.id)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No billing entries for this month.</td></tr>';}
$('bill-month-filter').addEventListener('change',renderBilling);
$('bill-form').onsubmit=e=>{e.preventDefault();let x={id:$('bill-id').value||uid(),date:$('bill-date').value,code:cleanString($('bill-code').value,12),desc:cleanString($('bill-desc').value,90),units:num($('bill-units').value),value:num($('bill-value').value),mod:cleanString($('bill-mod').value,60)};if(x.units<=0){alert('Enter a positive unit count.');return;}if(!$('bill-value').value.trim()){alert('Verify and enter the work RVU for this code before saving.');return;}db.billing=db.billing.filter(b=>b.id!==x.id);db.billing.push(x);resetBill();save();};
function gmeHours(start,end,breaks){return Math.max(0,hours(start,end)*60-num(breaks))/60;}
function updateGMEHours(){if($('gme-start').value&&$('gme-end').value)$('gme-hours').value=gmeHours($('gme-start').value,$('gme-end').value,$('gme-break').value).toFixed(2);}
['start','end','break'].forEach(k=>$('gme-'+k).addEventListener('change',updateGMEHours));
function renderGME(){const mm=db.gme.filter(x=>x.date.startsWith(month()));$('gme-month-hours').textContent=sum(mm,x=>num(x.hours)).toFixed(2);$('gme-all-hours').textContent=sum(db.gme,x=>num(x.hours)).toFixed(2);$('gme-rows').innerHTML=sorted(db.gme).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.type)}</td><td>${esc(x.start)}–${esc(x.end)}</td><td>${num(x.break)} min</td><td>${num(x.hours).toFixed(2)}</td><td>${esc(x.note)}</td><td>${actionButtons('gme',x.id)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No GME hours recorded.</td></tr>';}
$('gme-form').onsubmit=e=>{e.preventDefault();const x={id:$('gme-id').value||uid(),date:$('gme-date').value,type:$('gme-type').value,start:$('gme-start').value,end:$('gme-end').value,break:num($('gme-break').value),hours:num($('gme-hours').value),note:cleanString($('gme-note').value,160)};if(x.date<'2026-12-01'||x.hours<=0||x.hours>24){alert('Enter valid GME hours on or after December 1, 2026.');return;}if(x.hours>hours(x.start,x.end)||x.break>hours(x.start,x.end)*60){alert('Recorded hours cannot exceed the elapsed time; check breaks and time entry.');return;}db.gme=db.gme.filter(g=>g.id!==x.id);db.gme.push(x);resetGME();save();};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,list,id}=b.dataset;if(!permitted.includes(list))return;const x=db[list].find(z=>z.id===id);if(!x)return;
 if(action==='delete'){if(confirm('Delete this entry?')){db[list]=db[list].filter(z=>z.id!==id);save();}return;}
 const prefix={shifts:'shift',work:'work',billing:'bill',gme:'gme'}[list];goto({shifts:'shifts',work:'shifts',billing:'billing',gme:'gme'}[list]);
 const fields={shifts:['id','date','type','start','end','actual','paid','note'],work:['id','date','census','admits','discharges','residents','interns'],billing:['id','date','code','desc','units','value','mod'],gme:['id','date','type','start','end','break','hours','note']}[list];
 for(const k of fields){const input=$(prefix+'-'+k);if(input)input.value=x[k]??'';}if(list==='shifts')updateOffFields();if(list==='billing')updateCPTSelection();
});
const templates={
 hp:['HPI:\n[Presentation and pertinent clinical history; ED evaluation/interventions.]\n\nAssessment & Plan:\n1. [Problem] - [Evidence, clinical impression, treatment/workup]\n2. [Problem] - [Plan]\n\nDisposition: [Barriers / next steps]','Chief concern: [ ]\nHPI: [ ]\nPertinent studies: [ ]\nExam: [Observed findings only]\nAssessment/Plan:\n1. [Problem / reasoning / plan]\nDisposition: [ ]'],
 progress:['Interval events: [ ]\n\nAssessment & Plan:\n1. [Problem, status and changes]\n2. [Problem, status and changes]\n\nDischarge barriers: [ ]','Interval history: [ ]\nVitals/labs/imaging (pertinent only): [ ]\nExam (performed findings): [ ]\nA/P:\n1. [Problem / response / next steps]\nDisposition: [ ]'],
 dc:['Hospital Course:\n[Reason for admission]. [Key findings and consultant input]. [Treatment and clinical course]. [Discharge condition and confirmed plan].','Admission reason: [ ]\nHospital course: [Chronology, testing, treatment, response]\nDischarge condition: [ ]\nMedication changes: [Only verified changes]\nFollow-up/disposition: [Only confirmed details]'],
 ama:['Patient left against medical advice on [date/time]. [Document actual conversation, risks discussed, decision-making capacity assessment, alternatives offered, and actions taken. If unable to speak to patient, explicitly state that and do not fabricate counseling.]','Events: [ ]\nCapacity evaluation performed: [Findings or not evaluated]\nRisks/alternatives discussed: [Actual only]\nPatient response: [ ]\nDeparture / notifications: [Verified only]'],
 code:['Goals-of-care / code-status discussion:\nParticipants: [ ]\nDecision-making capacity / surrogate: [ ]\nTopics discussed: [ ]\nPatient/surrogate preference: [ ]\nTime personally spent in qualifying discussion: [Actual minutes, if applicable]','Date/participants: [ ]\nClinical context: [ ]\nPreferences and decisions: [ ]\nOrders confirmed: [ ]\nQualifying time: [Actual time only]'],
 cc:['Critical care attestation:\nCritical illness / imminent threat: [ ]\nPersonally performed critical-care interventions and decision making: [ ]\nExclusive critical-care time: [Verified minutes; exclude separately billable procedures and overlapping time].','Organ dysfunction and severity: [ ]\nInterventions: [ ]\nReassessments: [ ]\nIndependent clinical decision-making: [ ]\nExclusive personally provided critical-care time: [ ]'],
 smoke:['Tobacco cessation counseling:\nTobacco use discussed: [ ]\nCounseling and strategies provided: [ ]\nReadiness / resources offered: [ ]\nTime personally spent counseling: [Actual minutes].','Current tobacco use: [ ]\nRisks / benefits discussed: [ ]\nStrategies / medications / referral: [Only if actually discussed]\nTime: [Actual minutes]'],
 addendum:['Documentation addendum:\nCorrection or clarification: [ ]\nThis addendum reflects information known or action taken at [actual time, if applicable].','Original documentation issue: [ ]\nCorrection: [ ]\nSupporting facts: [ ]\nDate/time of addendum: [ ]']
};
function generateNote(){const v=$('note-type').value,structured=$('note-style').value==='full';$('note-preview').textContent=(templates[v]||templates.progress)[structured?1:0];}
async function copyNote(){const text=$('note-preview').textContent;if(!text)return;try{await navigator.clipboard.writeText(text);alert('Template copied.');}catch(e){alert('Clipboard permission denied. Select the text and copy manually.');}}
function download(filename,content,type){const b=new Blob([content],{type});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function downloadNote(){download('meditech-blank-template.txt',$('note-preview').textContent,'text/plain;charset=utf-8');}
function exportCSV(which){if(!permitted.includes(which))return;const cols={shifts:['date','type','start','end','actual','paid','note'],work:['date','census','admits','discharges','residents','interns'],billing:['date','code','desc','units','value','mod'],gme:['date','type','start','end','break','hours','note']}[which];const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const csv=[cols.map(q).join(','),...sorted(db[which]).map(x=>cols.map(c=>q(x[c])).join(','))].join('\r\n');download(`hospitalist-${which}-${today()}.csv`,'\uFEFF'+csv,'text/csv;charset=utf-8');}
function exportJSON(){download(`hospitalist-os-clinical-backup-${today()}.json`,JSON.stringify(db,null,2),'application/json');}
$('import-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const raw=JSON.parse(await f.text());if(!permitted.some(name=>Array.isArray(raw[name])))throw Error('Invalid backup format');if(!confirm('Replace your current clinical-only records with this backup? Existing records will be overwritten. Financial fields are always ignored.'))return;db=sanitize(raw);save();alert('Clinical records imported.');}catch(err){alert('Unable to import backup: '+err.message);}finally{e.target.value='';}});
function clearAll(){if(!confirm('Permanently erase this app’s clinical-only local records? Export a backup first.'))return;db=newDB();save();}
resetShift();resetWork();resetBill();resetGME();$('bill-month-filter').value=month();generateNote();capAdvice();render();

window.HospitalistData={get:()=>JSON.parse(JSON.stringify(db)), set:(raw)=>{db=sanitize(raw);localStorage.setItem(KEY,JSON.stringify(db));render();},sanitize};
