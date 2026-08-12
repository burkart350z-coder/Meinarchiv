// Isolierte Reparatur: Dokumentvorschau + bezahlte Rechnungen bleiben sichtbar.
(()=>{
  const file=document.getElementById('file');
  const button=document.getElementById('documentPreview');
  const modal=document.getElementById('previewModal');
  const frame=document.getElementById('previewFrame');
  const close=document.getElementById('closePreview');
  if(!file||!button||!modal||!frame)return;

  let url='';
  const sync=()=>{
    const f=file.files&&file.files[0];
    button.hidden=!f;
    if(!f){if(url){URL.revokeObjectURL(url);url='';}return;}
    if(url)URL.revokeObjectURL(url);
    url=URL.createObjectURL(f);
  };

  file.addEventListener('change',sync,true);
  // Falls app.js den Dateiwert kurz danach verändert, Button trotzdem sichtbar halten.
  setInterval(()=>{if(file.files&&file.files.length)button.hidden=false;},300);

  button.addEventListener('click',e=>{
    e.preventDefault();
    const f=file.files&&file.files[0];
    if(!f)return;
    if(!url)url=URL.createObjectURL(f);
    frame.src=url;
    modal.style.display='block';
  },true);

  close?.addEventListener('click',()=>{
    modal.style.display='none';
    frame.src='about:blank';
  });

  // Nach "Bezahlt" nicht aus der aktuellen Ansicht verschwinden:
  // automatisch auf den Bezahlt-Tab wechseln.
  const originalPay=window.pay;
  if(typeof originalPay==='function'){
    window.pay=(i)=>{
      originalPay(i);
      const paidTab=document.querySelector('.tab[data-filter="paid"]');
      if(paidTab)paidTab.click();
    };
  }else{
    setTimeout(()=>{
      const p=window.pay;
      if(typeof p==='function'&&!p.__v15fix){
        const wrapped=(i)=>{p(i);document.querySelector('.tab[data-filter="paid"]')?.click()};
        wrapped.__v15fix=true;window.pay=wrapped;
      }
    },1000);
  }
})();