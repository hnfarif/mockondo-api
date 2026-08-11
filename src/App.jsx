import { useEffect, useMemo, useRef, useState } from 'react'

const starter = {
  id: crypto.randomUUID(), name: 'Daftar produk', method: 'GET', path: '/api/products', status: 200,
  delay: 350, contentType: 'application/json', headers: [{ key: 'Cache-Control', value: 'no-store' }],
  body: JSON.stringify({ data: [{ id: 1, name: 'Mechanical Keyboard', price: 850000 }], meta: { total: 1 } }, null, 2),
}
const tone = (status) => status >= 500 ? 'text-red-300 bg-red-400/10 border-red-400/25' : status >= 400 ? 'text-amber-300 bg-amber-400/10 border-amber-400/25' : 'text-lime bg-lime/10 border-lime/25'

export default function App() {
  const [mocks, setMocks] = useState([starter])
  const [selectedId, setSelectedId] = useState(mocks[0]?.id)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const autoSynced = useRef(false)
  const selected = useMemo(() => mocks.find((mock) => mock.id === selectedId) || mocks[0], [mocks, selectedId])
  const slug = (selected?.slug || selected?.path || selected?.name || 'mock').replace(/^\/+/, '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mock'
  const publicUrl = `${window.location.origin}/m/${slug}`

  const update = (patch) => setMocks((items) => items.map((item) => item.id === selected.id ? { ...item, ...patch } : item))
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  const addMock = () => {
    const item = { ...starter, id: crypto.randomUUID(), name: 'Mock baru', path: `/api/endpoint-${mocks.length + 1}`, headers: [{ key: '', value: '' }] }
    setMocks((items) => [...items, item]); setSelectedId(item.id); setResult(null)
  }
  const remove = async () => {
    if (mocks.length === 1) return flash('Minimal satu mock harus tersedia.')
    try {
      if (selected.slug) {
        const response = await adminFetch(`/api/admin/mocks/${encodeURIComponent(selected.slug)}`, { method: 'DELETE' })
        if (!response.ok && response.status !== 404) throw new Error()
      }
      const remaining = mocks.filter((item) => item.id !== selected.id)
      setMocks(remaining); setSelectedId(remaining[0].id); setResult(null); flash('Mock berhasil dihapus.')
    } catch { flash('Mock belum terhapus. Periksa koneksi lalu coba lagi.') }
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return
    try { const text = await file.text(); JSON.parse(text); update({ body: JSON.stringify(JSON.parse(text), null, 2) }); flash('JSON berhasil dimuat.') }
    catch { flash('File harus berisi JSON yang valid.') }
    event.target.value = ''
  }
  const simulate = async () => {
    setResult({ loading: true })
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(selected.delay) || 0)))
    try { setResult({ status: selected.status, headers: selected.headers.filter((h) => h.key), body: JSON.parse(selected.body), elapsed: selected.delay }) }
    catch { setResult({ error: 'Response body bukan JSON valid. Perbaiki sebelum menjalankan simulasi.' }) }
  }
  const exportMock = () => { navigator.clipboard.writeText(JSON.stringify(selected, null, 2)); flash('Konfigurasi mock disalin ke clipboard.') }
  const adminFetch = async (url, options = {}) => {
    const request = () => fetch(url, { ...options, credentials: 'include', headers: { ...(options.headers || {}) } })
    let response = await request()
    if (response.status !== 401) return response
    const token = window.prompt('Masukkan token admin Mockondo untuk melanjutkan:')
    if (!token) return response
    const login = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    if (!login.ok) throw new Error('invalid-token')
    return request()
  }
  const publish = async () => {
    let body
    try { body = JSON.parse(selected.body) } catch { return flash('Response body harus berupa JSON valid.') }
    setPublishing(true)
    try {
      const response = await adminFetch('/api/admin/mocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, method: selected.method, status: selected.status, delay: selected.delay, headers: Object.fromEntries(selected.headers.filter((h) => h.key).map((h) => [h.key, h.value])), body }) })
      if (!response.ok) throw new Error()
      update({ slug })
      flash('Mock berhasil dipublikasikan.')
    } catch (error) { flash(error.message === 'invalid-token' ? 'Token admin tidak valid. Silakan coba lagi.' : 'Belum berhasil menyimpan perubahan. Periksa koneksi lalu coba lagi.') }
    finally { setPublishing(false) }
  }
  const syncFromApi = async () => {
    setSyncing(true)
    try {
      const response = await adminFetch('/api/admin/mocks')
      if (!response.ok) throw new Error()
      const remote = await response.json()
      const items = Object.entries(remote).map(([remoteSlug, mock]) => ({ ...starter, ...mock, id: mock.id || crypto.randomUUID(), slug: remoteSlug, name: mock.name || remoteSlug, path: mock.path || `/${remoteSlug}`, body: JSON.stringify(mock.body ?? {}, null, 2), headers: Object.entries(mock.headers || {}).map(([key, value]) => ({ key, value })) }))
      if (!items.length) return flash('Belum ada mock di Redis.')
      setMocks(items); setSelectedId(items[0].id); setResult(null); flash(`${items.length} mock berhasil disinkronkan dari Redis.`)
    } catch { flash('Belum berhasil memuat data. Periksa koneksi lalu coba lagi.') }
    finally { setSyncing(false) }
  }
  useEffect(() => {
    if (autoSynced.current) return
    autoSynced.current = true
    syncFromApi()
  }, [])
  if (!selected) return null

  return <main className="min-h-screen grid-bg">
    <header className="border-b border-line/90 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-lg font-black text-ink">M</span><div><h1 className="font-display text-xl font-black tracking-tight">mockondo</h1><p className="text-xs text-muted">response simulator</p></div></div>
        <div className="hidden text-sm text-muted sm:block">Redis sebagai sumber data utama.</div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 p-5 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
      <aside className="rounded-2xl border border-line bg-panel/85 p-3">
        <div className="mb-3 flex items-center justify-between px-2 pt-1"><span className="text-xs font-bold uppercase tracking-widest text-muted">Endpoints</span><div className="flex items-center gap-1.5"><button onClick={syncFromApi} disabled={syncing} title="Muat ulang dari Redis" aria-label="Muat ulang dari Redis" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-lg text-muted hover:border-lime hover:text-lime disabled:opacity-50">↻</button><button onClick={addMock} className="rounded-lg bg-lime px-2.5 py-1 text-sm font-bold text-ink">+ Baru</button></div></div>
        <div className="space-y-1">{mocks.map((mock) => <button key={mock.id} onClick={() => { setSelectedId(mock.id); setResult(null) }} className={`w-full rounded-xl p-3 text-left transition ${mock.id === selected.id ? 'bg-white/9 ring-1 ring-lime/50' : 'hover:bg-white/5'}`}><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{mock.name}</span><span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${tone(mock.status)}`}>{mock.status}</span></div><p className="mt-1 truncate text-xs text-muted"><b className="mr-1 text-lime">{mock.method}</b>{mock.path}</p></button>)}</div>
      </aside>
      <section className="space-y-5">
        <div className="rounded-2xl border border-line bg-panel/85 p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Mock configuration</p><h2 className="mt-1 text-2xl font-bold">Atur respons endpoint</h2></div><div className="flex gap-2"><button onClick={exportMock} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-muted">Salin config</button><button onClick={remove} className="rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10">Hapus</button></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Nama mock</label><input className="field" value={selected.name} onChange={(e) => update({ name: e.target.value })}/></div><div><label className="label">Path (untuk referensi)</label><input className="field" value={selected.path} onChange={(e) => update({ path: e.target.value })}/></div><div><label className="label">Method</label><select className="field" value={selected.method} onChange={(e) => update({ method: e.target.value })}>{['GET','POST','PUT','PATCH','DELETE'].map((x) => <option key={x}>{x}</option>)}</select></div><div><label className="label">Status code</label><input className="field" type="number" min="100" max="599" value={selected.status} onChange={(e) => update({ status: Number(e.target.value) })}/></div><div><label className="label">Content-Type</label><input className="field" value={selected.contentType} onChange={(e) => update({ contentType: e.target.value })}/></div><div><label className="label">Timeout / delay (ms)</label><input className="field" type="number" min="0" value={selected.delay} onChange={(e) => update({ delay: Number(e.target.value) })}/></div></div>
          <div className="mt-5"><div className="mb-2 flex items-center justify-between"><label className="label mb-0">Response body</label><label className="cursor-pointer text-xs font-semibold text-lime hover:underline">Muat file .json / .txt<input className="hidden" type="file" accept=".json,.txt,application/json,text/plain" onChange={importFile}/></label></div><textarea className="field min-h-70 font-mono text-sm leading-6" spellCheck="false" value={selected.body} onChange={(e) => update({ body: e.target.value })}/></div>
          <Headers headers={selected.headers} update={(headers) => update({ headers })}/>
          <div className="mt-5 flex flex-wrap items-center gap-3"><button onClick={simulate} className="rounded-xl bg-lime px-5 py-3 font-bold text-ink shadow-[0_0_28px_rgba(198,251,80,.18)] hover:bg-[#d5ff77]">Jalankan simulasi →</button><button onClick={publish} disabled={publishing} className="rounded-xl border border-lime/40 px-5 py-3 font-bold text-lime hover:bg-lime/10 disabled:opacity-50">{publishing ? 'Mempublikasikan…' : 'Publish ke API'}</button>{notice && <span className="text-sm text-lime">{notice}</span>}</div>
          <div className="mt-4 rounded-xl border border-line bg-[#0e1420] px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted">Public endpoint</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-sm text-slate-200">{publicUrl}</code><button onClick={() => { navigator.clipboard.writeText(publicUrl); flash('URL endpoint disalin.') }} className="shrink-0 text-xs font-bold text-lime hover:underline">Salin URL</button></div></div>
        </div>
        <p className="rounded-xl border border-line bg-[#101723] px-4 py-3 text-xs leading-5 text-muted">Redis adalah sumber data utama Mockondo. Gunakan <b className="text-slate-300">Publish ke API</b> untuk menyimpan perubahan dan <b className="text-slate-300">Sync dari Redis</b> untuk memuat data server. Draft yang belum dipublish hanya berada di memori halaman.</p>
      </section>
      <aside className="h-fit rounded-2xl border border-line bg-panel/85 p-5 lg:sticky lg:top-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Response preview</p><h2 className="mt-1 text-lg font-bold">Hasil simulasi</h2><div className="mt-5 min-h-80 rounded-xl border border-line bg-[#0a0f18] p-4">{!result && <p className="mt-24 text-center text-sm text-muted">Tekan “Jalankan simulasi” untuk melihat respons.</p>}{result?.loading && <p className="mt-24 text-center text-sm text-lime">Menunggu {selected.delay}ms…</p>}{result?.error && <p className="text-sm leading-6 text-red-300">{result.error}</p>}{result?.body && <><div className="mb-4 flex items-center justify-between"><span className={`rounded border px-2 py-1 text-xs font-bold ${tone(result.status)}`}>{result.status}</span><span className="text-xs text-muted">{result.elapsed}ms</span></div><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Headers</p><div className="mb-4 space-y-1 text-xs text-slate-300"><p><span className="text-muted">Content-Type:</span> {selected.contentType}</p>{result.headers.map((h, i) => <p key={i}><span className="text-muted">{h.key}:</span> {h.value}</p>)}</div><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Body</p><pre className="overflow-auto text-xs leading-5 text-[#d9e2f3]">{JSON.stringify(result.body, null, 2)}</pre></>}</div></aside>
    </div>
  </main>
}

function Headers({ headers, update }) {
  const set = (index, field, value) => update(headers.map((header, i) => i === index ? { ...header, [field]: value } : header))
  return <div className="mt-5"><div className="mb-2 flex items-center justify-between"><label className="label mb-0">Custom headers</label><button onClick={() => update([...headers, { key: '', value: '' }])} className="text-xs font-semibold text-lime hover:underline">+ Tambah header</button></div><div className="space-y-2">{headers.map((header, index) => <div className="flex gap-2" key={index}><input className="field" placeholder="Header name" value={header.key} onChange={(e) => set(index, 'key', e.target.value)}/><input className="field" placeholder="Value" value={header.value} onChange={(e) => set(index, 'value', e.target.value)}/><button onClick={() => update(headers.filter((_, i) => i !== index))} className="rounded-lg px-2 text-muted hover:bg-white/5 hover:text-red-300" aria-label="Hapus header">×</button></div>)}</div></div>
}
