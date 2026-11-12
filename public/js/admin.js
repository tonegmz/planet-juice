(function(){
  var KEY = "pj-admin";
  var pw = ""; try{ pw = sessionStorage.getItem(KEY) || "" }catch(e){}
  var type = "orders", timer;
  var $ = function(s){return document.querySelector(s)};
  var esc = function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  var when = function(iso){ try{ return new Date(iso).toLocaleString("en-US",{timeZone:"America/Detroit",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) }catch(e){ return iso } };

  function api(path,opts){
    opts = opts || {}; opts.headers = Object.assign({Authorization:"Bearer "+pw}, opts.headers||{});
    return fetch(path,opts).then(function(r){
      if(r.status===401){ logout("Wrong password."); throw new Error("auth"); }
      return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||"Error"); return j; });
    });
  }
  function logout(msg){
    pw=""; try{ sessionStorage.removeItem(KEY) }catch(e){}
    clearInterval(timer); $("#app").hidden=true; $("#logout").hidden=true; $("#login").hidden=false;
    var e=$("#login-err"); e.textContent=msg||""; e.hidden=!msg;
  }
  function start(){
    $("#login").hidden=true; $("#app").hidden=false; $("#logout").hidden=false;
    load(); clearInterval(timer); timer=setInterval(function(){ if(type==="orders") load() },30000);
  }
  function statusSelect(it,statuses){
    return '<select data-key="'+esc(it.key)+'" aria-label="Status">'+statuses.map(function(s){return '<option'+(s===it.status?' selected':'')+'>'+s+'</option>'}).join("")+'</select>';
  }
  var cls = function(s){return "badge s-"+String(s||"").split(" ")[0]};
  function render(data){
    var items = data.items, st = data.statuses;
    if(type==="subscribers") items.sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"")});
    var noun = type==="orders"?"order":type==="leads"?"request":"signup";
    $("#count").textContent = items.length+" "+noun+(items.length===1?"":"s");
    $("#csv").hidden = type!=="subscribers";
    $("#updated").textContent = "Updated "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
    if(!items.length){ $("#list").innerHTML='<div class="empty">Nothing here yet.</div>'; return; }
    $("#list").innerHTML = items.map(function(it){
      if(type==="orders") return '<article class="item"><div><h3>#'+it.orderNumber+' · '+esc(it.name)+'<span class="'+cls(it.status)+'">'+esc(it.status)+'</span></h3><div class="meta">Pickup '+esc(it.pickupLabel)+' · <a href="tel:'+esc(it.phone)+'">'+esc(it.phone)+'</a> · placed '+when(it.createdAt)+'</div><ul>'+
        (it.items||[]).map(function(l){return '<li>'+l.qty+'× '+esc(l.name)+' ('+esc(l.size)+')</li>'}).join("")+'</ul>'+(it.notes?'<div class="meta" style="margin-top:6px"><b>Notes:</b> '+esc(it.notes)+'</div>':'')+
        '</div><div><div class="total">$'+Number(it.total).toFixed(2)+'</div>'+statusSelect(it,st)+'</div></article>';
      if(type==="leads") return '<article class="item"><div><h3>'+esc(it.name)+'<span class="'+cls(it.status)+'">'+esc(it.status)+'</span></h3><div class="meta">'+esc(it.contact)+' · '+esc(it.goal)+(it.plan?' · '+esc(it.plan)+' plan':'')+' · '+when(it.createdAt)+'</div></div><div>'+statusSelect(it,st)+'</div></article>';
      return '<article class="item"><div><h3>'+esc(it.firstName)+'</h3><div class="meta">'+esc(it.email)+' · '+when(it.createdAt)+'</div></div></article>';
    }).join("");
  }
  function load(){ return api("/api/admin?type="+type).then(render).catch(function(e){ if(e.message!=="auth") $("#list").innerHTML='<div class="empty">'+esc(e.message)+'</div>' }) }

  $("#login").addEventListener("submit",function(e){
    e.preventDefault(); pw=$("#pw").value;
    api("/api/admin?type=orders").then(function(d){ try{ sessionStorage.setItem(KEY,pw) }catch(e){} start(); render(d); }).catch(function(){});
  });
  $("#logout").addEventListener("click",function(){ logout() });
  document.querySelector(".tabs").addEventListener("click",function(e){
    var b=e.target.closest(".tab"); if(!b) return; type=b.dataset.type;
    document.querySelectorAll(".tab").forEach(function(t){t.setAttribute("aria-selected",String(t===b))});
    $("#list").innerHTML=""; load();
  });
  $("#list").addEventListener("change",function(e){
    var s=e.target.closest("select[data-key]"); if(!s) return;
    api("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:type,key:s.dataset.key,status:s.value})}).then(load).catch(function(err){ alert(err.message) });
  });
  $("#csv").addEventListener("click",function(e){
    e.preventDefault();
    fetch("/api/admin?type=subscribers&format=csv",{headers:{Authorization:"Bearer "+pw}}).then(function(r){return r.blob()}).then(function(b){
      var a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="meal-plan-subscribers.csv"; a.click();
    });
  });
  if(pw) start();
})();
