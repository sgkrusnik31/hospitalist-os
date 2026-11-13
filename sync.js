'use strict';
/* Optional patient-free offline-first cloud sync. Backend is user-provisioned Supabase. */
(()=>{
 const K='hospitalist-os-sync-v1', BASE='hospitalist-os-sync-baseline-v1', AUTH='hospitalist-os-sync-auth-v1';
 const lists=['shifts','work','billing','gme'];
 const el=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x));
 let config={}, session=null, base=null, busy=false, timer=null, conflict=null, active=false;
 const stamp=(msg,bad=false)=>{const e=el('sync-status');if(e){e.textContent=msg;e.style.color=bad?'#ffb4b9':'#a8d7ff';}};
 const norm=x=>{const v=window.HospitalistData.sanitize(x);return Object.fromEntries(lists.map(k=>[k,v[k]]));};
 const canon=x=>JSON.stringify(x);
 const empty=()=>Object.fromEntries(lists.map(k=>[k,[]]));
 const records=(v,k)=>new Map((v[k]||[]).map(x=>[x.id,x]));
 const eq=(a,b)=>canon(a)===canon(b);
 const isEmpty=s=>lists.every(k=>!(s[k]||[]).length);
 function merge3(b,l,r){const out=empty(),bad=[];
  for(const key of lists){const bmap=records(b,key),lm=records(l,key),rm=records(r,key);
   const ids=new Set([...bmap.keys(),...lm.keys(),...rm.keys()]);
   for(const id of ids){const x=bmap.get(id),y=lm.get(id),z=rm.get(id);let result;
    if(eq(y,z))result=y;
    else if(eq(y,x))result=z;
    else if(eq(z,x))result=y;
    else {bad.push(key+':'+id);continue;}
    if(result!==undefined)out[key].push(result);
   }
  }
  return {out, bad};
 }
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
 function persist(){localStorage.setItem(K,JSON.stringify(config));localStorage.setItem(AUTH,JSON.stringify(session));localStorage.setItem(BASE,JSON.stringify(base));}
 function showConflicts(on){['sync-resolve-local','sync-resolve-cloud'].forEach(x=>{el(x).hidden=!on;});}
 function configOK(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key||'');}
 function headers(token){const h={'apikey':config.key,'Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;return h;}
 async function api(path,opts={}){const res=await fetch(config.url.replace(/\/$/,'')+path,{...opts,headers:{...headers(session?.access_token),...(opts.headers||{})},cache:'no-store'});
  let data;const s=await res.text();try{data=s?JSON.parse(s):null}catch{data=s}
  if(!res.ok){const msg=typeof data==='object'?(data?.msg||data?.message||data?.error_description||data?.error||data?.details):data;throw new Error(String(msg||'HTTP '+res.status).slice(0,200));}
  return data;
 }
 async function refresh(){if(!session?.refresh_token)throw Error('Sign in first');
  const data=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
  session=data;persist();return session;
 }
 async function authed(path,options={}){
  if(!session?.access_token)throw Error('Sign in first');
  if(session.expires_at && session.expires_at*1000 < Date.now()+60000)await refresh();
  try{return await api(path,options)}catch(e){if(/jwt|token|expired|401/i.test(e.message)){await refresh();return api(path,options)}throw e;}
 }
 async function pull(){const rows=await authed('/rest/v1/hospitalist_os_snapshots?select=revision,payload&limit=1');return rows?.length?{revision:rows[0].revision,payload:norm(rows[0].payload)}:{revision:0,payload:empty()};}
 async function push(expected,payload){const revision=await authed('/rest/v1/rpc/hospitalist_os_save_snapshot',{method:'POST',body:JSON.stringify({expected_revision:expected,new_payload:payload})});return Number(revision);}
 function local(){return norm(window.HospitalistData.get());}
 function commitCloud(data,revision){base={revision,payload:clone(data)};persist();}
 function applyLocal(data){window.HospitalistData.set(data);}
 function saveConfig(){config={url:el('sync-url').value.trim().replace(/\/$/,''),key:el('sync-key').value.trim()};if(!configOK()){stamp('Enter the Supabase project URL and sb_publishable_ key. Never use a secret key.',true);return;}persist();stamp('Settings saved. Sign in or create an account.');}
 async function signUp(){if(!configOK())return stamp('Save valid project settings first.',true);
  const email=el('sync-email').value.trim(),password=el('sync-password').value;
  if(password.length<12)return stamp('Use a password with at least 12 characters.',true);
  try{const data=await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
   if(data.access_token){session=data;persist();await synchronize();}else stamp('Account created. Check email for verification, then sign in.');
  }catch(e){stamp('Account setup failed: '+e.message,true);}finally{el('sync-password').value='';}
 }
 async function signIn(){if(!configOK())return stamp('Save valid project settings first.',true);
  const email=el('sync-email').value.trim(),password=el('sync-password').value;
  try{session=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
   persist();await synchronize();
  }catch(e){stamp('Sign-in failed: '+e.message,true);}finally{el('sync-password').value='';}
 }
 async function synchronize(){if(busy||!configOK()||!session||!navigator.onLine)return;
  busy=true;try{
   stamp('Syncing…');
   // Snapshot data at start. If a user edits while uploading, a queued sync follows.
   const snapshot=local(), remote=await pull();
   let next;
   if(!base){
    // Never automatically replace nonempty, independently created device datasets.
    if(!isEmpty(snapshot)&&!isEmpty(remote.payload)&&!eq(snapshot,remote.payload)){
     conflict={local:snapshot,remote,kind:'first'};showConflicts(true);stamp('Both devices contain records. Export backups, then choose which copy to keep.',true);return;
    }
    next=isEmpty(snapshot)?remote.payload:snapshot;
   }else{
    const m=merge3(base.payload,snapshot,remote.payload);
    if(m.bad.length){conflict={local:snapshot,remote,kind:'edit'};showConflicts(true);stamp(`${m.bad.length} record conflict(s). Export backups, then resolve.`,true);return;}
    next=m.out;
   }
   if(!eq(next,remote.payload)){
    let rev;try{rev=await push(remote.revision,next)}catch(e){if(/revision|conflict|40001|changed/i.test(e.message)){stamp('Cloud changed during upload. Retrying…');return;}throw e;}
    commitCloud(next,rev);
   }else commitCloud(next,remote.revision);
   // Never discard changes made while request was in flight.
   if(eq(local(),snapshot)){if(!eq(next,snapshot))applyLocal(next);stamp('Synced • '+new Date().toLocaleTimeString());}
   else{stamp('Saved locally; additional changes pending sync.');setTimeout(()=>synchronize(),1200);}
   conflict=null;showConflicts(false);
  }catch(e){stamp('Offline or sync error: '+e.message+'. Local entries are safe.',true);}finally{busy=false;}
 }
 async function resolve(which){if(!conflict)return;
  if(!confirm('Export a JSON backup from Settings first. Replace the '+(which==='cloud'?'local':'cloud')+' copy with the selected version?'))return;
  const pick=which==='cloud'?conflict.remote.payload:conflict.local;
  try{
   if(which==='local'){
    const fresh=await pull();if(fresh.revision!==conflict.remote.revision){stamp('Cloud changed again; sync and review before resolving.',true);return;}
    const rev=await push(fresh.revision,pick);commitCloud(pick,rev);
   }else commitCloud(pick,conflict.remote.revision);
   applyLocal(pick);conflict=null;showConflicts(false);stamp('Conflict resolved. Synced copy selected.');
  }catch(e){stamp('Unable to resolve conflict: '+e.message,true);}
 }
 function onLocalChange(){if(!configOK()||!session)return;stamp(navigator.onLine?'Local changes pending sync…':'Saved offline — sync resumes online.');clearTimeout(timer);timer=setTimeout(synchronize,1300);}
 function init(){config=read(K,{});session=read(AUTH,null);base=read(BASE,null);el('sync-url').value=config.url||'';el('sync-key').value=config.key||'';
  el('sync-config-save').onclick=saveConfig;
  el('sync-config-clear').onclick=()=>{if(!confirm('Remove sync settings from this device? Local entries remain.'))return;config={};session=null;base=null;persist();el('sync-url').value='';el('sync-key').value='';stamp('Connection removed; local records retained.');};
  el('sync-signup').onclick=signUp;el('sync-signin').onclick=signIn;
  el('sync-signout').onclick=()=>{session=null;base=null;persist();stamp('Signed out. Local entries remain on this device.');};
  el('sync-now').onclick=()=>synchronize();el('sync-resolve-local').onclick=()=>resolve('local');el('sync-resolve-cloud').onclick=()=>resolve('cloud');
  if(configOK()&&session){stamp('Signed in. Attempting sync…');synchronize();}else stamp('Not connected. Local-only mode.');
  window.addEventListener('online',synchronize);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)synchronize();});
  setInterval(()=>{if(!document.hidden)synchronize()},60000);
 }
 window.HospitalistSync={onLocalChange,sync:synchronize};init();
})();
