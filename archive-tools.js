// v25: Archiv-Einträge bearbeiten und löschen, ohne die bestehende Analyse-Logik anzufassen.
(()=>{
  const KEY='ma11', DB='ma11files';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const readData=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  const writeData=d=>localStorage.setItem(KEY,JSON.stringify(d));

  function deleteStoredFile(id){
    return new Promise(resolve=>{
      const r=indexedDB.open(DB,1);
      r.onerror=()=>resolve(false);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('f'))r.result.createObjectStore('f')};
      r.onsuccess=()=>{
        try{
          const tx=r.result.transaction('f','readwrite');
          tx.objectStore('f').delete(id);
          tx.oncomplete=()=>resolve(true);
          tx.onerror=()=>resolve(false);
        }catch{resolve(false)}
      };
    });
  }

  function getId(article){
    const b=[...article.querySelectorAll('button')].find(x=>(x.getAttribute('onclick')||'').includes('openPDF('));
    const m=(b?.getAttribute('onclick')||'').match(/openPDF\('([^']+)'\)/);
    return m?.[1]||'';
  }

  function ensureModal(){
    if($('editArchiveModal'))return;
    const modal=document.createElement('div');
    modal.id='editArchiveModal';
    modal.style.cssText='display:none;position:fixed;inset:0;background:#000b;z-index:10050;padding:12px;overflow:auto';
    modal.innerHTML=`<div style="max-width:640px;margin:18px auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 10px 40px #0006">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px"><h2 style="margin:0">✏️ Eintrag bearbeiten</h2><button id="editArchiveClose" class="btn" type="button">✕</button></div>
      <input id="editArchiveId" type="hidden">
      <label>Absender</label><input id="editName">
      <label>Betrag CHF</label><input id="editAmount" type="number" step=".01" inputmode="decimal">
      <div id="editMinimumWrap"><label>💳 Mindestbetrag CHF</label><input id="editMinimum" type="number" step=".01" inputmode="decimal"></div>
      <label>Fällig am</label><input id="editDue" type="date">
      <label>Rechnungsnummer</label><input id="editNo">
      <label>Kategorie</label><select id="editCat"><option>Haushalt</option><option>Fahrzeuge</option><option>Finanzen</option><option>Versicherungen</option><option>Familie</option><option>Verträge</option><option>Bußgelder</option><option>Sonstiges</option></select>
      <label>Erinnerung</label><select id="editRem"><option value="14">14 Tage vorher</option><option value="7">7 Tage vorher</option><option value="3">3 Tage vorher</option><option value="1">1 Tag vorher</option><option value="0">Keine Erinnerung</option></select>
      <button id="editArchiveSave" class="btn wide" type="button" style="margin-top:18px">✓ Änderungen speichern</button>
    </div>`;
    document.body.appendChild(modal);
    $('editArchiveClose').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
    $('editArchiveSave').onclick=()=>{
      const id=$('editArchiveId').value;
      const data=readData();
      const x=data.find(v=>v.id===id);
      if(!x)return alert('Eintrag nicht gefunden.');
      const amount=Number($('editAmount').value);
      if(!Number.isFinite(amount)||amount<0)return alert('Bitte einen gültigen Betrag eingeben.');
      x.name=$('editName').value.trim()||x.name;
      x.amount=+amount.toFixed(2);
      x.minimum=+(Number($('editMinimum').value)||0).toFixed(2);
      x.due=$('editDue').value;
      x.no=$('editNo').value.trim();
      x.cat=$('editCat').value;
      x.rem=+$('editRem').value;
      writeData(data);
      modal.style.display='none';
      alert('Änderungen gespeichert.');
      location.reload();
    };
  }

  function editEntry(id){
    ensureModal();
    const x=readData().find(v=>v.id===id);
    if(!x)return alert('Eintrag nicht gefunden.');
    $('editArchiveId').value=x.id;
    $('editName').value=x.name||'';
    $('editAmount').value=Number(x.amount||0).toFixed(2);
    $('editMinimum').value=x.minimum?Number(x.minimum).toFixed(2):'';
    $('editMinimumWrap').style.display=x.minimum?'block':'none';
    $('editDue').value=x.due||'';
    $('editNo').value=x.no||'';
    $('editCat').value=x.cat||'Haushalt';
    $('editRem').value=String(x.rem??7);
    $('editArchiveModal').style.display='block';
  }

  async function deleteEntry(id){
    const data=readData();
    const x=data.find(v=>v.id===id);
    if(!x)return alert('Eintrag nicht gefunden.');
    if(!confirm(`„${x.name||'Dokument'}“ wirklich löschen?\n\nDer Archiv-Eintrag und die gespeicherte Originaldatei werden entfernt.`))return;
    writeData(data.filter(v=>v.id!==id));
    await deleteStoredFile(id);
    location.reload();
  }

  function enhance(){
    document.querySelectorAll('#list article.doc').forEach(article=>{
      if(article.dataset.archiveTools==='1')return;
      const id=getId(article);if(!id)return;
      article.dataset.archiveTools='1';
      const actions=article.querySelector('.actions');if(!actions)return;
      const edit=document.createElement('button');
      edit.className='btn outline';edit.type='button';edit.textContent='✏️ Bearbeiten';edit.onclick=()=>editEntry(id);
      const del=document.createElement('button');
      del.className='btn gray';del.type='button';del.textContent='🗑️ Löschen';del.onclick=()=>deleteEntry(id);
      actions.append(edit,del);
    });
  }

  ensureModal();
  const list=$('list');
  if(list)new MutationObserver(enhance).observe(list,{childList:true,subtree:true});
  enhance();
})();