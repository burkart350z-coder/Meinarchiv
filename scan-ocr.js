// v36: Android-OCR stabil + POWERPAY-Betragsbereich erweitert. Sonst unverändert.
(()=>{
 const file=document.getElementById('file'),$=id=>document.getElementById(id);if(!file)return;
 const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const moneyVal=s=>{let v=String(s||'').replace(/CHF/gi,'').replace(/'/g,'').trim();v=v.replace(/[^0-9,.-]/g,'');if(!v)return 0;if(v.includes(',')&&v.includes('.'))v=v.lastIndexOf(',')>v.lastIndexOf('.')?v.replace(/\./g,'').replace(',','.'):v.replace(/,/g,'');else if(v.includes(','))v=v.replace(',','.');const n=parseFloat(v);return Number.isFinite(n)?n:0};
 const iso=(d,m,y)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const loadScript=(src,id)=>new Promise((ok,bad)=>{if(window.Tesseract)return ok();const old=document.getElementById(id);if(old){old.addEventListener('load',ok,{once:true});old.addEventListener('error',bad,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
 async function textOf(pdf){let t='';for(let i=1;i<=pdf.numPages;i++){const c=await(await pdf.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(' ')}return t.trim()}
 async function recognizeCanvas(c,label){const r=await window.Tesseract.recognize(c,'deu',{logger:m=>{if(m.status==='recognizing text')$('status').textContent=`🧠 ${label} · ${Math.round((m.progress||0)*100)} %`;}});return r.data.text||''}
 async function ocr(pdf){
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','tesseract-v5');let out='';const count=Math.min(2,pdf.numPages);
  for(let i=1;i<=count;i++){
   $('status').textContent=`🧠 Scan wird gelesen … Seite ${i}/${count}`;
   const p=await pdf.getPage(i),vp=p.getViewport({scale:1.45}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
   await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;out+=await recognizeCanvas(c,`OCR Seite ${i}/${count}`)+'\n';c.width=c.height=1;
  }
  if(pdf.numPages>=1){
   $('status').textContent='🧠 Beträge werden genauer gelesen …';
   const p=await pdf.getPage(1),vp=p.getViewport({scale:2.8}),full=document.createElement('canvas');full.width=Math.ceil(vp.width);full.height=Math.ceil(vp.height);
   await p.render({canvasContext:full.getContext('2d'),viewport:vp}).promise;
   // v36: Ausschnitt beginnt deutlich weiter oben (48% statt 68%).
   // So werden POWERPAY-Zahlungsübersicht + Seitenfuss gemeinsam gelesen.
   const y=Math.floor(full.height*0.48),crop=document.createElement('canvas');crop.width=full.width;crop.height=full.height-y;
   crop.getContext('2d').drawImage(full,0,y,full.width,full.height-y,0,0,crop.width,crop.height);
   const footerText=await recognizeCanvas(crop,'Beträge');
   out+='\n__POWERPAY_FOOTER__\n'+footerText+'\n__POWERPAY_FOOTER_END__\n';
   full.width=full.height=crop.width=crop.height=1;
  }
  return out;
 }
 function isDateToken(scope,start,end){const around=scope.slice(Math.max(0,start-4),Math.min(scope.length,end+8));return /\d{1,2}[.\-/]\d{1,2}[.\-/](?:20)?\d{2}/.test(around)||/[.\-/](?:20)?\d{2}\b/.test(scope.slice(end,Math.min(scope.length,end+8)))}
 function amountNearLabel(raw,labels,maxChars=180){const lower=raw.toLowerCase();for(const label of labels){let from=0;while(true){const pos=lower.indexOf(label.toLowerCase(),from);if(pos<0)break;const chunk=raw.slice(pos,pos+maxChars);const re=/[0-9]{1,4}(?:[' .][0-9]{3})*[.,][0-9]{2}|[0-9]{1,4}[ ]+[0-9]{2}/g;let m;while((m=re.exec(chunk))){if(isDateToken(chunk,m.index,m.index+m[0].length))continue;const n=moneyVal(m[0]);if(n>0)return n}from=pos+label.length}}return 0}
 function footer(raw){const m=raw.match(/__POWERPAY_FOOTER__([\s\S]*?)__POWERPAY_FOOTER_END__/);return m?m[1]:''}
 function footerAmounts(raw){const vals=[];const re=/\b\d{1,4}(?:[' ]\d{3})*[.,]\d{2}\b/g;let m;while((m=re.exec(raw))){if(isDateToken(raw,m.index,m.index+m[0].length))continue;const n=moneyVal(m[0]);if(n>0&&n<100000)vals.push(n)}return [...new Set(vals.map(n=>n.toFixed(2)))].map(Number).sort((a,b)=>b-a)}
 function fill(text,pages){const raw=String(text||''),t=raw.replace(/\s+/g,' '),pp=/(POWERPAY|MF\s*Group)/i.test(t)&&/(Monatsrechnung|Rechnung)/i.test(t);let total=0,min=0,due='',no='';
  total=amountNearLabel(raw,['Offener Saldo CHF','Offener Saldo','Offener Saido','Offener Sa1do','Offener SaIdo'],120);
  min=amountNearLabel(raw,['Mindestbetrag zahlbar','Mindestbetrag'],140);
  const f=footer(raw),candidates=footerAmounts(f);
  if(pp){
    if(total<10)total=0;if(min<10)min=0;
    if(!total){const big=candidates.find(n=>n>=100);if(big)total=big;}
    if(!min){const mid=candidates.find(n=>n>=10&&n<100&&n!==total);if(mid)min=mid;}
  }
  let m=t.match(/(?:Zahlbar\s+bis|Fällig\s+am|Fälligkeit)\s*:?[ ]*(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/i);if(m)due=iso(+m[1],+m[2],+m[3]);
  m=t.match(/Monatsrechnung\s+([0-9]{6,20})/i)||t.match(/Rechnung\s*:?[ ]*([0-9]{6,20})/i);if(m)no=m[1];
  if(pp)$('name').value='POWERPAY / MF Group AG';$('amount').value=total?total.toFixed(2):'';if(min){$('minimum').value=min.toFixed(2);$('minimumWrap').hidden=false}else if(pp){$('minimum').value='';$('minimumWrap').hidden=false}if(due)$('due').value=due;if(no)$('no').value=no;if(pp)$('cat').value='Finanzen';
  const diag=pp?`<details style="margin-top:12px"><summary>🔎 OCR-Diagnose anzeigen</summary><div style="margin-top:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;background:#f3f4f6;padding:10px;border-radius:8px"><b>Gefundene Geldwerte im erweiterten Bereich:</b> ${esc(candidates.join(' / ')||'keine')}\n\n${esc(f||'Kein separater Bereichstext erkannt.')}</div></details>`:'';
  $('preview').innerHTML=`<b>${pages} Seiten · OCR-Scan</b><br>🏢 ${pp?'POWERPAY / MF Group AG':'bitte kontrollieren'}<br>💰 ${total?'CHF '+total.toFixed(2):'Betrag nicht erkannt'}${min?'<br>💳 Mindestbetrag CHF '+min.toFixed(2):''}<br>📅 ${due||'nicht erkannt'}<br>📄 ${no||'nicht erkannt'}${diag}`;
  $('status').textContent=(total||due||no||pp)?'✅ Scan per OCR analysiert.':'⚠️ OCR hat Text gelesen, Daten bitte manuell kontrollieren.'}
 file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||f.type!=='application/pdf')return;try{const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;if((await textOf(pdf)).length>40)return;$('scan').hidden=false;$('status').textContent='🧠 Bild-PDF erkannt – OCR wird geladen …';fill(await ocr(pdf),pdf.numPages)}catch(e){console.error('Scan-OCR',e);$('status').textContent='⚠️ OCR konnte den Scan nicht lesen. Daten bitte manuell ergänzen.'}finally{$('scan').hidden=true}},true)
})();