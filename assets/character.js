(function(){
  const q = new URLSearchParams(location.search)
  const id = q.get('id') || 'alice'
  const samplePath = `samples/${id}.json`
  const charNameEl = document.getElementById('charName')
  const initiativeEl = document.getElementById('initiative')
  const statusListEl = document.getElementById('statusList')
  const grimoiresEl = document.getElementById('grimoires')
  const avatarImg = document.getElementById('avatarImg')
  const makeTokenBtn = document.getElementById('makeToken')
  const tokensEl = document.getElementById('tokens')
  const downloadJsonBtn = document.getElementById('downloadJson')
  const copyJsonBtn = document.getElementById('copyJson')

  let data = null

  async function load(){
    try{
      const res = await fetch(samplePath)
      if(!res.ok) throw new Error('not found')
      const j = await res.json()
      data = j.kind === 'character' ? j.data : j
      render()
    }catch(e){
      // fallback: try samples/alice.json
      try{
        const res2 = await fetch('samples/alice.json')
        const j2 = await res2.json()
        data = j2.kind === 'character' ? j2.data : j2
        render()
      }catch(_){
        console.error('failed to load sample', e)
      }
    }
  }

  function render(){
    if(!data) return
    charNameEl.textContent = data.name || '無名'
    initiativeEl.textContent = (typeof data.initiative === 'number') ? data.initiative : (data.initiative||'-')
    // avatar
    if(data.image){ avatarImg.src = data.image } else if(data.externalUrl){ avatarImg.src = 'icons/icon.svg' }

    // status
    statusListEl.innerHTML = ''
    if(Array.isArray(data.status)){
      data.status.forEach(s=>{
        const d = document.createElement('div')
        d.textContent = `${s.label ?? ''}: ${s.value ?? ''}`
        statusListEl.appendChild(d)
      })
    }

    // grimoires
    grimoiresEl.innerHTML = ''
    if(Array.isArray(data.grimoires)){
      data.grimoires.forEach(g=>{
        const d = document.createElement('div')
        d.innerHTML = `<b>${escapeHtml(g.name_kanji||g.name_full||'蔵書')}</b> <div class="muted">${escapeHtml(g.effect_text||'')}</div>`
        grimoiresEl.appendChild(d)
      })
    }
  }

  function escapeHtml(s){return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;')}

  async function makeToken(){
    // create 512x512 PNG from image (if available) or render name
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,512,512)

    if(data && data.image){
      try{
        const img = await loadImage(data.image)
        // fit and center
        const iw = img.naturalWidth, ih = img.naturalHeight
        const s = Math.min(iw, ih)
        // draw scaled to fill 512
        const sx = Math.max(0, (iw - s)/2)
        const sy = Math.max(0, (ih - s)/2)
        ctx.drawImage(img, sx, sy, s, s, 0, 0, 512, 512)
      }catch(e){
        drawFallback(ctx)
      }
    }else{
      drawFallback(ctx)
    }

    canvas.toBlob(async (blob)=>{
      if(!blob) return

      // append to tokens area (preview)
      const blobUrl = URL.createObjectURL(blob)
      const imgEl = document.createElement('img')
      imgEl.src = blobUrl
      imgEl.width = 96; imgEl.height = 96
      imgEl.draggable = true
      imgEl.className = 'token-item'
      imgEl.addEventListener('dragstart', (ev)=>{
        try{ ev.dataTransfer.setData('text/uri-list', imgEl.src); ev.dataTransfer.setData('text/plain', imgEl.src) }catch(e){}
      })
      const wrap = document.createElement('div')
      wrap.className = 'token-item'
      wrap.appendChild(imgEl)
      tokensEl.appendChild(wrap)

      // copy PNG to clipboard only (no download)
      try{
        if(navigator.clipboard && navigator.clipboard.write){
          const item = new ClipboardItem({'image/png': blob})
          await navigator.clipboard.write([item])
          alert('トークン画像をクリップボードにコピーしました')
        }else{
          alert('このブラウザでは画像のクリップボード書き込みがサポートされていません')
        }
      }catch(e){
        console.warn('clipboard write failed', e)
        alert('クリップボードへのコピーに失敗しました（CORSや権限が原因の可能性があります）')
      }

      // revoke blobUrl later to free memory
      setTimeout(()=>{ URL.revokeObjectURL(blobUrl) }, 10000)

    }, 'image/png')
  }

  function drawFallback(ctx){
    // simple placeholder with name
    ctx.fillStyle = '#2b6cf6'
    ctx.fillRect(0,0,512,512)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '40px sans-serif'
    ctx.fillText((data && data.name) ? data.name : '無名', 256, 256)
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img = new Image()
      // allow CORS data URLs and same-origin; if external URL blocks CORS, drawImage may taint canvas
      img.crossOrigin = 'anonymous'
      img.onload = ()=>resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  downloadJsonBtn.addEventListener('click', ()=>{
    if(!data) return
    const txt = JSON.stringify({kind:'character',data},null,2)
    const blob = new Blob([txt],{type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = (data.name||'character') + '.json'; a.click(); URL.revokeObjectURL(url)
  })
  copyJsonBtn.addEventListener('click', async ()=>{
    if(!data) return
    try{ await navigator.clipboard.writeText(JSON.stringify({kind:'character',data},null,2)); alert('JSON をコピーしました') }catch(e){ alert('クリップボードにコピーできませんでした') }
  })

  makeTokenBtn.addEventListener('click', makeToken)

  load()
})();
