(function(){
  /* ---- Settings: update these ---- */
  var DOORDASH_URL = "https://www.doordash.com/store/planet-juice-southgate-30234389/39308575/";
  var TZ = "America/Detroit";

  /* Menu, prices and categories live in data/menu.json, which the server
     also reads to price pickup orders. Edit prices there, in one place. */
  var PRODUCTS = [], NOTES = {}, CATS = ["Smoothies"];
  var REVIEWS = [
    ["I lost 32 lbs in 3 months with Planet Juice. Ewah’s meal plans are the real deal. I never felt hungry once.","Marcus T.","Detroit, MI","av-p"],
    ["The transformation package was the best investment I’ve made in myself. Down 4 dress sizes and feeling incredible.","Jasmine R.","Atlanta, GA","av-i"],
    ["I’ve tried every gym and trainer. None of them gave me results like this. The online coaching is elite.","Derek B.","Chicago, IL","av-l"],
    ["Planet Juice smoothies and supplements are top tier. I feel the difference every single day.","Keisha M.","Houston, TX","av-l"],
    ["Ewah holds you accountable like no one else. Best decision I made was booking that free call.","Andre W.","Detroit, MI","av-p"],
    ["Lost 18 lbs and gained so much muscle. The meal prep service changed my whole life.","Tanya L.","Cleveland, OH","av-i"]
  ];

  var $ = function(s,r){return (r||document).querySelector(s)};
  var $$ = function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var money = function(n){return "$"+n.toFixed(2)};
  var esc = function(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};

  $$(".js-doordash").forEach(function(a){a.href = DOORDASH_URL});
  $("#yr").textContent = new Date().getFullYear();

  /* reviews */
  var star = '<svg viewBox="0 0 24 24"><use href="#i-star"/></svg>';
  $("#reviews").innerHTML = REVIEWS.map(function(r){
    var ini = r[1].split(" ").map(function(w){return w[0]}).join("").replace(".","");
    return '<figure class="card rev" style="margin:0"><div class="stars" aria-label="5 out of 5 stars">'+star+star+star+star+star+'</div><blockquote>“'+esc(r[0])+'”</blockquote><figcaption class="who"><span class="avatar '+r[3]+'" aria-hidden="true">'+ini+'</span><span><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></span></figcaption></figure>';
  }).join("");

  /* open status + today's hours */
  var HOURS = {0:[10,19],1:[9,22],2:[9,22],3:[9,22],4:[9,22],5:[9,22],6:[9,21]};
  function fmt(h){var ap=h>=12?"pm":"am";var x=h%12||12;return x+ap}
  try{
    var parts = new Intl.DateTimeFormat("en-US",{timeZone:TZ,weekday:"short",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date());
    var get = function(t){return (parts.filter(function(p){return p.type===t})[0]||{}).value};
    var day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(get("weekday"));
    var hr = parseInt(get("hour"),10)%24 + parseInt(get("minute"),10)/60;
    var h = HOURS[day], txt;
    if(hr>=h[0] && hr<h[1]) txt = "Open now until "+fmt(h[1]);
    else if(hr<h[0]) txt = "Opens today at "+fmt(h[0]);
    else txt = "Closed now · Opens "+fmt(HOURS[(day+1)%7][0])+" tomorrow";
    $("#open-status").textContent = txt;
    $$("#hours-table tr").forEach(function(tr){ if(tr.dataset.days.split(",").indexOf(String(day))>-1) tr.classList.add("today") });
  }catch(e){}

  /* mobile nav */
  var mt=$("#menu-toggle"), mn=$("#mobile-nav");
  mt.addEventListener("click",function(){var o=mn.hidden; mn.hidden=!o; mt.setAttribute("aria-expanded",String(o)); mt.innerHTML='<svg class="ico"><use href="#i-'+(o?"x":"menu")+'"/></svg>'});
  $$("#mobile-nav a").forEach(function(a){a.addEventListener("click",function(){mn.hidden=true;mt.setAttribute("aria-expanded","false");mt.innerHTML='<svg class="ico"><use href="#i-menu"/></svg>'})});

  /* menu */
  var current = "Smoothies";
  function renderChips(){
    $("#chips").innerHTML = CATS.map(function(c){return '<button class="chip" type="button" aria-pressed="'+(c===current)+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>'}).join("");
  }
  function renderProducts(){
    $("#menu-note").textContent = NOTES[current] || "Prices for this part of the menu are in store and on DoorDash.";
    var list = PRODUCTS.filter(function(p){return current==="All"||p.cat===current});
    if(!list.length){
      $("#products").innerHTML = '<div class="empty-cat"><h3>'+esc(current)+': in store and on DoorDash</h3><p>This part of the menu isn\'t online yet. Order it at the counter on Eureka Road or through DoorDash.</p><a class="btn btn-purple js-doordash" href="'+DOORDASH_URL+'" target="_blank" rel="noopener">Order on DoorDash</a></div>';
      return;
    }
    $("#products").innerHTML = list.map(function(p){
      var top = '<article class="prod'+(p.sizes?'':' prod-info')+'" data-id="'+p.id+'"><div class="prod-img"><span class="cat-badge">'+esc(p.cat)+'</span><img src="'+p.img+'" alt="'+esc(p.name)+'" loading="lazy"></div><div class="prod-body"><h3>'+esc(p.name)+'</h3><p>'+esc(p.desc)+'</p>'+(p.stats?'<span class="nutri">'+esc(p.stats)+'</span>':'');
      if(!p.sizes) return top+'<div class="prod-foot"><span class="instore">Price in store</span><a class="btn btn-line add js-doordash" href="'+DOORDASH_URL+'" target="_blank" rel="noopener">Order</a></div></div></article>';
      return top+'<div class="sizes" role="group" aria-label="Size">'+
        p.sizes.map(function(s,i){return '<button class="size" type="button" aria-pressed="'+(i===0)+'" data-i="'+i+'">'+s[0]+'<span class="size-p"> · '+money(s[1])+'</span></button>'}).join("")+
        '</div><div class="prod-foot"><b class="price">'+money(p.sizes[0][1])+'</b><button class="btn btn-purple add" type="button"><svg class="ico"><use href="#i-plus"/></svg>Add</button></div></div></article>';
    }).join("");
  }
  $("#chips").addEventListener("click",function(e){var b=e.target.closest(".chip"); if(!b) return; current=b.dataset.cat; renderChips(); renderProducts();});
  $("#products").addEventListener("click",function(e){
    var card = e.target.closest(".prod"); if(!card || card.classList.contains("prod-info")) return;
    var p = PRODUCTS.filter(function(x){return x.id===card.dataset.id})[0];
    var sz = e.target.closest(".size");
    if(sz){ $$(".size",card).forEach(function(b){b.setAttribute("aria-pressed",String(b===sz))}); $(".price",card).textContent = money(p.sizes[+sz.dataset.i][1]); return; }
    var add = e.target.closest(".add");
    if(add){
      var i = +$(".size[aria-pressed=true]",card).dataset.i;
      addToCart(p,i);
      add.classList.add("added"); add.innerHTML='<svg class="ico"><use href="#i-check"/></svg>Added';
      setTimeout(function(){add.classList.remove("added"); add.innerHTML='<svg class="ico"><use href="#i-plus"/></svg>Add'},1200);
    }
  });
  fetch("/data/menu.json").then(function(r){return r.json()}).then(function(m){
    PRODUCTS = m.products; NOTES = m.notes; CATS = m.categories;
    renderChips(); renderProducts();
  }).catch(function(){
    $("#products").innerHTML = '<div class="empty-cat"><h3>Menu is loading slowly</h3><p>Refresh the page, or order through DoorDash.</p></div>';
  });

  /* cart */
  var cart = [];
  try{ cart = JSON.parse(localStorage.getItem("pj-cart")||"[]") || [] }catch(e){ cart = [] }
  function save(){ try{ localStorage.setItem("pj-cart",JSON.stringify(cart)) }catch(e){} }
  function addToCart(p,i){
    var key = p.id+"|"+i, line = cart.filter(function(l){return l.key===key})[0];
    if(line) line.qty++; else cart.push({key:key,id:p.id,name:p.name,size:p.sizes[i][0],price:p.sizes[i][1],img:p.img,qty:1});
    save(); renderCart(); toast(p.name+" ("+p.sizes[i][0]+") added to cart");
  }
  function renderCart(){
    var n = cart.reduce(function(a,l){return a+l.qty},0), sub = cart.reduce(function(a,l){return a+l.qty*l.price},0);
    var cc=$("#cart-count"); if(String(n)!==cc.textContent && n>0){cc.classList.remove("bump"); void cc.offsetWidth; cc.classList.add("bump");}
    cc.textContent = n; cc.dataset.n = n; $("#cart-count-2").textContent = n;
    $("#subtotal").textContent = money(sub);
    $("#cart-items").innerHTML = cart.length ? cart.map(function(l){
      return '<div class="line" data-key="'+l.key+'"><img src="'+l.img+'" alt=""><div><b>'+esc(l.name)+'</b><small>'+l.size+' · '+money(l.price)+'</small><div class="qty"><button type="button" data-d="-1" aria-label="Remove one">−</button><span>'+l.qty+'</span><button type="button" data-d="1" aria-label="Add one">+</button></div></div><span class="line-price">'+money(l.qty*l.price)+'</span></div>';
    }).join("") : '<p class="cart-empty">Your cart is empty. Add a smoothie from the menu to get started.</p>';
  }
  $("#cart-items").addEventListener("click",function(e){
    var b = e.target.closest("button[data-d]"); if(!b) return;
    var key = b.closest(".line").dataset.key;
    cart.forEach(function(l){ if(l.key===key) l.qty += +b.dataset.d });
    cart = cart.filter(function(l){return l.qty>0}); save(); renderCart();
  });
  var drawer=$("#drawer"), scrim=$("#scrim");
  function openCart(){drawer.classList.add("open");scrim.classList.add("open");drawer.setAttribute("aria-hidden","false");$("#cart-close").focus()}
  function closeCart(){drawer.classList.remove("open");scrim.classList.remove("open");drawer.setAttribute("aria-hidden","true")}
  $("#cart-open").addEventListener("click",openCart); $("#cart-open-2").addEventListener("click",openCart);
  $("#cart-close").addEventListener("click",closeCart); scrim.addEventListener("click",closeCart);
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeCart()});
  $$("[data-quick-add]").forEach(function(b){b.addEventListener("click",function(){var p=PRODUCTS.filter(function(x){return x.id===b.dataset.quickAdd})[0]; addToCart(p,0)})});
  renderCart();

  var tt; function toast(m){var t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(function(){t.classList.remove("show")},2000)}

  /* prefill the free-call form from buttons */
  $$("[data-goal],[data-plan]").forEach(function(a){a.addEventListener("click",function(){
    if(a.dataset.goal){ $$('input[name=goal]').forEach(function(r){ r.checked = r.value===a.dataset.goal }) }
    $("#plan-field").value = a.dataset.plan || "";
    var chip=$("#plan-chip"); if(a.dataset.plan){chip.textContent="Interested in the "+a.dataset.plan+" plan";chip.hidden=false}else{chip.hidden=true}
  })});

  /* forms: posted as JSON to the site's own API (netlify/functions) */
  function send(url,data){
    return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)})
      .then(function(r){ return r.json().catch(function(){return {}}).then(function(j){ if(!r.ok) throw new Error(j.error||"failed"); return j; }) });
  }
  var FALLBACK = "We couldn't send that just now. Please call us at (734) 444-2819 or try again.";
  function wire(form,msg,okText){
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var btn = form.querySelector("[type=submit]"), label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      var data = Object.fromEntries(new FormData(form).entries());
      send(form.getAttribute("action"),data)
        .then(function(){ msg.textContent = okText; msg.classList.remove("err"); msg.hidden=false; form.reset(); })
        .catch(function(err){ msg.textContent = err.message && err.message!=="failed" ? err.message : FALLBACK; msg.classList.add("err"); msg.hidden=false; })
        .then(function(){ btn.disabled=false; btn.textContent=label; });
    });
  }

  /* order ahead for pickup */
  function pickupSlots(){
    var sel = $("#pu-time"), out = [];
    try{
      var pr = new Intl.DateTimeFormat("en-US",{timeZone:TZ,weekday:"short",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date());
      var g = function(t){return (pr.filter(function(p){return p.type===t})[0]||{}).value};
      var d = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(g("weekday"));
      var now = (parseInt(g("hour"),10)%24)*60 + parseInt(g("minute"),10), h = HOURS[d];
      var open = h[0]*60, close = h[1]*60 - 15;
      if(now < open-60 || now >= close) return 0; /* online ordering opens an hour before the shop */
      if(now >= open) out.push(["ASAP","As soon as possible (about 15 min)"]);
      var t = Math.max(open, Math.ceil((now+20)/15)*15);
      for(; t<=close; t+=15){ var hh=Math.floor(t/60), mm=t%60; out.push([String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0"), (hh%12||12)+":"+String(mm).padStart(2,"0")+(hh>=12?" pm":" am")]); }
    }catch(e){}
    sel.innerHTML = out.map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join("");
    return out.length;
  }
  var pf = $("#pickup-form"), pmsg = $("#pickup-msg");
  $("#pickup-open").addEventListener("click",function(){
    pmsg.hidden = true;
    if(!cart.length){ pmsg.textContent="Add something from the menu first."; pmsg.classList.add("err"); pmsg.hidden=false; return; }
    if(!pickupSlots()){ pmsg.textContent="Online ordering is closed for today. Order on DoorDash or come by tomorrow."; pmsg.classList.add("err"); pmsg.hidden=false; return; }
    pf.hidden = false; this.hidden = true; $("#pu-name").focus();
  });
  pf.addEventListener("submit",function(e){
    e.preventDefault();
    var btn = pf.querySelector("[type=submit]"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Placing order…";
    var data = Object.fromEntries(new FormData(pf).entries());
    data.items = cart.map(function(l){return {id:l.id,size:l.size,qty:l.qty}});
    send("/api/orders",data).then(function(j){
      cart = []; save(); renderCart(); pf.reset(); pf.hidden = true; $("#pickup-open").hidden = false;
      pmsg.textContent = "Order #"+j.orderNumber+" is in. Total "+money(j.total)+", paid at pickup. "+(j.pickup==="ASAP"?"See you in about 15 minutes.":"See you at "+j.pickupLabel+".");
      pmsg.classList.remove("err"); pmsg.hidden = false;
    }).catch(function(err){
      pmsg.textContent = err.message && err.message!=="failed" ? err.message : FALLBACK; pmsg.classList.add("err"); pmsg.hidden = false;
    }).then(function(){ btn.disabled=false; btn.textContent=label; });
  });
  wire($("#meal-form"),$("#meal-msg"),"You're in. Check your inbox for your 7-day meal plan.");

  /* light motion */
  (function(){
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js");
    var els = $$(".prob-grid .card, .mission, .svc, .rev, .pkg, .book-grid > *, .extra, .pillar, .mural, .faq, .visit-grid > *, .paths .path");
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
    },{rootMargin:"0px 0px -6% 0px"});
    els.forEach(function(el,i){
      var r = el.getBoundingClientRect();
      if(r.top < window.innerHeight) return;
      el.classList.add("reveal"); el.style.transitionDelay = ((i%3)*70)+"ms"; io.observe(el);
    });
    var hero = $(".hero"), img = $(".hero-media img");
    if(hero && img && window.matchMedia("(hover:hover) and (min-width:1101px)").matches){
      hero.addEventListener("mousemove",function(e){
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5;
        img.style.translate = (x*-14)+"px "+(y*-10)+"px";
      });
      hero.addEventListener("mouseleave",function(){ img.style.translate = "0 0"; });
    }
  })();
  wire($("#call-form"),$("#call-msg"),"Got it. We'll reach out within one business day.");
})();
