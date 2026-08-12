const fileInput=document.getElementById('file');
const btn=document.getElementById('previewBtn');
let previewUrl=null;
if(btn&&fileInput){
  btn.onclick=()=>{
    const file=fileInput.files?.[0];
    if(!file){alert('Bitte zuerst ein Dokument auswählen.');return;}
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl=URL.createObjectURL(file);
    window.open(previewUrl,'_blank');
  };
}