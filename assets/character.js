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
  const copyJsonBtn = document.getElementById('copyJson')

  let data = null

  async function load(){
    try{
      const res = await fetch(samplePath)
      if(!res.ok) throw new Error('not found')
      const j = await res.json()
      data = j.kind === 'character' ? j.data : j
      normalizeData()
      render()
    }catch(e){
      // fallback: try samples/alice.json
      try{
        const res2 = await fetch('samples/alice.json')
        const j2 = await res2.json()
        data = j2.kind === 'character' ? j2.data : j2
        normalizeData()
        render()
      }catch(_){
        console.error('failed to load sample', e)
      }
    }
  }

  function normalizeData(){
    if(!data) return
    // ensure genso exists
    if(typeof data.genso !== 'number') data.genso = 0

    // normalize status: ensure 魔力 and 一時的魔力 exist
    const hasM = Array.isArray(data.status) && data.status.some(s=>s.label==='魔力')
    const hasT = Array.isArray(data.status) && data.status.some(s=>s.label==='一時的魔力')
    if(!Array.isArray(data.status)) data.status = []
    if(!hasM) data.status.unshift({label:'魔力', value:0, max:0})
    if(!hasT) data.status.push({label:'一時的魔力', value:0, max:0})

    // ensure numeric values
    data.status = data.status.map(s=>({label:s.label, value:Number(s.value||0), max:Number(s.max||0)}))

    // ensure grimoires array
    if(!Array.isArray(data.grimoires)) data.grimoires = []
    data.grimoires = data.grimoires.map(g=>({
      id:g.id||('g'+Date.now()),
      name_full:g.name_full||'',
      name_kanji:g.name_kanji||'',
      reading_kana:g.reading_kana||'',
      effect_text:g.effect_text||'',
      uses_current:Number(g.uses_current||0)
    }))
  }

  function render(){
    if(!data) return
    charNameEl.textContent = data.name || '無名'
    initiativeEl.textContent = (typeof data.initiative === 'number') ? data.initiative : (data.initiative||'-')
    // avatar
    if(data.image){ avatarImg.src = data.image } else if(data.externalUrl){ avatarImg.src = 'icons/icon.svg' }

    // status
    statusListEl.innerHTML = ''
    data.status.forEach(s=>{
      const d = document.createElement('div')
      d.textContent = `${s.label}: ${s.value} / ${s.max}`
      statusListEl.appendChild(d)
    })

    // grimoires
    grimoiresEl.innerHTML = ''
    data.grimoires.forEach(g=>{
      const d = document.createElement('div')
      d.innerHTML = `<b>${escapeHtml(g.name_kanji||g.name_full||'蔵書')}</b> <div class="muted">${escapeHtml(g.effect_text||'')}</div>`
      grimoiresEl.appendChild(d)
    })
  }

  function escapeHtml(s){return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;')}

  function buildCocoJson(){
    // Build a JSON structure suitable for ココフォリアのトークン作成に使える形式
    // Each grimoire becomes an entry with current=0 and max = character.genso
    const token = {
      name: data.name || '',
      initiative: data.initiative || 0,
      status: data.status.map(s=>({label:s.label, current:Number(s.value||0), max:Number(s.max||0)})),
      grimoires: data.grimoires.map(g=>({
        id: g.id,
        name: g.name_kanji || g.name_full || '',
        reading: g.reading_kana || '',
        effect: g.effect_text || '',
        current: 0,
        max: Number(data.genso || 0)
      })),
      meta: { source: 'trpgC', genso: Number(data.genso || 0) }
    }
    return token
  }

  async function copyCocoJson(){
    if(!data) return
    const coco = buildCocoJson()
    const text = JSON.stringify(coco, null, 2)
    // show preview
    tokensEl.textContent = text
    try{
      await navigator.clipboard.writeText(text)
      alert('ココフォリア用JSONをクリップボードにコピーしました')
    }catch(e){
      console.warn('clipboard write failed', e)
      alert('クリップボードへのコピーに失敗しました。ページ上のプレビューをコピーしてください。')
    }
  }

  copyJsonBtn.addEventListener('click', async ()=>{
    if(!data) return
    try{ await navigator.clipboard.writeText(JSON.stringify({kind:'character',data},null,2)); alert('キャラJSONをコピーしました') }catch(e){ alert('クリップボードにコピーできませんでした') }
  })

  makeTokenBtn.addEventListener('click', copyCocoJson)

  load()
})();
