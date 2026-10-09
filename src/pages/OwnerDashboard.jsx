import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, BadgeCheck, Boxes, Check, ChevronDown, CircleAlert, ClipboardList, Headset, LayoutDashboard, LogOut, MessageCircle, PackagePlus, Pencil, Plus, Search, Settings2, ShoppingBag, Trash2, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { requireSupabase, supabase } from '../services/supabase'
import { uploadProductImage } from '../services/store'

const money = (value) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value || 0)
const orderStates = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered', 'cancelled']
const emptyProduct = { name: '', category: '', description: '', price: '', stock_quantity: '', discount_percent: '0', is_available: true, image_url: '' }
const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'products', label: 'Products', icon: Boxes }, { id: 'orders', label: 'Orders', icon: ClipboardList }, { id: 'customers', label: 'Customers', icon: Users }, { id: 'chat', label: 'Live chat', icon: MessageCircle }, { id: 'feedback', label: 'Feedback', icon: Headset }, { id: 'settings', label: 'Store settings', icon: Settings2 },
]

export default function OwnerDashboard() {
  const [section, setSection] = useState('overview')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [complaints, setComplaints] = useState([])
  const [conversations, setConversations] = useState([])
  const [settings, setSettings] = useState({ shop_name: 'Malik Idrees Shop & UA Trader', location: 'Chakki Bazar, Samundri', phone: '031040866111', policies: {} })
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [productDialog, setProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeConversation, setActiveConversation] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const { profile, signOut, session } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  async function loadAll() {
    const client = requireSupabase()
    const results = await Promise.all([
      client.from('products').select('*').order('created_at', { ascending: false }),
      client.from('orders').select('*, profiles!orders_customer_id_fkey(full_name, shop_name, shop_address, chak_number, phone_number), order_items(*), shared_order_locations(latitude, longitude, shared_at, stopped_at)').order('created_at', { ascending: false }),
      client.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }),
      client.from('complaints').select('*, profiles!complaints_customer_id_fkey(full_name, shop_name)').order('created_at', { ascending: false }),
      client.from('conversations').select('*, profiles!conversations_customer_id_fkey(full_name, shop_name)').order('updated_at', { ascending: false }),
      client.from('store_settings').select('*').limit(1).maybeSingle(),
    ])
    const failed = results.find((result) => result.error)
    if (failed) setProblem(failed.error.message)
    const [productResult, orderResult, customerResult, complaintResult, conversationResult, settingResult] = results
    if (!productResult.error) setProducts(productResult.data || [])
    if (!orderResult.error) setOrders(orderResult.data || [])
    if (!customerResult.error) setCustomers(customerResult.data || [])
    if (!complaintResult.error) setComplaints(complaintResult.data || [])
    if (!conversationResult.error) setConversations(conversationResult.data || [])
    if (!settingResult.error && settingResult.data) setSettings(settingResult.data)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => loadAll().catch((error) => { setProblem(error.message); setLoading(false) }))
    const channel = supabase?.channel('owner-live-data').on('postgres_changes', { event: '*', schema: 'public' }, () => loadAll()).subscribe()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const pending = orders.filter((order) => order.status === 'pending').length
  const completed = orders.filter((order) => order.status === 'delivered').length
  const sales = orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount), 0)
  const lowStock = products.filter((product) => product.stock_quantity <= 10 && product.is_available).length
  const filteredProducts = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()))
  const filteredOrders = orders.filter((order) => (filterStatus === 'all' || order.status === filterStatus) && `${order.order_number} ${order.profiles?.full_name || ''} ${order.profiles?.shop_name || ''}`.toLowerCase().includes(search.toLowerCase()))
  const filteredCustomers = customers.filter((customer) => `${customer.full_name} ${customer.shop_name} ${customer.phone_number}`.toLowerCase().includes(search.toLowerCase()))
  const latestOrders = useMemo(() => orders.slice(0, 5), [orders])

  function openNewProduct() { setEditingProduct(null); setForm(emptyProduct); setImageFile(null); setImagePreview(''); setProductDialog(true) }
  function openEditProduct(product) { setEditingProduct(product); setForm({ ...emptyProduct, ...product, price: String(product.price), stock_quantity: String(product.stock_quantity), discount_percent: String(product.discount_percent || 0) }); setImageFile(null); setImagePreview(product.image_url || ''); setProductDialog(true) }

  async function saveProduct(event) {
    event.preventDefault(); setSaving(true); setProblem(''); setNotice('')
    try {
      const client = requireSupabase()
      let imageUrl = form.image_url
      if (imageFile) imageUrl = await uploadProductImage(imageFile, session.user.id)
      const record = { name: form.name.trim(), category: form.category.trim(), description: form.description.trim(), price: Number(form.price), stock_quantity: Number(form.stock_quantity), discount_percent: Number(form.discount_percent || 0), is_available: form.is_available, image_url: imageUrl || null }
      const query = editingProduct ? client.from('products').update(record).eq('id', editingProduct.id) : client.from('products').insert({ ...record, created_by: session.user.id })
      const { error } = await query
      if (error) throw error
      setProductDialog(false); setNotice(editingProduct ? 'Product updated.' : 'Product added to the catalogue.'); await loadAll()
    } catch (error) { setProblem(error.message) } finally { setSaving(false) }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name} from the catalogue? This cannot be undone.`)) return
    const { error } = await requireSupabase().from('products').delete().eq('id', product.id)
    if (error) setProblem(error.message); else { setNotice('Product deleted.'); await loadAll() }
  }

  async function updateOrder(orderId, status) {
    const { error } = await requireSupabase().from('orders').update({ status }).eq('id', orderId)
    if (error) setProblem(error.message); else { setNotice('Order status updated.'); await loadAll() }
  }

  async function updateComplaint(id, values) {
    const { error } = await requireSupabase().from('complaints').update(values).eq('id', id)
    if (error) setProblem(error.message); else await loadAll()
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (!/^03\d{9}$/.test(String(settings.phone || '').replace(/\D/g, ''))) {
      setProblem('Enter a valid Pakistani mobile number with 11 digits, for example 03001234567, before saving WhatsApp settings.')
      return
    }
    const client = requireSupabase()
    const values = { ...settings, updated_by: session.user.id }
    const request = settings.id ? client.from('store_settings').update(values).eq('id', settings.id) : client.from('store_settings').insert(values)
    const { error } = await request
    if (error) setProblem(error.message); else setNotice('Store settings saved.')
  }

  const stats = [
    { label: 'Total products', value: products.length, icon: Boxes, note: 'Catalogue items', tone: 'green' },
    { label: 'Customers', value: customers.length, icon: Users, note: 'Registered accounts', tone: 'yellow' },
    { label: 'Total orders', value: orders.length, icon: ShoppingBag, note: 'All time', tone: 'coral' },
    { label: 'Pending orders', value: pending, icon: Activity, note: 'Need attention', tone: 'lavender' },
    { label: 'Completed orders', value: completed, icon: BadgeCheck, note: 'Delivered', tone: 'green' },
    { label: 'Total sales', value: money(sales), icon: ArrowUpRight, note: 'Delivered orders only', tone: 'yellow' },
    { label: 'Low stock', value: lowStock, icon: CircleAlert, note: '10 units or fewer', tone: 'coral' },
  ]

  return <div className="owner-layout"><aside className="owner-sidebar"><a className="store-logo owner-logo" href="/owner"><span className="logo-mark">MI</span><span><strong>Malik Idrees</strong><small>OWNER WORKSPACE</small></span></a><p className="sidebar-label">STORE MANAGEMENT</p><nav>{sections.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setSearch('') }}><Icon size={17} />{label}{id === 'orders' && pending > 0 && <span className="nav-count">{pending}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="owner-profile"><span className="avatar">{profile?.full_name?.charAt(0) || 'A'}</span><span><strong>{profile?.full_name || 'Store owner'}</strong><small>Owner account</small></span></div><button className="sidebar-logout" onClick={async () => { await signOut(); navigate('/') }}><LogOut size={16} /> {t('signOut')}</button></div></aside>
    <main className="owner-main"><header className="owner-topbar"><div><span className="mobile-owner-brand">MI ✳</span><span className="owner-crumb">STORE / <strong>{sections.find((item) => item.id === section)?.label.toUpperCase()}</strong></span></div><div className="owner-top-actions"><span className="owner-live"><i /> DATABASE CONNECTED</span><button className="button button-dark compact-button" onClick={openNewProduct}><Plus size={16} /> Add product</button><button className="owner-logout-mobile icon-button" aria-label="Log out" onClick={async () => { await signOut(); navigate('/') }}><LogOut size={17} /></button></div></header>
      <div className="owner-content"><div className="owner-heading"><div><p className="eyebrow">GOOD DAY, {profile?.full_name?.split(' ')[0]?.toUpperCase() || 'OWNER'}</p><h1>{sections.find((item) => item.id === section)?.label || 'Overview'}<span className="heading-period">.</span></h1></div>{['products', 'orders', 'customers'].includes(section) && <label className="search-box owner-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section}...`} /></label>}</div>
        {problem && <div className="notice error"><CircleAlert size={16} />{problem}<button className="icon-button" aria-label="Dismiss error" onClick={() => setProblem('')}><X size={15} /></button></div>}{notice && <div className="notice success"><Check size={16} />{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
        {loading ? <div className="owner-loading">Loading store data…</div> : <>
          {section === 'overview' && <><div className="stat-grid">{stats.map(({ label, value, icon: Icon, note, tone }) => <article className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={18} /></div><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{note}</small></article>)}</div><div className="overview-lower"><section className="owner-panel sales-panel"><div className="panel-heading"><div><p className="eyebrow">COMPLETED ORDERS</p><h2>Sales at a glance</h2></div><span className="sales-badge"><ArrowUpRight size={15} /> Real orders</span></div><strong className="sales-value">{money(sales)}</strong><p className="muted">Sales total counts delivered orders only.</p><div className="sales-bars">{Array.from({ length: 7 }, (_, index) => <span key={index} style={{ height: `${Math.max(18, [25, 42, 35, 68, 52, 82, 62][index])}%` }} />)}</div></section><section className="owner-panel"><div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent orders</h2></div><button className="text-button" onClick={() => setSection('orders')}>View all <ArrowUpRight size={14} /></button></div>{latestOrders.length ? <div className="compact-orders">{latestOrders.map((order) => <button key={order.id} onClick={() => setSection('orders')}><span className="compact-order-dot"/><span><strong>{order.profiles?.shop_name || order.profiles?.full_name || 'Customer'}</strong><small>#{order.order_number}</small></span><b>{money(order.total_amount)}</b><span className={`order-status status-${order.status}`}>{order.status?.replaceAll('_', ' ')}</span></button>)}</div> : <p className="muted no-activity">Orders will appear here after a customer places one.</p>}</section></div><div className="quick-strip"><div><CircleAlert size={17} /><span><strong>{pending} orders</strong> awaiting an update</span><button onClick={() => setSection('orders')}>Review</button></div><div><Boxes size={17} /><span><strong>{lowStock} products</strong> with stock at 10 or below</span><button onClick={() => setSection('products')}>Check stock</button></div></div></>}
          {section === 'products' && <section className="owner-panel table-panel"><div className="panel-heading"><div><p className="eyebrow">CATALOGUE</p><h2>{products.length} products</h2></div><button className="button button-dark compact-button" onClick={openNewProduct}><Plus size={16} /> Add product</button></div>{filteredProducts.length ? <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th /></tr></thead><tbody>{filteredProducts.map((item) => <tr key={item.id}><td><div className="table-product">{item.image_url ? <img src={item.image_url} alt=""/> : <span><Boxes size={16}/></span>}<strong>{item.name}</strong></div></td><td>{item.category || '—'}</td><td>{money(item.price)}</td><td><span className={item.stock_quantity <= 10 ? 'low-stock' : ''}>{item.stock_quantity}</span></td><td><span className={`availability ${item.is_available ? 'available' : 'unavailable'}`}>{item.is_available ? 'Available' : 'Hidden'}</span></td><td className="row-actions"><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => openEditProduct(item)}><Pencil size={15}/></button><button className="icon-button danger-icon" aria-label={`Delete ${item.name}`} onClick={() => deleteProduct(item)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div> : <EmptyState icon={Boxes} title="Your catalogue is clear." text="Add the first product and it will appear on the customer shop." action={openNewProduct} />}</section>}
          {section === 'orders' && <section className="owner-panel table-panel"><div className="panel-heading"><div><p className="eyebrow">ORDER DESK</p><h2>{orders.length} orders</h2></div><label className="select-wrap"><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="all">All statuses</option>{orderStates.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><ChevronDown size={14}/></label></div>{filteredOrders.length ? <div className="order-admin-list">{filteredOrders.map((order) => <article className="admin-order" key={order.id}><div className="admin-order-head"><div><small>ORDER #{order.order_number} · {new Date(order.created_at).toLocaleString()}</small><h3>{order.profiles?.shop_name || order.profiles?.full_name || 'Customer'}</h3><p>{order.profiles?.full_name} · {order.profiles?.phone_number} · {order.profiles?.shop_address}{order.profiles?.chak_number ? `, Chak ${order.profiles.chak_number}` : ''}</p></div><strong>{money(order.total_amount)}</strong></div><div className="admin-order-items">{order.order_items?.map((item) => <span key={item.id}>{item.product_name} × {item.quantity} <b>{money(item.line_total)}</b></span>)}</div>{order.notes && <p className="order-note">“{order.notes}”</p>}<div className="admin-order-foot"><span className={`order-status status-${order.status}`}>{order.status?.replaceAll('_', ' ')}</span><label>Update status <span className="select-wrap"><select value={order.status} onChange={(event) => updateOrder(order.id, event.target.value)}>{orderStates.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><ChevronDown size={13}/></span></label></div></article>)}</div> : <EmptyState icon={ClipboardList} title="No orders to show" text="New customer orders will appear here as they come in." />}</section>}
          {section === 'customers' && <section className="owner-panel table-panel"><div className="panel-heading"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2>{customers.length} registered</h2></div></div>{filteredCustomers.length ? <div className="table-wrap"><table><thead><tr><th>CUSTOMER</th><th>SHOP</th><th>CONTACT</th><th>ADDRESS</th><th>ORDERS</th></tr></thead><tbody>{filteredCustomers.map((customer) => { const customerOrders = orders.filter((order) => order.customer_id === customer.id); return <tr key={customer.id}><td><strong>{customer.full_name}</strong><small className="table-subline">Since {new Date(customer.created_at).toLocaleDateString()}</small></td><td>{customer.shop_name || '—'}</td><td><a href={`tel:${customer.phone_number}`}>{customer.phone_number || '—'}</a></td><td>{[customer.shop_address, customer.chak_number && `Chak ${customer.chak_number}`].filter(Boolean).join(', ') || '—'}</td><td>{customerOrders.length}<small className="table-subline">{money(customerOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount), 0))}</small></td></tr> })}</tbody></table></div> : <EmptyState icon={Users} title="No customer accounts yet" text="Customer business profiles appear here after registration." />}</section>}
          {section === 'chat' && <section className="owner-panel chat-admin"><div className="panel-heading"><div><p className="eyebrow">CUSTOMER SUPPORT</p><h2>Conversations</h2></div></div>{conversations.length ? <div className="conversation-list">{conversations.map((conversation) => <button key={conversation.id} className={activeConversation === conversation.id ? 'selected' : ''} onClick={() => { setActiveConversation(conversation.id); setChatOpen(true) }}><span className="avatar">{conversation.profiles?.full_name?.charAt(0) || 'C'}</span><span><strong>{conversation.profiles?.full_name || 'Customer'}</strong><small>{conversation.profiles?.shop_name || 'Customer conversation'}</small></span><ArrowUpRight size={16}/></button>)}</div> : <EmptyState icon={MessageCircle} title="No conversations yet" text="Customer messages will appear here."/>}<ChatPanel owner open={chatOpen} conversations={conversations} selectedConversationId={activeConversation} onClose={() => setChatOpen(false)} /></section>}
          {section === 'feedback' && <section className="feedback-admin">{complaints.length ? complaints.map((item) => <article className="owner-panel complaint-card" key={item.id}><div className="complaint-head"><div><p className="eyebrow">{item.profiles?.shop_name || item.profiles?.full_name || 'Customer'} · {new Date(item.created_at).toLocaleDateString()}</p><h2>{item.rating ? `${item.rating} / 5 rating` : 'Customer complaint'}</h2></div><span className={`availability ${item.status === 'resolved' ? 'available' : 'unavailable'}`}>{item.status || 'open'}</span></div><p>{item.description}</p><label className="field">Owner reply<textarea defaultValue={item.owner_reply || ''} rows="2" onBlur={(event) => { if (event.target.value !== (item.owner_reply || '')) updateComplaint(item.id, { owner_reply: event.target.value }) }}/></label><label className="select-wrap complaint-status"><select value={item.status || 'open'} onChange={(event) => updateComplaint(item.id, { status: event.target.value })}><option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select><ChevronDown size={14}/></label></article>) : <div className="owner-panel"><EmptyState icon={Headset} title="No feedback yet" text="Customer complaints and ratings will be listed here." /></div>}</section>}
          {section === 'settings' && <section className="owner-panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR BUSINESS DETAILS</p><h2>Store settings</h2></div><BadgeCheck size={19}/></div><form className="settings-form" onSubmit={saveSettings}><label className="field">Shop name<input value={settings.shop_name || ''} onChange={(event) => setSettings({ ...settings, shop_name: event.target.value })}/></label><label className="field">Location<input value={settings.location || ''} onChange={(event) => setSettings({ ...settings, location: event.target.value })}/></label><label className="field">Contact number<input type="tel" value={settings.phone || ''} onChange={(event) => setSettings({ ...settings, phone: event.target.value })}/></label><p className="settings-note">WhatsApp uses this number after converting it to international format. Keep the number current. Store policies can be edited in the database settings record.</p><button className="button button-dark"><Check size={16}/> Save settings</button></form></section>}
        </>}{section === 'orders' && <SharedLocations orders={orders} />}</div></main>
    {productDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductDialog(false) }}><section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><header><div><p className="eyebrow">CATALOGUE MANAGEMENT</p><h2 id="product-modal-title">{editingProduct ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" onClick={() => setProductDialog(false)} aria-label="Close product form"><X size={18}/></button></header><form onSubmit={saveProduct} className="product-form"><label className="image-upload">{imagePreview ? <img src={imagePreview} alt="Product preview"/> : <span><PackagePlus size={23}/><small>Choose image</small></span>}<input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) } }}/><small>Camera or gallery</small></label><div className="product-form-fields"><label className="field">Product name<input required maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label className="field">Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Biscuits, snacks…"/></label><label className="field">Description<textarea rows="3" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label><div className="form-columns"><label className="field">Price (PKR)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/></label><label className="field">Stock quantity<input required type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}/></label><label className="field">Discount (%)<input type="number" min="0" max="90" value={form.discount_percent} onChange={(event) => setForm({ ...form, discount_percent: event.target.value })}/></label></div><label className="checkbox-field"><input type="checkbox" checked={form.is_available} onChange={(event) => setForm({ ...form, is_available: event.target.checked })}/> Available in customer catalogue</label></div><footer><button type="button" className="button button-outline" onClick={() => setProductDialog(false)}>Cancel</button><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : <>{t('save')} product <Check size={15}/></>}</button></footer></form></section></div>}
  </div>
}

function EmptyState({ icon: Icon, title, text, action }) {
  return <div className="empty-owner"><span><Icon size={23}/></span><h3>{title}</h3><p>{text}</p>{action && <button className="button button-outline" onClick={action}><Plus size={15}/> Add first product</button>}</div>
}

function SharedLocations({ orders }) {
  const locations = orders.flatMap((order) => (order.shared_order_locations || []).map((location) => ({ ...location, orderNumber: order.order_number, customerName: order.profiles?.full_name || order.profiles?.shop_name || 'Customer' })))
  if (!locations.length) return null
  return <section className="owner-panel shared-locations"><div className="panel-heading"><div><p className="eyebrow">CUSTOMER-CONSENTED GPS</p><h2>Shared order locations</h2></div></div>{locations.map((location) => <a key={location.orderNumber} href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer"><span><strong>{location.customerName}</strong><small>Order #{location.orderNumber} · {new Date(location.shared_at).toLocaleString()}</small></span><span className="shared-coordinates">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span><ArrowUpRight size={15}/></a>)}</section>
}
