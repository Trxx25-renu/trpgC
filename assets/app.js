// Minimal app.js implementing required features
(() => {
  const $ = id=>document.getElementById(id)
  const nameEl = $('name'), initEl = $('initiative'), statusList = $('statusList'), addStatus = $('addStatus')
  const grimoiresEl = $('grimoires'), addGrimoire = $('addGrimoire')
  const genJson = $('genJson'), previewJson = $('previewJson'), downloadSample = $('downloadSample')
  const fileEl = $('file'), preview = $('preview'), scaleEl = $('scale'), yoffsetEl = $('yoffset'), exportPng = $('exportPng'), downloadPng = $('downloadPng')

  // state
  let img = null, imgBitmap = null
  const state = {
    name:'', initiative:-1,
    status:[{label:'魔力',value:'0',max:'根源力'},{label:'一時的魔力',value:'',max:null}],
    grimoires:[],
    imageDataUrl:null
  }

  function renderStatus(){
    statusList.innerHTML=''
    state.status.forEach((s,i)=>{
      const div=document.createElement('div')
      div.className='statusItem'
      div.innerHTML=`<input data-i='${i}' class='st-label' value='${s.label}'><input data-i='${i}' class='st-val' value='${s.value}' placeholder='0'><input data-i='${i}' class='st-max' value='${s.max||''}' placeholder='max'><button data-i='${i}' class='rm'>削除</button>`
      statusList.appendChild(div)
    })
  }
  function renderGrimoires(){
    grimoiresEl.innerHTML=''
    state.grimoires.forEach((g,i)=>{
      const div=document.createElement('div')
      div.className='grimoire'
      div.innerHTML=`<input data-i='${i}' class='g-full' placeholder='フル名称' value='${escapeHtml(g.name_full||'')}'><input data-i='${i}' class='g-kanji' placeholder='漢字名' value='${escapeHtml(g.name_kanji||'')}'><input data-i='${i}' class='g-kana' placeholder='読み（カタカナ）' value='${escapeHtml(g.reading_kana||'')}'><textarea data-i='${i}' class='g-effect' placeholder='効果文'>${escapeHtml(g.effect_text||'')}</textarea><button data-i='${i}' class='g-rm'>削除</button>`
      grimoiresEl.appendChild(div)
    })
  }

  function escapeHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}

  addStatus.addEventListener('click',()=>{ state.status.push({label:'新規',value:0,max:'根源力'}); renderStatus(); })
  addGrimoire.addEventListener('click',()=>{ state.grimoires.push({id:'g'+Date.now(),name_full:'',name_kanji:'',reading_kana:'',effect_text:'',uses_current:0,uses_max:'根源力'}); renderGrimoires(); })

  statusList.addEventListener('input',e=>{
    const i = +e.target.dataset.i; if(isNaN(i)) return
    if(e.target.classList.contains('st-label')) state.status[i].label = e.target.value
    if(e.target.classList.contains('st-val')) state.status[i].value = e.target.value
    if(e.target.classList.contains('st-max')) state.status[i].max = e.target.value||null
  })
  statusList.addEventListener('click',e=>{ if(e.target.classList.contains('rm')){ const i=+e.target.dataset.i; state.status.splice(i,1); renderStatus() } })

  grimoiresEl.addEventListener('input',e=>{
    const i=+e.target.dataset.i; if(isNaN(i)) return
    if(e.target.classList.contains('g-full')) state.grimoires[i].name_full = e.target.value
    if(e.target.classList.contains('g-kanji')) state.grimoires[i].name_kanji = e.target.value
    if(e.target.classList.contains('g-kana')) state.grimoires[i].reading_kana = e.target.value
    if(e.target.classList.contains('g-effect')) state.grimoires[i].effect_text = e.target.value
  })
  grimoiresEl.addEventListener('click',e=>{ if(e.target.classList.contains('g-rm')){ const i=+e.target.dataset.i; state.grimoires.splice(i,1); renderGrimoires() } })

  nameEl.addEventListener('input',()=> state.name = nameEl.value)
  initEl.addEventListener('input',()=> state.initiative = Number(initEl.value)||-1)

  // load sample
  downloadSample.addEventListener('click',()=>{
    fetch('samples/alice.json').then(r=>r.json()).then(j=>{ // merge
      state.name = j.data.name || 'アリス'
      state.initiative = j.data.initiative
      state.status = j.data.status
      state.grimoires = j.data.grimoires
      nameEl.value = state.name; initEl.value = state.initiative; renderStatus(); renderGrimoires(); updatePreview()
    })
  })

  function buildExport(){
    // Build chat palette single string and array
    const chatPaletteArray = state.grimoires.map(g=>{
      return `【${g.name_kanji||g.name_full||'蔵書'}（${g.reading_kana||''}）】\n効果: ${g.effect_text||''}\n消費: ${g.uses_max||'根源力'}`
    })
    const chatPalette = chatPaletteArray.join('\n\n')
    const out = {kind:'character',data:{name:state.name||'',initiative:state.initiative||-1,externalUrl:location.href,status:state.status,grimoires:state.grimoires,chatPalette,chatPaletteArray,image:state.imageDataUrl||null}}
    return out
  }

  genJson.addEventListener('click',async()=>{
    const out = buildExport()
    const text = JSON.stringify(out,null,2)
    previewJson.textContent = text
    try{ await navigator.clipboard.writeText(text); alert('JSON をクリップボードにコピーしました') }catch(e){console.warn(e);}
    // download
    const blob = new Blob([text],{type:'application/json'}); const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download=(state.name||'character')+'.json'; a.click(); URL.revokeObjectURL(url)
  })

  function updatePreview(){ previewJson.textContent = JSON.stringify(buildExport(),null,2) }

  // Image / cropping
  const canvas = preview; const ctx = canvas.getContext('2d')
  let scale = 1, yoffset = 0
  scaleEl.addEventListener('input',e=>{ scale = Number(e.target.value); drawPreview() })
  yoffsetEl.addEventListener('input',e=>{ yoffset = Number(e.target.value); drawPreview() })

  fileEl.addEventListener('change',async e=>{
    const f = e.target.files[0]; if(!f) return
    const url = URL.createObjectURL(f)
    img = new Image(); img.onload = ()=>{ URL.revokeObjectURL(url); drawPreview() }
    img.src = url
  })

  function drawPreview(){
    if(!img) { canvas.width=400; canvas.height=400; ctx.fillStyle='#333'; ctx.fillRect(0,0,canvas.width,canvas.height); return }
    // square area: use 400x400 preview but maintain internal scale
    const size = 420
    canvas.width = size; canvas.height = size
    // determine source rect from original image
    const iw = img.width, ih = img.height
    // focus on upper third by default; allow yoffset
    const centerY = ih*0.25 + yoffset
    const s = Math.min(iw, ih) / scale
    const sx = Math.max(0, (iw - s)/2)
    const sy = Math.max(0, centerY - s/2)
    ctx.clearRect(0,0,size,size)
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
  }

  exportPng.addEventListener('click',()=>{
    if(!img){ alert('画像がありません'); return }
    // generate 512x512 PNG
    const outCanvas = document.createElement('canvas'); outCanvas.width = 512; outCanvas.height = 512
    const outCtx = outCanvas.getContext('2d')
    // compute same source as drawPreview but scaled to 512
    const iw = img.width, ih = img.height
    const centerY = ih*0.25 + yoffset
    const s = Math.min(iw, ih) / scale
    const sx = Math.max(0, (iw - s)/2)
    const sy = Math.max(0, centerY - s/2)
    outCtx.fillStyle = 'rgba(0,0,0,0)'
    outCtx.clearRect(0,0,512,512)
    outCtx.drawImage(img, sx, sy, s, s, 0, 0, 512, 512)
    outCanvas.toBlob((blob)=>{
      const url = URL.createObjectURL(blob)
      downloadPng.href = url; downloadPng.download = (state.name||'token') + '.png'; downloadPng.style.display='inline-block'; downloadPng.textContent='512×512 PNG をダウンロード'
      // also store data url for embedding
      const r = new FileReader(); r.onload = ()=>{ state.imageDataUrl = r.result; updatePreview() }; r.readAsDataURL(blob)
    },'image/png')
  })

  // initial render
  renderStatus(); renderGrimoires(); updatePreview()

  // service worker registration
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}) }

})();
