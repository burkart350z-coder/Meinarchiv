// v28: OCR-Fallback für Bild-PDFs – Android-kompatibel ohne ESM-Worker-Import.
(()=>{
 const file=document.getElementById('file'),$=id=>document.getElementById(id);if(!file)return;
 const val=s=>{const n=parseFloat(String(s||'').replace(/\s/g,'').replace(/'/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
 const iso=(d,m,y)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const loadScript=(src,id)=>new Promise((ok,bad)=>{if(window.Tesseract)return ok();const old=document.getElementById(id);if(old){old.addEventListener('load',ok,{once:true});old.addEventListener('error',bad,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
 async function textOf(pdf){let t='';for(let i=1;i<=pdf.numPages;i++){const c=await(await pdf.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(' ')}return t.trim()}
 async function ocr(pdf){
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','tesseract-v5');
  let out='';const count=Math.min(2,pdf.numPages);
  for(let i=1;i<=count;i++){
   $('status').textContent=`🧠 Scan wird gelesen … Seite ${i}/${count}`;
   const p=await pdf.getPage(i),vp=p.getViewport({scale:1.35}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
   await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
   const r=await window.Tesseract.recognize(c,'deu',{logger:m=>{if(m.status==='recognizing text')$('status').textContent=`🧠 OCR Seite ${i}/${count} · ${Math.round((m.progress||0)*100)} %`;}});
   out+=(r.data.text||'')+'\n';c.width=c.height=1;
  }return out;
 }
 function fill(text,pages){
  const t=String(text||'').replace(/\s+/g,' '),pp=/(POWERPAY|MF\s*Group)/i.test(t)&&/(Monatsrechnung|Rechnung)/i.test(t);let total=0,min=0,due='',no='';
  let m=t.match(/Offener\s+Saldo\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);if(m)total=val(m[1]);
  m=t.match(/Mindestbetrag(?:\s+zahlbar\s+bis\s+\d{1,2}[.\-/]\d{1,2}[.\-/]20\d{2})?\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);if(m)min=val(m[1]);
  m=t.match(/(?:Zahlbar\s+bis|Fällig\s+am|Fälligkeit)\s*:?[ ]*(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/i);if(m)due=iso(+m[1],+m[2],+m[3]);
  m=t.match(/Monatsrechnung\s+([0-9]{6,20})/i)||t.match(/Rechnung\s*:?[ ]*([0-9]{6,20})/i);if(m)no=m[1];
  if(pp)$('name').value='POWERPAY / MF Group AG';if(total)$('amount').value=total.toFixed(2);if(min){$('minimum').value=min.toFixed(2);$('minimumWrap').hidden=false}if(due)$('due').value=due;if(no)$('no').value=no;if(pp)$('cat').value='Finanzen';
  $('preview').innerHTML=`<b>${pages} Seiten · OCR-Scan</b><br>🏢 ${pp?'POWERPAY / MF Group AG':'bitte kontrollieren'}<br>💰 ${total?'CHF '+total.toFixed(2):'Betrag nicht erkannt'}${min?'<br>💳 Mindestbetrag CHF '+min.toFixed(2):''}<br>📅 ${due||'nicht erkannt'}<br>📄 ${no||'nicht erkannt'}`;
  $('status').textContent=(total||due||no||pp)?'✅ Scan per OCR analysiert.':'⚠️ OCR hat Text gelesen, Daten bitte manuell kontrollieren.';
 }
 file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||f.type!=='application/pdf')return;try{const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;if((await textOf(pdf)).length>40)return;$('scan').hidden=false;$('status').textContent='🧠 Bild-PDF erkannt – OCR wird geladen …';fill(await ocr(pdf),pdf.numPages)}catch(e){console.error(e);$('status').textContent='⚠️ OCR konnte den Scan nicht lesen. Daten bitte manuell ergänzen.'}finally{$('scan').hidden=true}},true);
})();