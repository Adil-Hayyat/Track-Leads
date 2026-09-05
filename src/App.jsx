import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const statuses = ['New', 'Contacted', 'Qualified', 'Closed']
const owners = ['Unassigned', 'Alex', 'Sarah', 'John']
const emptyForm = { name: '', email: '', phone: '', enquiry: '', owner: 'Unassigned', status: 'New' }

const statusStyles = {
  New: 'bg-sky-50 text-sky-700', Contacted: 'bg-amber-50 text-amber-700',
  Qualified: 'bg-emerald-50 text-emerald-700', Closed: 'bg-slate-100 text-slate-600',
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function App() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchLeads() {
      if (!supabase) {
        setError('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.')
        setIsLoading(false)
        return
      }
      const { data, error: fetchError } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (fetchError) setError('We could not load leads. Check the Supabase table and connection.')
      else setLeads(data ?? [])
      setIsLoading(false)
    }
    fetchLeads()
  }, [])

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const matchesSearch = !query || lead.name.toLowerCase().includes(query) || lead.email.toLowerCase().includes(query)
      return matchesSearch && (statusFilter === 'All' || lead.status === statusFilter)
    })
  }, [leads, search, statusFilter])

  function openCreate() {
    setEditingLead(null); setForm(emptyForm); setError(''); setFormOpen(true)
  }

  function openEdit(lead) {
    setEditingLead(lead)
    setForm({ name: lead.name, email: lead.email, phone: lead.phone ?? '', enquiry: lead.enquiry, owner: lead.owner, status: lead.status })
    setError(''); setFormOpen(true)
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveLead(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.enquiry.trim()) {
      setError('Name, email, and enquiry are required.'); return
    }
    if (!supabase) return
    setSaving(true); setError('')
    const payload = { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), enquiry: form.enquiry.trim() }
    const response = editingLead
      ? await supabase.from('leads').update(payload).eq('id', editingLead.id).select().single()
      : await supabase.from('leads').insert(payload).select().single()
    if (response.error) setError('We could not save this lead. Please try again.')
    else {
      setLeads((current) => editingLead ? current.map((lead) => lead.id === editingLead.id ? response.data : lead) : [response.data, ...current])
      setFormOpen(false)
    }
    setSaving(false)
  }

  async function deleteLead(lead) {
    if (!window.confirm(`Delete the lead for ${lead.name}?`)) return
    if (!supabase) return
    setDeletingId(lead.id); setError('')
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id)
    if (deleteError) setError('We could not delete this lead. Please try again.')
    else setLeads((current) => current.filter((item) => item.id !== lead.id))
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lg font-bold text-white">L</div><div><p className="font-display text-lg font-bold tracking-tight text-ink">LeadTrack</p><p className="text-xs font-medium text-slate-500">Enquiry workspace</p></div></div>
          <button onClick={openCreate} className="rounded-lg bg-coral px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#d95f43]">+ Add lead</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal">Staff workspace</p><h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Enquiries</h1><p className="mt-2 text-sm text-slate-500">Keep every conversation moving forward.</p></div><p className="text-sm font-semibold text-slate-500">{leads.length} {leads.length === 1 ? 'lead' : 'leads'} total</p></div>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative w-full sm:max-w-sm"><label className="sr-only" htmlFor="search">Search leads</label><input id="search" value={search} onChange={(event) => setSearch(event.target.value)} className="field pl-10" placeholder="Search name or email" /><span className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400">⌕</span></div><div className="flex items-center gap-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="status-filter">Status</label><select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink focus:border-teal focus:outline-none"><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></div>
          {isLoading ? <div className="p-12 text-center text-sm font-medium text-slate-500">Loading leads...</div> : filteredLeads.length === 0 ? <div className="px-6 py-16 text-center"><p className="font-display text-lg font-bold text-ink">{leads.length ? 'No leads match your filters' : 'No leads yet'}</p><p className="mt-2 text-sm text-slate-500">{leads.length ? 'Try a different search or status.' : 'Add your first enquiry to get started.'}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-bold">Lead</th><th className="px-5 py-3 font-bold">Enquiry</th><th className="px-5 py-3 font-bold">Owner</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Created</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line">{filteredLeads.map((lead) => <tr key={lead.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold text-ink">{lead.name}</p><p className="mt-0.5 text-xs text-slate-500">{lead.email}{lead.phone && ` · ${lead.phone}`}</p></td><td className="max-w-xs px-5 py-4 text-sm text-slate-600">{lead.enquiry}</td><td className="px-5 py-4 text-sm font-semibold text-slate-600">{lead.owner}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[lead.status]}`}>{lead.status}</span></td><td className="px-5 py-4 text-sm text-slate-500">{formatDate(lead.created_at)}</td><td className="px-5 py-4"><div className="flex justify-end gap-3 text-sm font-bold"><button onClick={() => openEdit(lead)} className="text-teal hover:text-ink">Edit</button><button disabled={deletingId === lead.id} onClick={() => deleteLead(lead)} className="text-coral hover:text-red-800 disabled:opacity-50">{deletingId === lead.id ? 'Deleting...' : 'Delete'}</button></div></td></tr>)}</tbody></table></div>}
        </section>
      </main>
      {formOpen && <div className="fixed inset-0 z-10 overflow-y-auto bg-ink/40 px-4 py-8"><div role="dialog" aria-modal="true" aria-labelledby="form-title" className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">{editingLead ? 'Update record' : 'New record'}</p><h2 id="form-title" className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{editingLead ? 'Edit lead' : 'Add a lead'}</h2></div><button onClick={() => !saving && setFormOpen(false)} aria-label="Close form" className="text-2xl leading-none text-slate-400 hover:text-ink">×</button></div><form onSubmit={saveLead} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="name">Name *</label><input required id="name" name="name" value={form.name} onChange={updateField} className="field" /></div><div><label className="label" htmlFor="email">Email *</label><input required type="email" id="email" name="email" value={form.email} onChange={updateField} className="field" /></div></div><div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" value={form.phone} onChange={updateField} className="field" /></div><div><label className="label" htmlFor="enquiry">Enquiry *</label><textarea required id="enquiry" name="enquiry" value={form.enquiry} onChange={updateField} rows="4" className="field resize-none" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="owner">Owner</label><select id="owner" name="owner" value={form.owner} onChange={updateField} className="field">{owners.map((owner) => <option key={owner}>{owner}</option>)}</select></div><div><label className="label" htmlFor="status">Status</label><select id="status" name="status" value={form.status} onChange={updateField} className="field">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></div><div className="flex justify-end gap-3 border-t border-line pt-5"><button type="button" onClick={() => !saving && setFormOpen(false)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={saving} type="submit" className="rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-teal disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving...' : editingLead ? 'Save changes' : 'Create lead'}</button></div></form></div></div>}
    </div>
  )
}

export default App