const KEY="ma11", DB="ma11files";
let data=JSON.parse(localStorage.getItem(KEY)||"[]"), currentFile=null, filter="open";
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=s=>s?new Date(s+"T00:00:00").toLocaleDateString("de-CH"):"";
const days=s=>s?Math.ceil((new Date(s+"T23:59:59")-new Date())/86400000):99999;
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function store(mode="readwrite"){return new Promise((a,b)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>a(r.result.transaction("f",mode).objectStore("f"));r.onerror=()=>b(r.error)})}
async function put(id,f){(await store()).put(f,id)}
async function get(id){let s=await store("readonly");return new Promise((a,b)=>{let r=s.get(id);r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error)})}
window.openPDF=async id=>{let f=await get(id);if(!f)return alert("Originaldatei nicht gefunden.");let u=URL.createObjectURL(f);open(u,"_blank");setTimeout(()=>URL.revokeObjectURL(u),120000)};
window.pay=i=>{data[i].paid=!data[i].paid;data[i].paidDate=data[i].paid?new Date().toISOString().slice(0,10):"";save();render()};

function clean(t){return String(t||"").replace(/\u00a0/g," ").replace(/\r/g,"\n").replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim()}
function amount(s){
  let v=String(s||"").replace(/CHF|SFr\.?|Fr\./gi,"").replace(/\s/g,"").replace(/'/g,"");
  if(v.includes(",")&&v.includes("."))v=v.replace(/\./g,"").replace(",","."); else if(v.includes(","))v=v.replace(",",".");
  const n=parseFloat(v);return Number.isFinite(n)?n:0
}
function dateISO(d,m,y){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function findDate(t){
  for(const p of [
    /(?:bis\s+zum|bis\s+|zahlbar\s+bis|fällig\s+am|Fälligkeit|Fälligkeitsdatum)\s*:?\s*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](20\d{2})/i,
    /(?:due\s+date|payment\s+due|due)\s*:?\s*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](20\d{2})/i,
    /(?:bis|per)\s+(\d{1,2})[.\-\/](\d{1,2})[.\-\/](20\d{2})/i
  ]){const m=t.match(p);if(m)return dateISO(+m[1],+m[2],+m[3])}
  return ""
}
function findAmount(t){
  const patterns=[
    // Galaxus / Swiss invoices: prefer final gross amount incl. VAT.
    /(?:Total\s*(?:inkl\.?\s*(?:MwSt\.?|Mehrwertsteuer)|gross|brutto)|Gesamtbetrag\s*inkl\.?\s*(?:MwSt\.?|Mehrwertsteuer)|zu\s+bezahlender\s+Gesamtbetrag|zu\s+bezahlender\s+Betrag|Totalbetrag|zu\s+bezahlen|Zahlbetrag)\s*(?:\([^)]*\))?\s*(?:in\s+CHF)?\s*:?[ ]*(?:CHF|SFr\.?|Fr\.)?\s*([0-9' ]+[.,][0-9]{2})/i,
    /(?:Rechnungsbetrag|Rechnungs\s*total|Total\s*Rechnung)\s*:?[ ]*(?:CHF|SFr\.?|Fr\.)?\s*([0-9' ]+[.,][0-9]{2})/i,
    /zu\s+Ihren\s+Lasten\s*(?:CHF\s*)?([0-9' ]+[.,][0-9]{2})/i,
    /(?:CHF|SFr\.?|Fr\.)\s*([0-9' ]+[.,][0-9]{2})/i
  ];
  for(const p of patterns){const m=t.match(p),n=m&&amount(m[1]);if(n>0)return n}
  return 0
}
function findCreditCardMinimum(t){
  if(!/(kreditkarte|credit\s*card|kartenabrechnung|card\s*statement|visa|mastercard)/i.test(t))return 0;
  for(const p of [
    /(?:Mindestzahlung|Mindestbetrag|Minimum\s*(?:Payment|Zahlung)|minimum\s*amount)\s*(?:CHF|SFr\.?|Fr\.)?\s*([0-9' ]+[.,][0-9]{2})/i,
    /(?:mindestens\s*zu\s*zahlen|zu\s*zahlender\s*Mindestbetrag)\s*:?[ ]*(?:CHF|SFr\.?|Fr\.)?\s*([0-9' ]+[.,][0-9]{2})/i
  ]){const m=t.match(p),n=m&&amount(m[1]);if(n>0)return n}
  return 0
}
function findSender(t){
  if(/CONCORDIA\s+Schweizerische\s+Kranken-\s+und\s+Unfallversicherung\s+AG/i.test(t)||/KVG-Versicherer:\s*CONCORDIA/i.test(t)||(/Leistungsabrechnung/i.test(t)&&/concordia\.ch/i.test(t)))return "CONCORDIA Schweizerische Kranken- und Unfallversicherung AG";
  const known=[[/Digitec\s+Galaxus\s+AG/i,"Digitec Galaxus AG"],[/Assura\s+AG/i,"Assura AG"],[/Swisscom(?:\s+\w+)?/i,"Swisscom"],[/\bAXA(?:\s+Versicherung)?/i,"AXA"],[/Tesla\s*,?\s*Inc\.?/i,"Tesla"]];
  for(const [r,n] of known)if(r.test(t))return n;
  const m=t.match(/\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüéèàç&' -]{2,}\s+(?:AG|GmbH|SA|Sàrl|Ltd\.?))\b/);return m?m[1].trim():"";
}
function findNumber(t){
  for(const p of [/(?:Abr\.-?Nr\.?|Abr\.?\-?Nr\.?|Abrechnungs(?:nummer|nr\.?))\s*:?\s*([0-9]{6,})/i,/(?:Rechnungsnummer|Rechnung\s*(?:Nr\.?|Nummer)|Referenz\s*(?:Nr\.?|Nummer)|Order\s*(?:No\.?|Number))\s*:?[ ]*([A-Z0-9][A-Z0-9\-\/ ]{5,})/i,/(?:Prämie,\s*Ref\.?|Ref\.)\s*([0-9]{6,})/i]){const m=t.match(p);if(m)return m[1].replace(/\s+/g," ").trim()}return "";
}
function findCategory(t,s){
  const x=(t+" "+s).toLowerCase();
  if(/versicherung|prämie|police|assura|axa|vvg/.test(x))return"Versicherungen";
  if(/tesla|fahrzeug|auto|carado|camper|garage/.test(x))return"Fahrzeuge";
  if(/bank|steuer|kredit|lohn|zins|kreditkarte|credit card/.test(x))return"Finanzen";
  if(/schule|familie/.test(x))return"Familie";
  if(/vertrag/.test(x))return"Verträge";
  if(/bußgeld|bussgeld|amende|contravention|infraction|radar|stationnement|péage|mairie|prefecture/.test(x))return"Bußgelder";
  return"Haushalt";
}
function extract(t){
  t=clean(t);const name=findSender(t), due=findDate(t), min=findCreditCardMinimum(t), amountValue=min||findAmount(t), no=findNumber(t);
  return {name,due,amount:amountValue,no,cat:findCategory(t,name),creditMinimum:!!min};
}
function resetForm(){
  currentFile=null;$('file').value="";$('name').value="";$('amount').value="";$('due').value="";$('no').value="";$('cat').value="Haushalt";$('rem').value="7";$('preview').innerHTML="Noch keine Rechnung analysiert.";$('status').textContent="Die App liest bei Text-PDFs den tatsächlichen Inhalt.";
}
async function readPDF(file){
  const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text="";
  for(let i=1;i<=pdf.numPages;i++){const c=await (await pdf.getPage(i)).getTextContent();text+=c.items.map(x=>x.str).join(" ")+"\n"}
  return {text,pages:pdf.numPages};
}
async function readImage(file){
  // OCR is loaded only when needed, so normal PDF use stays fast.
  const {createWorker}=await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js");
  const worker=await createWorker("deu+eng+fra");
  const {data}=await worker.recognize(await file.arrayBuffer());
  await worker.terminate();
  return {text:data.text||"",pages:1};
}

$("file").onchange=async e=>{
  currentFile=e.target.files[0];if(!currentFile)return;
  $("status").textContent="🧠 Dokument wird gelesen …";$("scan").hidden=false;
  try{
    const result=currentFile.type==="application/pdf"?await readPDF(currentFile):await readImage(currentFile);
    const text=clean(result.text),d=extract(text);
    $("name").value=d.name;$("amount").value=d.amount?d.amount.toFixed(2):"";$("due").value=d.due;$("no").value=d.no;$("cat").value=d.cat;
    const extra=d.creditMinimum?"<br>💳 Mindestzahlung erkannt (statt Kartenlimit)":"";
    $("preview").innerHTML=`<b>${result.pages} Seite${result.pages===1?"":"n"}</b> · ${text.length} Zeichen<br>🏢 ${esc(d.name||"nicht erkannt")}<br>💰 ${d.amount?money(d.amount):"nicht erkannt"}${extra}<br>📅 ${d.due?fmt(d.due):"nicht erkannt"}<br>📄 ${esc(d.no||"nicht erkannt")}<br>📁 ${d.cat}<br><span class="muted">Bitte die Felder vor dem Archivieren kontrollieren.</span>`;
    $("status").textContent=text.length?"✅ Dokument analysiert.":"⚠️ Kein Text erkannt – bitte Daten manuell ergänzen.";
  }catch(err){console.error(err);$("status").textContent="⚠️ Dokument konnte nicht analysiert werden. Daten bitte manuell eingeben."}
  finally{$("scan").hidden=true}
};

$("save").onclick=async()=>{
  if(!currentFile)return alert("Bitte zuerst eine PDF oder ein Bild auswählen.");
  if(!$('amount').value||!$('due').value)return alert("Betrag und Fälligkeit bitte kontrollieren.");
  const id=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  data.unshift({id,name:$('name').value||currentFile.name,amount:+(+$('amount').value).toFixed(2),due:$('due').value,no:$('no').value,cat:$('cat').value,rem:+$('rem').value,paid:false,paidDate:"",file:currentFile.name});
  await put(id,currentFile);save();render();resetForm();alert("Rechnung archiviert und Formular zurückgesetzt.");
};

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;render()});
$("search").oninput=render;
function render(){
  const open=data.filter(x=>!x.paid),sum=open.reduce((a,x)=>a+(+x.amount||0),0);
  $("openCount").textContent=open.length;$("openAmount").textContent=money(sum);$("soonCount").textContent=open.filter(x=>days(x.due)>=0&&days(x.due)<=7).length;
  const q=$("search").value.toLowerCase().trim();
  const items=data.filter(x=>(filter==="all"||(filter==="paid"?x.paid:!x.paid))&&(!q||(x.name+" "+x.no+" "+x.cat+" "+x.amount).toLowerCase().includes(q)));
  $("list").innerHTML=items.length?items.map(x=>{const i=data.indexOf(x),d=days(x.due),cls=x.paid?"paid":d<0?"danger":d<=7?"soon":"future",lab=x.paid?"✅ Bezahlt am "+fmt(x.paidDate):d<0?"🔴 Überfällig":d<=7?"🟠 Fällig in "+d+" Tagen":"🔵 Fällig "+fmt(x.due);return `<article class="doc"><b>${esc(x.name)}</b><div class="amount">${money(x.amount)}</div><div class="muted">Fällig ${fmt(x.due)} · ${esc(x.cat)}${x.no?" · Nr. "+esc(x.no):""}</div><span class="badge ${cls}">${lab}</span><div class="actions"><button class="btn outline" onclick="openPDF('${x.id}')">📄 PDF öffnen</button><button class="btn ${x.paid?'gray':'green'}" onclick="pay(${i})">${x.paid?"↩ Wieder öffnen":"✓ Als bezahlt markieren"}</button></div></article>`}).join(""):"<div class='empty'>Keine Rechnungen.</div>";
  const rem=data.filter(x=>!x.paid&&x.rem>0&&days(x.due)<=x.rem);$("reminders").innerHTML=rem.length?rem.map(x=>`<div class="rem">🔔 <b>${esc(x.name)}</b><br>${money(x.amount)} · fällig ${fmt(x.due)}<br><span class="badge soon">Erinnerung ${x.rem} Tage vorher</span></div>`).join(""):"<div class='empty'>Keine fälligen Erinnerungen.</div>";
}
let deferred;addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null}else alert("Chrome ⋮ → Zum Startbildschirm hinzufügen")};
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
