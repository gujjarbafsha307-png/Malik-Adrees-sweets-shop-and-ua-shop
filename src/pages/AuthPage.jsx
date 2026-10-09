import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Store } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const initialFields = { full_name: '', shop_name: '', shop_address: '', chak_number: '', phone_number: '', email: '', password: '' }

export default function AuthPage({ role, register = false }) {
  const [fields, setFields] = useState(initialFields)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [accepted, setAccepted] = useState(false)
  const { signIn, signUp, signOut } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isOwner = role === 'owner'

  function change(event) {
    setFields((current) => ({ ...current, [event.target.name]: event.target.value }))
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (register) {
        if (!accepted) throw new Error('Please accept the store policies to continue.')
        if (fields.password.length < 8) throw new Error('Use a password with at least 8 characters.')
        const result = await signUp({ email: fields.email.trim(), password: fields.password, full_name: fields.full_name.trim(), shop_name: fields.shop_name.trim(), shop_address: fields.shop_address.trim(), chak_number: fields.chak_number.trim(), phone_number: fields.phone_number.trim() })
        setMessage(result.session ? 'Your account is ready. You can now sign in.' : 'Registration received. Check your email to confirm your account, then sign in.')
        if (result.session) navigate('/shop')
      } else {
        const profile = await signIn(fields.email.trim(), fields.password)
        if (profile?.role !== role) {
          await signOut()
          throw new Error(isOwner ? 'This account does not have owner access.' : 'Please use an owner account on the owner sign-in page.')
        }
        navigate(isOwner ? '/owner' : '/shop')
      }
    } catch (error) {
      setMessage(error.message || 'We could not complete that request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = (name, label, options = {}) => <label className="field" key={name}>{label}<input name={name} value={fields[name]} onChange={change} required type={options.type || 'text'} autoComplete={options.autoComplete} placeholder={options.placeholder || ''} /></label>
  return <main className="auth-layout">
    <aside className="auth-brand-panel"><Link to="/" className="wordmark">MI<span>✳</span></Link><div className="auth-brand-copy"><span className="eyebrow">CHAKKI BAZAR · SAMUNDRI</span><h1>Good goods.<br /><em>Good people.</em></h1><p>A dependable wholesale stop for the things your shop needs.</p></div><span className="auth-side-note">MALIK IDREES SHOP & UA TRADER</span></aside>
    <section className="auth-form-panel">
      <Link to="/choose" className="back-link"><ArrowLeft size={16} /> Back</Link>
      <div className="auth-form-wrap"><span className="auth-symbol"><Store size={20} /></span><p className="eyebrow">{isOwner ? 'STORE MANAGEMENT' : 'WELCOME TO THE SHOP'}</p><h2>{register ? 'Create your account' : isOwner ? 'Owner sign in' : 'Sign in to your account'}</h2><p className="muted">{register ? 'Tell us a little about your business.' : isOwner ? 'Sign in with the owner email configured in Supabase.' : 'Your shop orders and account, all in one place.'}</p>
        <form onSubmit={submit} className="auth-form">
          {register && <>{field('full_name', 'Full name', { autoComplete: 'name' })}{field('shop_name', 'Shop name')}{field('shop_address', 'Shop address')}{field('chak_number', 'Chak number')}{field('phone_number', 'Phone number', { type: 'tel', autoComplete: 'tel' })}</>}
          {field('email', 'Email address', { type: 'email', autoComplete: 'email' })}
          <label className="field">Password<span className="password-input"><input name="password" required value={fields.password} onChange={change} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} /><button className="icon-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {register && <label className="checkbox-field"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> I agree to the <Link to="/policies">store policies</Link>.</label>}
          {message && <p className={message.startsWith('Registration') || message.startsWith('Your account') ? 'form-message success' : 'form-message error'} role="alert">{message}</p>}
          <button className="button button-dark form-submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : <>{t('signIn')} <LockKeyhole size={16} /></>}</button>
        </form>
        {!isOwner && <p className="auth-switch">{register ? 'Already registered?' : 'New customer?'} <Link to={register ? '/auth/customer' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>}
      </div>
    </section>
  </main>
}
