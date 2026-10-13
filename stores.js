(() => {
  "use strict";
  const SUPABASE_URL = "https://tqezdoobcwzxqlvwrvxf.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_N0SR9meGBGO4VdGkGSK2JQ_-hNXj8kx";
  const $ = id => document.getElementById(id);
  let client, currentUser, stores = [];
  const notice = (message, type="") => { const el=$("notice"); el.textContent=message; el.className="message"+(type?" "+type:""); };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const slugify = value => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);
  function statusLabel(status){return String(status||"unknown").replaceAll("_"," ");}
  function renderStores(){
    $("storeCount").textContent=stores.length;
    $("allowance").textContent=stores.length ? "Used" : "1 store";
    const host=$("storesList");
    if(!stores.length){host.innerHTML='<div class="empty">You have not created a store yet. Use the form to create your free store.</div>';return;}
    host.innerHTML=stores.map(s=>`<article class="store-card"><div class="store-head"><div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description||"No description added yet.")}</p></div><span class="pill">${escapeHtml(statusLabel(s.status))}</span></div><div class="hint">Category: ${escapeHtml(s.category||"Not set")} · Created ${s.created_at?new Date(s.created_at).toLocaleDateString():"date unavailable"}</div><div class="form-actions"><button type="button" data-copy="${escapeHtml(s.slug||"")}">Copy store slug</button></div></article>`).join("");
    host.querySelectorAll("[data-copy]").forEach(btn=>btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy);notice("Store slug copied. Public store pages will be connected in a later step.","success");}catch{notice("Your store slug is: "+btn.dataset.copy);}}));
  }
  async function loadStores(){
    const {data,error}=await client.from("stores").select("id,name,slug,description,category,status,created_at").eq("owner_id",currentUser.id).order("created_at",{ascending:false});
    if(error) throw error;
    stores=data||[]; renderStores();
    let activeProductCount=0;
    if(stores.length){
      const ids=stores.map(s=>s.id);
      const {count,error:countError}=await client.from("products").select("id",{count:"exact",head:true}).in("store_id",ids).eq("status","active");
      if(!countError) activeProductCount=count||0;
    }
    $("listingUsage").textContent=activeProductCount+" active";
    const hasStore=stores.length>0;
    $("createPanel").style.display=hasStore?"none":"block";
    if(hasStore) notice("Your free store allowance is already in use. Additional store tiers will be enabled after plan and payment rules are implemented.","success");
    else notice("You're signed in. Create your first free store below. It will be submitted for review.");
  }
  async function init(){
    $("year").textContent=new Date().getFullYear();
    if(!window.supabase){notice("Could not load the Supabase client library. Check your internet connection and reload.","error");return;}
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{session},error}=await client.auth.getSession();
    if(error){notice("Unable to check your sign-in session: "+error.message,"error");return;}
    if(!session){notice("Please sign in to manage your stores. Redirecting to the sign-in page…");setTimeout(()=>{location.href="index.html";},1200);return;}
    currentUser=session.user;
    try{await loadStores();}catch(err){notice("Couldn't load your stores: "+(err.message||"Unknown error")+". Check your Supabase policies and table access.","error");}
  }
  $("storeForm").addEventListener("submit",async event=>{
    event.preventDefault(); if(!client||!currentUser)return;
    if(stores.length>=1){notice("Your free store allowance is already used. Paid store tiers are not active yet.","error");return;}
    const name=$("storeName").value.trim(), slug=slugify(name);
    if(!name||!slug){notice("Enter a store name containing letters or numbers.","error");return;}
    $("createBtn").disabled=true; $("createBtn").textContent="Creating…";
    try{
      const payload={owner_id:currentUser.id,name,slug,description:$("storeDescription").value.trim()||null,category:$("storeCategory").value||null,country_code:$("countryCode").value==="OTHER"?null:$("countryCode").value,currency:$("currency").value,status:"pending_review"};
      const {error}=await client.from("stores").insert(payload);
      if(error) throw error;
      $("storeForm").reset(); $("countryCode").value="ZW"; $("currency").value="USD";
      await loadStores();
      notice("Store created and submitted for review. You can prepare its profile while approval is pending.","success");
    }catch(err){notice("Store wasn't created: "+(err.message||"Unknown error")+". If the name is already taken, try another name.","error");}
    finally{$("createBtn").disabled=false;$("createBtn").textContent="Create free store";}
  });
  $("refreshBtn").addEventListener("click",async()=>{if(!client||!currentUser)return;try{await loadStores();}catch(err){notice("Refresh failed: "+err.message,"error");}});
  init();
})();