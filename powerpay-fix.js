// v24: POWERPAY Monatsrechnungen gezielt erkennen.
// Überschreibt nach der normalen Analyse nur die Felder, die bei POWERPAY eindeutig sind.
(()=>{
  const file=document.getElementById('file');
  if(!file)return;

  const moneyValue=s=>{
    let v=String(s||'').replace(/\s/g,'').replace(/'/g,'').replace(',','.');
    const n=parseFloat(v);return Number.isFinite(n)?n:0;
  };
  const iso=(d,m,y)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  file.addEventListener('change',async()=>{
    const f=file.files?.[0];
    if(!f||f.type!=='application/pdf')return;
    try{
      const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
      const pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;
      let text='';
      for(let i=1;i<=pdf.numPages;i++){
        const c=await (await pdf.getPage(i)).getTextContent();
        text+=c.items.map(x=>x.str).join(' ')+'\n';
      }
      if(!/(POWERPAY|MF\s+Group\s+AG)/i.test(text)||!/Monatsrechnung/i.test(text))return;

      // POWERPAY: "Letzte Transaktion" enthält alte CHF-Beträge. Diese dürfen nie
      // als aktueller Rechnungsbetrag verwendet werden. Massgebend ist "Offener Saldo".
      const saldo=text.match(/Offener\s+Saldo\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);
      const minimum=text.match(/Mindestbetrag\s+zahlbar\s+bis\s+\d{1,2}[.\-/]\d{1,2}[.\-/]20\d{2}\s+(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i)
        || text.match(/Mindestbetrag[\s\S]{0,80}?(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i);
      const due=text.match(/Zahlbar\s+bis\s+(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/i);
      const number=text.match(/Monatsrechnung\s+([0-9]{6,20})/i)
        || text.match(/Rechnung:\s*([0-9]{6,20})/i);

      // Kurz warten, damit die normale Analyse fertig ist, dann POWERPAY-Werte priorisieren.
      setTimeout(()=>{
        const amount=document.getElementById('amount');
        const min=document.getElementById('minimum');
        const minWrap=document.getElementById('minimumWrap');
        const date=document.getElementById('due');
        const no=document.getElementById('no');
        const name=document.getElementById('name');
        const cat=document.getElementById('cat');
        const preview=document.getElementById('preview');

        const total=saldo?moneyValue(saldo[1]):0;
        const minimumValue=minimum?moneyValue(minimum[1]):0;
        if(total&&amount)amount.value=total.toFixed(2);
        if(minimumValue&&min)min.value=minimumValue.toFixed(2);
        if(minWrap)minWrap.hidden=false;
        if(due&&date)date.value=iso(+due[1],+due[2],+due[3]);
        if(number&&no)no.value=number[1];
        if(name)name.value='POWERPAY / MF Group AG';
        if(cat)cat.value='Finanzen';

        if(preview){
          preview.innerHTML=`<b>${pdf.numPages} Seiten</b><br>🏢 POWERPAY / MF Group AG<br>💰 Offener Saldo: CHF ${total.toFixed(2)}<br>💳 Mindestbetrag: CHF ${minimumValue.toFixed(2)}<br>📅 ${due?`${String(due[1]).padStart(2,'0')}.${String(due[2]).padStart(2,'0')}.${due[3]}`:'nicht erkannt'}<br>📄 ${number?number[1]:'nicht erkannt'}<br>📁 Finanzen<br><span class="muted">POWERPAY-Monatsrechnung erkannt. Alte Transaktionen werden bei der Betragserkennung ignoriert.</span>`;
        }
      },700);
    }catch(err){console.error('POWERPAY-Erkennung:',err);}
  },true);
})();