// v23: Mobile Dokumentvorschau – PDF direkt mit PDF.js rendern, statt Android-PDF-Viewer mit Blob-UUID zu zeigen.
(()=>{
  const file=document.getElementById('file');
  const button=document.getElementById('documentPreview');
  const modal=document.getElementById('previewModal');
  const frame=document.getElementById('previewFrame');
  const close=document.getElementById('closePreview');
  if(!file||!button||!modal||!frame)return;

  let url='';
  let currentObjectUrl='';

  const host=frame.parentElement;
  const content=document.createElement('div');
  content.id='previewContent';
  content.style.cssText='flex:1;overflow:auto;background:#202124;padding:12px;display:flex;flex-direction:column;align-items:center;gap:12px;-webkit-overflow-scrolling:touch;';
  frame.replaceWith(content);

  const sync=()=>{
    const f=file.files&&file.files[0];
    button.disabled=!f;
    button.hidden=false;
    if(!f){
      if(url){URL.revokeObjectURL(url);url='';}
      return;
    }
    if(url)URL.revokeObjectURL(url);
    url=URL.createObjectURL(f);
  };

  const showImage=async f=>{
    content.innerHTML='';
    const img=document.createElement('img');
    img.src=url;
    img.alt='Dokumentvorschau';
    img.style.cssText='display:block;max-width:100%;height:auto;background:#fff;border-radius:4px;';
    content.appendChild(img);
  };

  const showPdf=async f=>{
    content.innerHTML='<div style="color:#fff;padding:20px">⏳ PDF wird geladen …</div>';
    const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    const pdf=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;
    content.innerHTML='';
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo);
      const base=page.getViewport({scale:1});
      const maxWidth=Math.min(window.innerWidth-36,900);
      const scale=Math.max(1,Math.min(2.2,maxWidth/base.width));
      const viewport=page.getViewport({scale});
      const wrap=document.createElement('div');
      wrap.style.cssText='background:#fff;box-shadow:0 2px 10px #0008;max-width:100%;';
      const canvas=document.createElement('canvas');
      const ctx=canvas.getContext('2d');
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      canvas.style.cssText='display:block;max-width:100%;height:auto;';
      wrap.appendChild(canvas);
      content.appendChild(wrap);
      await page.render({canvasContext:ctx,viewport}).promise;
    }
  };

  file.addEventListener('change',sync,true);
  sync();

  button.addEventListener('click',async e=>{
    e.preventDefault();
    const f=file.files&&file.files[0];
    if(!f)return;
    if(!url)url=URL.createObjectURL(f);
    modal.style.display='block';
    content.innerHTML='<div style="color:#fff;padding:20px">⏳ Vorschau wird erstellt …</div>';
    try{
      if(f.type==='application/pdf')await showPdf(f);
      else await showImage(f);
    }catch(err){
      console.error(err);
      content.innerHTML='<div style="color:#fff;padding:24px;text-align:center">⚠️ Vorschau konnte nicht angezeigt werden.<br><br><button class="btn" type="button" id="previewOpenFallback">Öffnen</button></div>';
      document.getElementById('previewOpenFallback')?.addEventListener('click',()=>window.open(url,'_blank'));
    }
  },true);

  close?.addEventListener('click',()=>{
    modal.style.display='none';
    content.innerHTML='';
  });

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
      if(typeof p==='function'&&!p.__v22fix){
        const wrapped=(i)=>{p(i);document.querySelector('.tab[data-filter="paid"]')?.click()};
        wrapped.__v22fix=true;window.pay=wrapped;
      }
    },1000);
  }
})();