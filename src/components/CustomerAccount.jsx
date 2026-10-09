import { useState } from 'react'
import { Check, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function CustomerAccount() {
  const { profile, updateProfile } = useAuth()
  const [fields, setFields] = useState({ full_name: profile?.full_name || '', shop_name: profile?.shop_name || '', shop_address: profile?.shop_address || '', chak_number: profile?.chak_number || '', phone_number: profile?.phone_number || '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await updateProfile(fields); setMessage('Your account details were saved.') }
    catch (error) { setMessage(error.message || 'We could not save those changes.') }
    finally { setBusy(false) }
  }
  return <section className="account-page"><p className="eyebrow">YOUR BUSINESS PROFILE</p><h1>Account <em>details.</em></h1><form className="feedback-form" onSubmit={submit}><label className="field">Full name<input required value={fields.full_name} onChange={(event) => setFields({ ...fields, full_name: event.target.value })}/></label><label className="field">Shop name<input required value={fields.shop_name} onChange={(event) => setFields({ ...fields, shop_name: event.target.value })}/></label><label className="field">Shop address<input required value={fields.shop_address} onChange={(event) => setFields({ ...fields, shop_address: event.target.value })}/></label><label className="field">Chak number<input value={fields.chak_number} onChange={(event) => setFields({ ...fields, chak_number: event.target.value })}/></label><label className="field">Phone number<input required type="tel" value={fields.phone_number} onChange={(event) => setFields({ ...fields, phone_number: event.target.value })}/></label>{message && <p className="form-message success">{message}</p>}<button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : <>Save account <Check size={15}/></>}</button></form><div className="account-email"><UserRound size={15}/> Signed in as {profile?.full_name}</div></section>
}
