// Kleine, isolierte Reparatur: nur die Dokumentvorschau.
(()=>{
  const file=document.getElementById('file');
  const button=document.getElementById('documentPreview');
  const modal=document.getElementById('previewModal');
  const frame=document.getElementById('previewFrame');
  const close=document.getElementById('closePreview');
  if(!file||!button||!modal||!frame)return;
  let url='';
  const show=()=>{
    const f=file.files&&file.files[0];
    button.hidden=!f;
    if(!f)return;
    if(url)URL.revokeObjectURL(url);
    url=URL.createObjectURL(f);
  };
  file.addEventListener('change',show,true);
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
})();