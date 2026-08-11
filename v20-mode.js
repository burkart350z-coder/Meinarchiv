const V20KEY="ma11";
const V20=$=>document.getElementById($);
const v20Money=n=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",minimumFractionDigits:2}).format(Number(n)||0);
const v20Esc=s=>String(s??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));
const v20Date=s=>s?new Date(s+"T00:00:00").toLocaleDateString("de-CH"):"";
const v20Bill=x=>x.type==="Rechnung"||x.type==="Kreditkartenabrechnung"||(+x.minimum||0)>0;
function v20Migrate(){
  const data=JSON.parse(localStorage.getItem(V20KEY)||"[]");let changed=false;
  for(const x of data){
    if(!x.type){
      if((+x.amount||0)>0 || (+x.minimum||0)>0){x.type=x.minimum>0?"Kreditkartenabrechnung":"Rechnung";x.status=x.paid?"Bezahlt":"Offen"}
      else{x.type="Dokument";x.status=x.status&&x.status!=="Archiviert"?x.status:"Archiviert"}
      changed=true;
    }
    if(v20Bill(x)){const wanted=x.paid?"Bezahlt":"Offen";if(x.status!==wanted){x.status=wanted;changed=true}}
    else if(!x.status){x.status="Archiviert";changed=true}
  }
  if(changed)localStorage.setItem(V20KEY,JSON.stringify(data));return data;
}
window.v20SetStatus=(id,status)=>{const data=JSON.parse(localStorage.getItem(V20KEY)||"[]"),x=data.find(a=>a.id===id);if(!x)return;x.status=status;if(status==="Bezahlt"){x.paid=true;x.paidDate=x.paidDate||new Date().toISOString().slice(0,10)}else{x.paid=false;x.paidDate=""}localStorage.setItem(V20KEY,JSON.stringify(data));v20Render()};
window.v20TogglePaid=id=>{const data=JSON.parse(localStorage.getItem(V20KEY)||"[]"),x=data.find(a=>a.id===id);if(!x)return;x.paid=!x.paid;x.paidDate=x.paid?new Date().toISOString().slice(0,10):"";x.status=x.paid?"Bezahlt":"Offen";localStorage.setItem(V20KEY,JSON.stringify(data));v20Render()};
function v20Status(x){if(x.paid)return"🟢 Bezahlt";if(x.status==="Offen"||v20Bill(x))return"🔴 Offen";if(x.status==="Bezahlt")return"🟢 Bezahlt";return"📁 Archiviert"}
function v20Render(){
  const data=v20Migrate(),q=(V20("search")?.value||"").toLowerCase().trim(),active=document.querySelector(".tab.active")?.dataset.filter||"open";
  const items=data.filter(x=>{const m=!q||(x.name+" "+x.no+" "+x.cat+" "+x.type+" "+x.status).toLowerCase().includes(q);if(!m)return false;if(active==="paid")return!!x.paid||x.status==="Bezahlt";if(active==="open")return!x.paid&&(v20Bill(x)||x.status==="Offen");return true});
  const list=V20("list");if(!list)return;
  list.innerHTML=items.length?items.map(x=>{const bill=v20Bill(x),amount=bill&&x.amount?v20Money(x.amount):"📄 Dokument",min=x.minimum>0?`<div class="muted">💳 Mindestbetrag: ${v20Money(x.minimum)}</div>`:"",details=[x.due?v20Date(x.due):"",x.no?(x.type==="Versicherung"?"Policen-/Vertragsnr. ":"Nr. ")+v20Esc(x.no):""].filter(Boolean).join(" · "),st=v20Status(x),cls=x.paid?"paid":st.includes("Offen")?"future":"soon",change=!bill?`<select class="status-select" onchange="v20SetStatus('${v20Esc(x.id)}',this.value)"><option value="Archiviert" ${x.status==="Archiviert"?"selected":""}>📁 Archiviert</option><option value="Offen" ${x.status==="Offen"?"selected":""}>🔴 Offen</option><option value="Bezahlt" ${x.status==="Bezahlt"?"selected":""}>🟢 Bezahlt</option></select>`:"";return`<article class="doc"><b>${v20Esc(x.name||x.file)}</b><div class="amount">${amount}</div>${min}<div class="muted">${v20Esc(x.type||"Dokument")} · ${v20Esc(x.cat||"Sonstiges")}${details?"<br>"+details:""}</div><span class="badge ${cls}">${st}</span><div class="actions"><button class="btn outline" onclick="openPDF('${v20Esc(x.id)}')">📄 Öffnen</button>${bill?`<button class="btn ${x.paid?"gray":"green"}" onclick="v20TogglePaid('${v20Esc(x.id)}')">${x.paid?"↩ Wieder öffnen":"✓ Als bezahlt markieren"}</button>`:change}</div></article>`}).join(""):"<div class='empty'>Keine Dokumente.</div>";
  const bills=data.filter(v20Bill),open=bills.filter(x=>!x.paid&&x.status!=="Bezahlt");V20("openCount").textContent=open.length;V20("openAmount").textContent=v20Money(open.reduce((a,x)=>a+(+x.amount||0),0));V20("soonCount").textContent=open.filter(x=>x.due).length;
}
(async()=>{await new Promise(r=>setTimeout(r,250));v20Migrate();const p=document.querySelector("header p");if(p)p.textContent="Dein persönliches Dokumenten- & Rechnungsarchiv · v20";document.title="MeinArchiv v20";const search=V20("search");if(search)search.addEventListener("input",v20Render);document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTimeout(v20Render,30)));v20Render()})();