// v27: OCR-Fallback für eingescannte PDFs ohne eingebetteten Text.
(()=>{
  const file=document.getElementById('file');
  if(!file)return;
  const $=id=>document.getElementById(id);
  const val=s=>{const n=parseFloat(String(s||'').replace(/\s/g,'').replace(/'/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const iso=(d,m,y)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function pdfText(pdf){let text='';for(let i=1;i<=pdf.numPages;i++){const c=await (await pdf.getPage(i)).getTextContent();text+=c.items.map(x=>x.str).join(' ')+'\n';}return text.trim();}
  async function ocrPdf(pdf){
    const {createWorker}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
    // Ein einzelnes Sprachmodell ist auf Android deutlich robuster als deu+eng+fra.
    const worker=await createWorker('deu');
    let text='';
    try{
      const count=Math.min(pdf.numPages,2);
      for(let i=1;i<=count;i++){
        $('status').textContent=`🧠 Scan wird per OCR gelesen … Seite ${i}/${count}`;
        const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.45});
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas konnte nicht gelesen werden')),'image/jpeg',0.92));
        const r=await worker.recognize(blob);text+=(r.data.text||'')+'\n';
        canvas.width=1;canvas.height=1;
      }
    }finally{await worker.terminate();}
    return text;
  }
  function fillFromText(text,pages){
    const t=String(text||'').replace(/\s+/g,' '),powerpay=/(POWERPAY|MF\s*Group)/i.test(t)&&/Monatsrechnung/i.test(t);
    let name='';if(powerpay)name='POWERPAY / MF Group AG';else{const m=t.match(/\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüéèàç&' .-]{2,}\s+(?:AG|GmbH|SA|Sàrl|Ltd\.?))\b/);name=m?m[1].trim():'';}
    let total=0,minimum=0,no='',due='';
    const saldo=t.match(/Offener\s+Saldo\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);
    const min=t.match(/Mindestbetrag\s+zahlbar\s+bis\s+\d{1,2}[.\-/]\d{1,2}[.\-/]20\d{2}\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i)||t.match(/Mindestbetrag[\s\S]{0,90}?(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);
    if(saldo)total=val(saldo[1]);if(min)minimum=val(min[1]);
    if(!total){const a=t.match(/(?:Rechnungsbetrag|Gesamtbetrag|Totalbetrag|Zahlbetrag|Total\s+CHF)\s*:?(?:\s*CHF)?\s*([0-9' ]+[.,][0-9]{2})/i);if(a)total=val(a[1]);}
    const dm=t.match(/(?:Zahlbar\s+bis|Fällig\s+am|Fälligkeit)\s*:?(\s*)(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/i);if(dm)due=iso(+dm[2],+dm[3],+dm[4]);
    const nm=t.match(/Monatsrechnung\s+([0-9]{6,20})/i)||t.match(/(?:Rechnungsnummer|Rechnung\s*(?:Nr\.?|Nummer)|Rechnung:)\s*:?\s*([A-Z0-9\-/]{6,30})/i);if(nm)no=nm[1];
    if(name)$('name').value=name;if(total)$('amount').value=total.toFixed(2);if(minimum){$('minimum').value=minimum.toFixed(2);$('minimumWrap').hidden=false;}if(due)$('due').value=due;if(no)$('no').value=no;if(powerpay)$('cat').value='Finanzen';
    const bits=[`<b>${pages} Seite${pages===1?'':'n'}</b> · OCR-Scan`,name?`🏢 ${esc(name)}`:'🏢 nicht erkannt',total?`💰 ${powerpay?'Offener Saldo':'Rechnungsbetrag'}: CHF ${total.toFixed(2)}`:'💰 Betrag nicht erkannt'];if(minimum)bits.push(`💳 Mindestbetrag: CHF ${minimum.toFixed(2)}`);bits.push(due?`📅 ${due.split('-').reverse().join('.')}`:'📅 nicht erkannt',no?`📄 ${esc(no)}`:'📄 nicht erkannt',`📁 ${esc($('cat').value)}`,`<span class="muted">Eingescannte PDF per OCR erkannt. Bitte Felder vor dem Archivieren kontrollieren.</span>`);$('preview').innerHTML=bits.join('<br>');$('status').textContent=(total||name||no||due)?'✅ Scan per OCR analysiert.':'⚠️ Scan gelesen, Daten bitte kontrollieren bzw. manuell ergänzen.';
  }
  file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f||f.type!=='application/pdf')return;try{const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;const embedded=await pdfText(pdf);if(embedded.length>40)return;$('scan').hidden=false;$('status').textContent='🧠 Eingescannte PDF erkannt – OCR startet …';const text=await ocrPdf(pdf);fillFromText(text,pdf.numPages);}catch(err){console.error('Scan-OCR:',err);$('status').textContent='⚠️ OCR konnte den Scan nicht lesen. Daten bitte manuell ergänzen.';}finally{$('scan').hidden=true;}},true);
})();