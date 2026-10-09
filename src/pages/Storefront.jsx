import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ChevronDown, LogOut, Menu, MessageCircle, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { requireSupabase, supabase } from '../services/supabase'
import { submitOrder } from '../services/store'
import { policyDefaults } from '../services/policies'
import ChatPanel from '../components/ChatPanel'
import CustomerAccount from '../components/CustomerAccount'

const normalizeWhatsAppNumber = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('0092')) digits = digits.slice(2)
  if (digits.startsWith('92')) digits = `0${digits.slice(2)}`
  if (!/^03\d{9}$/.test(digits)) return ''
  return `92${digits.slice(1)}`
}
const whatsappHref = (phone) => normalizeWhatsAppNumber(phone)
  ? `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent('Assalamualaikum, I need help regarding Malik Idrees Shop & UA Trader.')}`
  : '/contact'
const pkr = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0)

function StoreHeader({ cartCount, onOpenCart, phone }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  return <header className="store-header"><Link to="/shop" className="store-logo"><span className="logo-mark">MI</span><span><strong>Malik Idrees</strong><small>SHOP & UA TRADER</small></span></Link>
    <nav className={`store-nav ${menuOpen ? 'is-open' : ''}`}><Link to="/shop">{t('shop')}</Link><Link to="/my-orders">{t('orders')}</Link><Link to="/account">{t('account')}</Link><Link to="/policies">{t('policies')}</Link><a href={whatsappHref(phone)} target="_blank" rel="noreferrer" title={normalizeWhatsAppNumber(phone) ? 'Message the shop on WhatsApp' : 'Update the shop phone number in settings first'}>WhatsApp</a></nav>
    <div className="header-actions"><label className="language-select"><span className="sr-only">Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">EN</option><option value="ur">اردو</option><option value="ar">العربية</option></select><ChevronDown size={13} /></label><button className="icon-button cart-trigger" onClick={onOpenCart} aria-label={`${t('cart')}, ${cartCount} items`}><ShoppingBag size={19} /><span>{cartCount}</span></button><button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={20} /></button>{profile && <button className="icon-button signout-button" aria-label={t('signOut')} onClick={async () => { await signOut(); navigate('/') }}><LogOut size={17} /></button>}</div>
  </header>
}

function ProductCard({ product, onAdd }) {
  const [added, setAdded] = useState(false)
  const add = () => { onAdd(product); setAdded(true); window.setTimeout(() => setAdded(false), 1000) }
  return <motion.article className="product-card" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="product-image-wrap">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="product-image-fallback"><ShoppingBag size={27} /></div>}{product.discount_percent > 0 && <span className="discount-tag">-{product.discount_percent}%</span>}</div>
    <div className="product-copy"><p className="product-category">{product.category || 'GENERAL STORE'}</p><h3>{product.name}</h3><p className="product-description">{product.description || 'A shop essential, available from Malik Idrees Shop.'}</p><div className="product-card-bottom"><div><strong>{pkr(product.price * (1 - (product.discount_percent || 0) / 100))}</strong>{product.discount_percent > 0 && <del>{pkr(product.price)}</del>}<small>{product.stock_quantity} available</small></div><button className="add-button" onClick={add} disabled={!product.is_available || product.stock_quantity < 1} aria-label={`Add ${product.name} to basket`}>{added ? <Check size={17} /> : <Plus size={18} />}</button></div></div>
  </motion.article>
}

function CartDrawer({ open, onClose, onCheckout }) {
  const { items, subtotal, setQuantity, remove } = useCart()
  const { t } = useLanguage()
  return <AnimatePresence>{open && <><motion.button className="drawer-scrim" aria-label="Close basket" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="cart-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}><div className="drawer-heading"><div><p className="eyebrow">YOUR SELECTION</p><h2>{t('cart')} <span>({items.length})</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close basket"><X size={19} /></button></div>{items.length ? <><div className="cart-lines">{items.map((item) => <div className="cart-line" key={item.id}><div className="cart-thumb">{item.image_url ? <img src={item.image_url} alt="" /> : <ShoppingBag size={17} />}</div><div className="cart-line-copy"><strong>{item.name}</strong><small>{pkr(item.price)} each</small><div className="quantity-control"><button onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock_quantity} aria-label="Increase quantity"><Plus size={13} /></button></div></div><div className="cart-line-end"><strong>{pkr(item.price * item.quantity)}</strong><button className="remove-button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div></div>)}</div><div className="drawer-total"><span>Subtotal</span><strong>{pkr(subtotal)}</strong></div><p className="drawer-note">Final pricing and stock are verified when the order is placed.</p><button className="button button-dark full-width" onClick={onCheckout}>{t('checkout')} <ArrowRight size={16} /></button></> : <div className="empty-cart"><ShoppingBag size={27} /><p>Your basket is waiting.</p><button className="text-button" onClick={onClose}>Continue shopping</button></div>}</motion.aside></>}</AnimatePresence>
}

export default function Storefront({ page = 'shop' }) {
  const [products, setProducts] = useState([])
  const [storeSettings, setStoreSettings] = useState({ shop_name: 'Malik Idrees Shop & UA Trader', location: 'Chakki Bazar, Samundri', phone: '031040866111', policies: {} })
  const [loading, setLoading] = useState(Boolean(supabase))
  const [problem, setProblem] = useState(() => supabase ? '' : 'Add your Supabase URL and publishable key to connect the shop catalogue.')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const { items, count, add, clear } = useCart()
  const { profile, session } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    const loadSettings = async () => {
      const { data } = await supabase.from('store_settings').select('shop_name, location, phone, policies').limit(1).maybeSingle()
      if (mounted && data) setStoreSettings((current) => ({ ...current, ...data, policies: data.policies || {} }))
    }
    loadSettings()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_available', true).order('created_at', { ascending: false })
      if (!mounted) return
      if (error) setProblem(error.message)
      else { setProducts(data || []); setProblem('') }
      setLoading(false)
    }
    load()
    const channel = supabase.channel('customer-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (location.pathname === '/checkout' && !session) navigate('/auth/customer', { state: { from: '/checkout' } })
  }, [location.pathname, navigate, session])

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category).filter(Boolean))], [products])
  const filtered = products.filter((product) => (category === 'All' || product.category === category) && `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase().includes(query.toLowerCase()))
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const [orderError, setOrderError] = useState('')
  const idempotencyStorageKey = `malik-order-key:${session?.user?.id || 'guest'}`
  const [idempotencyKey, setIdempotencyKey] = useState(() => sessionStorage.getItem(idempotencyStorageKey) || '')

  async function placeOrder(event) {
    event.preventDefault(); setSending(true); setOrderError('')
    try {
      const requestKey = idempotencyKey || crypto.randomUUID()
      if (!idempotencyKey) { sessionStorage.setItem(idempotencyStorageKey, requestKey); setIdempotencyKey(requestKey) }
      const order = await submitOrder(items, notes, requestKey)
      setOrderResult(order)
      clear()
      sessionStorage.removeItem(idempotencyStorageKey)
      setIdempotencyKey('')
    } catch (error) { setOrderError(error.message || 'The order could not be saved. Please retry.') }
    finally { setSending(false) }
  }

  async function shareLocation(orderId) {
    if (!navigator.geolocation) { setToast('Location sharing is not available in this browser.'); return }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { error } = await requireSupabase().rpc('share_order_location', { p_order_id: orderId, p_latitude: coords.latitude, p_longitude: coords.longitude })
        if (error) throw error
        setToast('One-time location shared with the store.')
      } catch (error) { setToast(error.message) }
    }, (error) => setToast(error.message || 'Location permission was not granted.'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }

  return <div className="store-shell"><StoreHeader cartCount={count} onOpenCart={() => setDrawer(true)} phone={storeSettings.phone} />
    <main className="store-main">
      {page === 'shop' && <><section className="shop-hero"><div className="hero-copy"><span className="eyebrow"><span className="status-dot" /> WHOLESALE · SAMUNDRI</span><h1>Good things<br />for <em>everyday.</em></h1><p>Your neighbourhood source for snacks, sweets and general-store essentials.</p><a className="button button-dark" href="#catalogue">Explore the catalogue <ArrowRight size={16} /></a></div><div className="hero-art" aria-label="Colourful packaged sweets illustration"><div className="sunburst"/><span className="hero-seal">MI<br /><small>EST. LOCAL</small></span><div className="snack snack-one"><i>CRUNCH</i><b>chips</b></div><div className="snack snack-two"><i>sweet</i><b>treats</b></div><div className="snack snack-three"><i>daily</i><b>essentials</b></div><span className="hero-spark spark-a">✳</span><span className="hero-spark spark-b">✳</span></div></section>
        <div className="trust-strip"><span>LOCAL AND FAMILY RUN</span><i /><span>CHAKKI BAZAR, SAMUNDRI</span><i /><span>WHOLESALE & RETAIL</span></div>
        <section id="catalogue" className="catalogue-section"><div className="section-heading"><div><p className="eyebrow">THE SHOP FLOOR</p><h2>{t('all')}<span className="result-count">{products.length.toString().padStart(2, '0')}</span></h2></div><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} /></label></div>
          {products.length > 0 && <div className="category-tabs">{categories.map((item) => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'All' ? t('all') : item}</button>)}</div>}
          {loading ? <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item}><div/><span/><i/></div>)}</div> : problem ? <div className="notice error">{problem}</div> : filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={(item) => { add(item); setToast(`${item.name} added to your basket.`); window.setTimeout(() => setToast(''), 2200) }} />)}</div> : <div className="empty-catalogue"><span className="empty-flower">✳</span><h3>{t('empty')}</h3><p>{query ? 'Try another search, or clear your filters.' : t('emptyHint')}</p>{query && <button className="text-button" onClick={() => setQuery('')}>Clear search</button>}</div>}
        </section>
      </>}
      {page === 'checkout' && <section className="account-page"><Link to="/shop" className="back-link"><ArrowLeft size={16} /> Continue shopping</Link>{orderResult ? <div className="order-success"><motion.div className="success-burst" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={30} /></motion.div><p className="eyebrow">ORDER RECEIVED</p><h1>Thank you for<br /><em>shopping local.</em></h1><p>Your order number is <strong>{orderResult.order_number}</strong>. The shop will confirm the order with you.</p><button className="button button-dark" onClick={() => navigate('/my-orders')}>View order details <ArrowRight size={16} /></button><div className="location-share"><h3>Share your delivery location</h3><p>Optional, one-time GPS location to help the store coordinate this order. Accuracy depends on your device. Your location is never requested without your permission.</p><button className="button button-outline" onClick={() => shareLocation(orderResult.id)}>Share My Live Location</button><small>This shares one location only. It does not track you continuously.</small></div></div> : <><p className="eyebrow">ALMOST THERE</p><h1>{t('checkout')}</h1><div className="checkout-layout"><form className="checkout-form" onSubmit={placeOrder}><h2>Delivery details</h2><p className="muted">{profile?.full_name} · {profile?.shop_name}</p><p className="muted">{profile?.shop_address}{profile?.chak_number ? `, Chak ${profile.chak_number}` : ''}</p><p className="muted">{profile?.phone_number}</p><label className="field">Order note <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" placeholder="Anything the shop should know?" /></label><label className="checkbox-field"><input required type="checkbox" /> I have reviewed the <Link to="/policies">order and cancellation policy</Link>.</label>{orderError && <p className="form-message error">{orderError}</p>}<button className="button button-dark full-width" disabled={sending || items.length === 0}>{sending ? 'Submitting securely…' : t('placeOrder')} <ArrowRight size={16} /></button></form><div className="checkout-summary"><h2>Order summary</h2>{items.map((item) => <div className="summary-line" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{pkr(item.price * item.quantity)}</strong></div>)}<div className="summary-total"><span>{t('total')}</span><strong>{pkr(items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</strong></div><p>Stock and current prices are verified securely when you submit.</p></div></div></>}</section>}
      {page === 'orders' && <CustomerOrders onShare={shareLocation} />}
      {page === 'account' && <CustomerAccount />}
      {page === 'policies' && <PoliciesPage policies={storeSettings.policies} />}
      {page === 'contact' && <section className="account-page"><p className="eyebrow">WE ARE RIGHT HERE</p><h1>Contact <em>the shop.</em></h1><div className="contact-details"><p>{storeSettings.shop_name}</p><p>{storeSettings.location}, Pakistan</p><a href={`tel:${String(storeSettings.phone).replace(/\D/g, '')}`}>{storeSettings.phone}</a><a href={whatsappHref(storeSettings.phone)} target="_blank" rel="noreferrer">{normalizeWhatsAppNumber(storeSettings.phone) ? 'Message us on WhatsApp' : 'WhatsApp number needs updating in owner settings'} <ArrowRight size={16} /></a></div></section>}
      {page === 'complaint' && <ComplaintPage />}
    </main>
    <footer className="store-footer"><Link to="/shop" className="footer-brand">Malik Idrees Shop <span>&</span> UA Trader</Link><span>Chakki Bazar · Samundri</span><div><Link to="/policies">Policies</Link><Link to="/contact">Contact</Link><Link to="/feedback">Feedback</Link></div><small>© {new Date().getFullYear()} Malik Idrees Shop</small></footer>
    <button className="chat-fab" aria-label="Open customer chat" onClick={() => setChatOpen(true)}><MessageCircle size={20} /></button>
    <CartDrawer open={drawer} onClose={() => setDrawer(false)} onCheckout={() => { setDrawer(false); navigate('/checkout') }} />
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
    <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
  </div>
}

function CustomerOrders({ onShare }) {
  const { session } = useAuth()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!session) return undefined
    let live = true
    const load = async () => {
      const { data, error: loadError } = await requireSupabase().from('orders').select('id, order_number, status, total_amount, created_at, order_items(product_name, quantity, line_total)').order('created_at', { ascending: false })
      if (!live) return
      if (loadError) setError(loadError.message); else setOrders(data || [])
    }
    load()
    const channel = supabase.channel(`customer-orders-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` }, load).subscribe()
    return () => { live = false; supabase.removeChannel(channel) }
  }, [session])
  return <section className="account-page"><p className="eyebrow">YOUR SHOPPING HISTORY</p><h1>My <em>orders.</em></h1>{error && <p className="form-message error">{error}</p>}{orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id} className="order-card"><div className="order-top"><div><small>ORDER {order.order_number}</small><h3>{new Date(order.created_at).toLocaleString()}</h3></div><span className={`order-status status-${order.status}`}>{order.status?.replaceAll('_', ' ')}</span></div><div className="order-items">{order.order_items?.map((item, index) => <p key={`${item.product_name}-${index}`}>{item.product_name} <span>× {item.quantity}</span><strong>{pkr(item.line_total)}</strong></p>)}</div><div className="order-bottom"><strong>Total {pkr(order.total_amount)}</strong><button className="text-button" onClick={() => onShare(order.id)}>Share one-time location</button></div></article>)}</div> : <div className="empty-catalogue"><h3>No orders yet</h3><p>Your completed orders will show here.</p><Link className="button button-dark" to="/shop">Browse the shop</Link></div>}</section>
}

function ComplaintPage() {
  const { session } = useAuth()
  const [description, setDescription] = useState('')
  const [rating, setRating] = useState('')
  const [status, setStatus] = useState('')
  const [complaints, setComplaints] = useState([])
  useEffect(() => {
    if (!session) return undefined
    let active = true
    const load = async () => {
      const { data, error } = await requireSupabase().from('complaints').select('id, description, rating, status, owner_reply, created_at').order('created_at', { ascending: false })
      if (active && !error) setComplaints(data || [])
    }
    load()
    const channel = supabase.channel(`customer-feedback-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `customer_id=eq.${session.user.id}` }, load).subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [session])
  async function submit(event) {
    event.preventDefault(); setStatus('')
    try {
      const { data, error } = await requireSupabase().from('complaints').insert({ customer_id: session.user.id, description, rating: rating ? Number(rating) : null }).select('id, description, rating, status, owner_reply, created_at').single()
      if (error) throw error
      setComplaints((current) => [data, ...current])
      setDescription(''); setStatus('Thank you. Your feedback has been sent to the store.')
    } catch (error) { setStatus(error.message) }
  }
  return <section className="account-page"><p className="eyebrow">WE WANT TO HEAR FROM YOU</p><h1>Feedback & <em>support.</em></h1><form className="feedback-form" onSubmit={submit}><label className="field">Rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Select a rating (optional)</option>{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label><label className="field">How can we help?<textarea rows="5" minLength="8" required value={description} onChange={(event) => setDescription(event.target.value)} /></label>{status && <p className="form-message">{status}</p>}<button className="button button-dark">Send feedback</button></form>{complaints.length > 0 && <div className="orders-list customer-feedback-list">{complaints.map((item) => <article className="order-card" key={item.id}><div className="order-top"><div><small>{new Date(item.created_at).toLocaleDateString()}{item.rating ? ` · ${item.rating}/5` : ''}</small><h3>{item.description}</h3></div><span className="order-status">{item.status?.replaceAll('_', ' ') || 'open'}</span></div>{item.owner_reply && <p className="muted owner-reply">Shop reply: {item.owner_reply}</p>}</article>)}</div>}</section>
}

function PoliciesPage({ policies }) {
  return <section className="account-page policy-page"><p className="eyebrow">CLEAR, SIMPLE, FAIR</p><h1>Store <em>policies.</em></h1><p className="muted policy-intro">Questions about any of these policies? Contact the shop directly.</p>{policyDefaults.map((policy, index) => <article key={policy.key} className="policy-row"><span>0{index + 1}</span><div><h2>{policy.title}</h2><p>{policies?.[policy.key] || policy.body}</p></div></article>)}</section>
}
