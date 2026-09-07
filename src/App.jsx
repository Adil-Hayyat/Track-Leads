import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const statuses = ['New', 'Contacted', 'Qualified', 'Closed']
const owners = ['Unassigned', 'Alex', 'Sarah', 'John']
const emptyForm = { name: '', email: '', phone: '', enquiry: '', owner: 'Unassigned', status: 'New' }

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatToday() {
  return new Intl.DateTimeFormat('en', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())
}

function isInRange(value, start, end) {
  const date = new Date(value)
  return date >= start && date < end
}

function getReportingStats(leads) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const count = (predicate) => leads.filter(predicate).length
  return {
    total: leads.length,
    today: count((lead) => isInRange(lead.created_at, startOfToday, startOfTomorrow)),
    month: count((lead) => isInRange(lead.created_at, startOfMonth, startOfNextMonth)),
    newLeads: count((lead) => lead.status === 'New'),
    contacted: count((lead) => lead.status === 'Contacted'),
    qualified: count((lead) => lead.status === 'Qualified'),
    closed: count((lead) => lead.status === 'Closed'),
  }
}

function logSupabaseError(operation, error) {
  if (import.meta.env.DEV && error) console.error(`[Supabase ${operation}]`, { code: error.code, message: error.message, details: error.details, hint: error.hint })
}

function getUserLabel(user) {
  return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'
}

function getInitials(user) {
  return getUserLabel(user).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function authErrorMessage(error, action) {
  if (!error) return ''
  const message = error.message?.toLowerCase() || ''
  if (message.includes('invalid login credentials')) return 'The email or password is incorrect.'
  if (message.includes('user already registered')) return 'An account with this email already exists. Try signing in.'
  if (message.includes('password')) return 'Use a password with at least six characters.'
  if (message.includes('email')) return 'Enter a valid email address.'
  if (message.includes('network') || message.includes('fetch')) return 'We could not reach Supabase. Check your connection and try again.'
  return action === 'login' ? 'We could not sign you in. Please try again.' : 'We could not create your account. Please try again.'
}

function Logo({ compact = false }) {
  return <div className="brand"><div className="brand-mark">L</div>{!compact && <div><strong>LeadTrack</strong><span>Revenue workspace</span></div>}</div>
}

function Landing({ navigate }) {
  return <div className="landing-page"><header className="landing-nav"><Logo /><nav><button onClick={() => navigate('login')}>Sign in</button><button className="nav-cta" onClick={() => navigate('signup')}>Get started <span>-&gt;</span></button></nav></header><main className="landing-main"><div className="landing-copy"><p className="eyebrow">A better way to follow through</p><h1>Turn every enquiry into <em>momentum.</em></h1><p className="landing-lede">LeadTrack gives your team a focused, effortless way to capture, organise, and close more opportunities.</p><div className="landing-actions"><button className="primary-btn" onClick={() => navigate('signup')}>Start for free <span>-&gt;</span></button><button className="text-btn" onClick={() => navigate('login')}>View workspace <span>-&gt;</span></button></div><div className="social-proof"><div className="avatar-stack"><i>L</i><i>T</i><i>+</i></div><span>A focused workspace for your team</span></div></div><div className="landing-visual"><div className="visual-glow" /><div className="mini-window"><div className="mini-window-top"><span>o o o</span><span>LeadTrack / Overview</span></div><div className="mini-window-body"><div className="mini-title"><span><small>YOUR WORKSPACE</small><b>Keep work moving</b></span><i>+</i></div><div className="mini-metrics"><div><small>CAPTURE</small><b>Every enquiry</b><span>In one place</span></div><div><small>PROGRESS</small><b>Clear next steps</b><span>For every lead</span></div></div><div className="mini-chart"><div><small>Pipeline overview</small><span>Simple, focused, clear</span></div><div className="chart-bars"><i style={{ height: '48%' }} /><i style={{ height: '66%' }} /><i style={{ height: '42%' }} /><i style={{ height: '82%' }} /><i style={{ height: '58%' }} /><i style={{ height: '92%' }} /><i style={{ height: '72%' }} /></div></div></div></div></div></main><footer className="landing-footer"><span>© 2024 LeadTrack</span><span>Simple tools for serious follow-through</span></footer></div>
}

function AuthPage({ mode, navigate, onAuthenticated }) {
  const login = mode === 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canResend, setCanResend] = useState(false)

  async function resendVerification() {
    if (!supabase || !email.trim()) return
    setResending(true); setError(''); setSuccess('')
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    if (resendError) { logSupabaseError('resend verification', resendError); setError(authErrorMessage(resendError, 'signup')) }
    else setSuccess('Verification email sent. Check your inbox before signing in.')
    setResending(false)
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setCanResend(false)
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Enter your password.'); return }
    if (password.length < 6) { setError('Use a password with at least six characters.'); return }
    if (!login && password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!supabase) { setError('Authentication is not configured. Add the Supabase environment values and restart the app.'); return }
    if (!login && !accepted) { setError('Please accept the terms to create an account.'); return }
    setLoading(true)
    let response
    try {
      response = login ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password }) : await supabase.auth.signUp({ email: normalizedEmail, password })
    } catch (requestError) {
      logSupabaseError(login ? 'login' : 'signup', requestError)
      setLoading(false)
      setError('We could not reach Supabase. Check your connection and try again.')
      return
    }
    setLoading(false)
    if (response.error) { logSupabaseError(login ? 'login' : 'signup', response.error); setError(authErrorMessage(response.error, login ? 'login' : 'signup')); setCanResend(!login && response.error.message?.toLowerCase().includes('confirm')); return }
    if (login) {
      if (response.data.session) onAuthenticated()
      else { setError('Please verify your email before logging in.'); setCanResend(true) }
      return
    }
    if (response.data.user?.identities?.length === 0) { setError('An account with this email already exists. Please log in instead.'); return }
    if (response.data.session) onAuthenticated()
    else { setSuccess('Account created. Please check your email and verify your address before logging in.'); setCanResend(true) }
  }

  return <div className="auth-page"><aside className="auth-aside"><Logo /><div className="auth-aside-copy"><p className="eyebrow">The calm way to grow</p><h1>Every lead deserves a clear next step.</h1><p>LeadTrack brings enquiries, owners, and follow-ups into one focused workspace.</p><div className="quote"><span>“</span><p>Keep every conversation moving forward.</p><small>LeadTrack workspace</small></div></div><small>Private workspace for your team</small></aside><main className="auth-card-wrap"><button className="back-link" onClick={() => navigate('landing')}>Back to home</button><div className="auth-card"><div className="mobile-brand"><Logo /></div><p className="eyebrow">{login ? 'Welcome back' : 'Start for free'}</p><h2>{login ? 'Sign in to LeadTrack' : 'Create your workspace'}</h2><p className="auth-subtitle">{login ? 'Pick up where your team left off.' : 'A sharper way to manage every enquiry.'}</p><form onSubmit={submit}><label className="label" htmlFor="auth-email">Work email</label><input className="field" id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required /><label className="label" htmlFor="auth-password">Password</label><input className="field" id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete={login ? 'current-password' : 'new-password'} minLength="6" required />{!login && <><label className="label" htmlFor="auth-confirm-password">Confirm password</label><input className="field" id="auth-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" autoComplete="new-password" required /><label className="check-row"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> I agree to the terms of service</label></>}{error && <div role="alert" className="auth-message error-message">{error}</div>}{success && <div role="status" className="auth-message success-message">{success}</div>}<button className="primary-btn full-btn" disabled={loading}>{loading ? 'Please wait...' : login ? 'Sign in' : 'Create account'} {!loading && <span>-&gt;</span>}</button>{canResend && <button type="button" className="resend-btn" disabled={resending} onClick={resendVerification}>{resending ? 'Sending...' : 'Resend verification email'}</button>}</form><p className="switch-auth">{login ? 'New to LeadTrack?' : 'Already have an account?'} <button onClick={() => navigate(login ? 'signup' : 'login')}>{login ? 'Create an account' : 'Sign in'}</button></p></div></main></div>
}

function Sidebar({ page, user, navigate, onAdd, onSignOut, leadCount }) {
  return <aside className="sidebar"><Logo compact /><div className="workspace-switch"><span className="workspace-icon">{getInitials(user).slice(0, 1)}</span><span><small>Workspace</small><b>{getUserLabel(user)}'s workspace</b></span><span>v</span></div><nav className="side-nav"><p>Workspace</p><button className={page === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}><span>[]</span>Overview</button><button className={page === 'leads' ? 'active' : ''} onClick={() => navigate('leads')}><span>+</span>Leads {leadCount > 0 && <strong>{leadCount}</strong>}</button><p>Manage</p><button><span>@</span>Account</button></nav><button className="sidebar-add" onClick={onAdd}>+ <span>Add new lead</span></button><div className="profile"><span className="profile-avatar">{getInitials(user)}</span><span><b>{getUserLabel(user)}</b><small>{user?.email || 'Authenticated user'}</small></span><button aria-label="Sign out" onClick={onSignOut}>...</button></div></aside>
}

function Metric({ label, value, note }) { return <div className="metric-card"><span className="metric-label">{label}</span><strong>{value}</strong><span className="metric-change neutral">{note}</span></div> }

function Dashboard({ page, user, navigate, leads, filteredLeads, isLoading, error, search, setSearch, statusFilter, setStatusFilter, onAdd, onEdit, onDelete, deletingId, onSignOut }) {
  const stats = getReportingStats(leads)
  const conversion = stats.total ? `${Math.round((stats.qualified / stats.total) * 100)}%` : '0%'
  return <div className="app-shell"><Sidebar page={page} user={user} navigate={navigate} onAdd={onAdd} onSignOut={onSignOut} leadCount={leads.length} /><main className="dashboard-main"><header className="dashboard-header"><div className="mobile-header"><Logo compact /><button className="icon-btn" aria-label="Menu">=</button></div><div><p className="eyebrow">{formatToday()}</p><h1>{page === 'leads' ? 'All leads' : `Good morning, ${getUserLabel(user)}`}</h1><p className="header-subtitle">{page === 'leads' ? 'Manage and track every active opportunity.' : 'Here is what is happening with your pipeline today.'}</p></div><div className="header-actions"><button className="avatar-button" aria-label="Sign out" onClick={onSignOut}>{getInitials(user)}</button></div></header><div className="dashboard-content">{error && <div role="alert" className="alert">{error}</div>}{page === 'dashboard' && <section className="metric-grid"><Metric label="Total leads" value={stats.total} note="All records" /><Metric label="Today" value={stats.today} note="Created today" /><Metric label="This month" value={stats.month} note="Created this month" /><Metric label="Conversion" value={conversion} note="Qualified / total" /><Metric label="New" value={stats.newLeads} note="Current status" /><Metric label="Contacted" value={stats.contacted} note="Current status" /><Metric label="Qualified" value={stats.qualified} note="Current status" /><Metric label="Closed" value={stats.closed} note="Current status" /></section>}<section className="dashboard-intro"><div><h2>{page === 'leads' ? 'Lead pipeline' : 'Recent leads'}</h2><p>{page === 'leads' ? 'Search, filter, and update your enquiries.' : 'Keep your pipeline moving with a clear view of what needs attention.'}</p></div><button className="primary-btn" onClick={onAdd}>+ Add lead</button></section><section className="leads-panel"><div className="panel-toolbar"><div className="search-wrap"><span>⌕</span><input aria-label="Search leads" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads..." /></div><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="filter-btn" type="button">Filter</button></div>{isLoading ? <div className="empty-state">Loading leads...</div> : filteredLeads.length === 0 ? <div className="empty-state"><b>{leads.length ? 'No leads match your filters' : 'No leads yet'}</b><span>{leads.length ? 'Try a different search or status.' : 'Add your first enquiry to get started.'}</span></div> : <div className="table-scroll"><table><thead><tr><th>Lead</th><th>Enquiry</th><th>Owner</th><th>Status</th><th>Created</th><th /></tr></thead><tbody>{filteredLeads.map((lead) => <tr key={lead.id}><td><div className="lead-cell"><span className="lead-avatar">{lead.name.slice(0, 1).toUpperCase()}</span><span><b>{lead.name}</b><small>{lead.email}</small></span></div></td><td className="enquiry-cell">{lead.enquiry}</td><td>{lead.owner}</td><td><span className={`status-pill status-${lead.status.toLowerCase()}`}>{lead.status}</span></td><td>{formatDate(lead.created_at)}</td><td><div className="row-actions"><button onClick={() => onEdit(lead)}>Edit</button><button disabled={deletingId === lead.id} onClick={() => onDelete(lead)}>{deletingId === lead.id ? '...' : 'Delete'}</button></div></td></tr>)}</tbody></table></div>}</section></div></main></div>
}

function LeadModal({ editingLead, form, setForm, error, saving, onClose, onSave }) {
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })) }
  return <div className="modal-backdrop"><div role="dialog" aria-modal="true" className="modal"><div className="modal-heading"><div><p className="eyebrow">{editingLead ? 'Update record' : 'New record'}</p><h2>{editingLead ? 'Edit lead' : 'Add a lead'}</h2></div><button className="close-btn" onClick={onClose}>x</button></div><form onSubmit={onSave}><div className="form-grid"><div><label className="label" htmlFor="name">Name *</label><input required id="name" name="name" value={form.name} onChange={updateField} className="field" /></div><div><label className="label" htmlFor="email">Email *</label><input required type="email" id="email" name="email" value={form.email} onChange={updateField} className="field" /></div></div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" value={form.phone} onChange={updateField} className="field" /><label className="label" htmlFor="enquiry">Enquiry *</label><textarea required id="enquiry" name="enquiry" value={form.enquiry} onChange={updateField} rows="4" className="field" /><div className="form-grid"><div><label className="label" htmlFor="owner">Owner</label><select id="owner" name="owner" value={form.owner} onChange={updateField} className="field">{owners.map((owner) => <option key={owner}>{owner}</option>)}</select></div><div><label className="label" htmlFor="status">Status</label><select id="status" name="status" value={form.status} onChange={updateField} className="field">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editingLead ? 'Save changes' : 'Create lead'}</button></div></form></div></div>
}

function App() {
  const [view, setView] = useState('landing')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [isLoading, setIsLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function restoreSession() {
      if (!supabase) { setAuthLoading(false); return }
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!mounted) return
      if (sessionError) { logSupabaseError('restore session', sessionError); setError('We could not restore your session. Please sign in again.') }
      setSession(data.session)
      setView(data.session ? 'dashboard' : 'landing')
      setAuthLoading(false)
    }
    restoreSession()
    if (!supabase) return () => { mounted = false }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (nextSession) setView('dashboard')
      else { setLeads([]); setView('landing') }
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session || !supabase) return
    async function fetchLeads() {
      setIsLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (fetchError) { logSupabaseError('load leads', fetchError); setError(fetchError.code === 'PGRST205' ? 'The Supabase leads table is missing. Run supabase/schema.sql in the Supabase SQL Editor.' : fetchError.code === '42501' ? 'You are not authorized to view leads.' : 'We could not load leads. Check the table permissions and connection.') }
      else setLeads(data ?? [])
      setIsLoading(false)
    }
    fetchLeads()
  }, [session])

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return leads.filter((lead) => (!query || lead.name.toLowerCase().includes(query) || lead.email.toLowerCase().includes(query)) && (statusFilter === 'All statuses' || lead.status === statusFilter))
  }, [leads, search, statusFilter])

  function openCreate() { setEditingLead(null); setForm(emptyForm); setError(''); setFormOpen(true) }
  function openEdit(lead) { setEditingLead(lead); setForm({ name: lead.name, email: lead.email, phone: lead.phone ?? '', enquiry: lead.enquiry, owner: lead.owner, status: lead.status }); setError(''); setFormOpen(true) }
  async function signOut() { if (!supabase) return; const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) setError('We could not sign you out. Please try again.') }
  async function saveLead(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.enquiry.trim()) { setError('Name, email, and enquiry are required.'); return }
    if (!supabase) { setError('Supabase is not configured.'); return }
    setSaving(true); setError('')
    const payload = { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), enquiry: form.enquiry.trim() }
    try {
      const response = editingLead ? await supabase.from('leads').update(payload).eq('id', editingLead.id).select().single() : await supabase.from('leads').insert(payload).select().single()
      if (response.error) { logSupabaseError(editingLead ? 'update lead' : 'create lead', response.error); setError(response.error.code === '42501' ? 'You are not authorized to save leads.' : response.error.code === '23514' ? 'The selected owner or status is not valid.' : 'We could not save this lead. Check the table permissions and try again.') }
      else { setLeads((current) => editingLead ? current.map((lead) => lead.id === editingLead.id ? response.data : lead) : [response.data, ...current]); setFormOpen(false) }
    } catch { setError('We could not reach Supabase. Check your connection and try again.') }
    setSaving(false)
  }
  async function deleteLead(lead) {
    if (!window.confirm(`Delete the lead for ${lead.name}?`)) return
    if (!supabase) { setError('Supabase is not configured.'); return }
    setDeletingId(lead.id); setError('')
    try { const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id); if (deleteError) { logSupabaseError('delete lead', deleteError); setError(deleteError.code === '42501' ? 'You are not authorized to delete leads.' : 'We could not delete this lead. Check the table permissions and try again.') } else setLeads((current) => current.filter((item) => item.id !== lead.id)) } catch { setError('We could not reach Supabase. Check your connection and try again.') }
    setDeletingId(null)
  }

  if (authLoading) return <div className="auth-loading">Checking authentication...</div>
  if (view === 'landing' && !session) return <Landing navigate={setView} />
  if ((view === 'login' || view === 'signup') && !session) return <AuthPage mode={view} navigate={setView} onAuthenticated={() => setView('dashboard')} />
  if (!session) return <Landing navigate={setView} />
  return <><Dashboard page={view === 'leads' ? 'leads' : 'dashboard'} user={session.user} navigate={setView} leads={leads} filteredLeads={filteredLeads} isLoading={isLoading} error={error} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onAdd={openCreate} onEdit={openEdit} onDelete={deleteLead} deletingId={deletingId} onSignOut={signOut} />{formOpen && <LeadModal editingLead={editingLead} form={form} setForm={setForm} error={error} saving={saving} onClose={() => !saving && setFormOpen(false)} onSave={saveLead} />}</>
}

export default App
