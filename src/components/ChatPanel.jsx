import { useEffect, useState } from 'react'
import { ArrowUp, MessageCircle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase, supabase } from '../services/supabase'

export default function ChatPanel({ open, onClose, owner = false, conversations = [], selectedConversationId = '' }) {
  const { session } = useAuth()
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  useEffect(() => {
    if (!open || !session || !supabase) return undefined
    let live = true
    const initialize = async () => {
      try {
        if (owner) { setConversationId(selectedConversationId || conversations[0]?.id || ''); return }
        const client = requireSupabase()
        const { data: existing, error: lookupError } = await client.from('conversations').select('id').eq('customer_id', session.user.id).maybeSingle()
        if (lookupError) throw lookupError
        if (existing) {
          if (live) setConversationId(existing.id)
        } else {
          const { data, error } = await client.from('conversations').insert({ customer_id: session.user.id }).select('id').single()
          if (error) throw error
          if (live) setConversationId(data.id)
        }
      } catch (error) { if (live) setProblem(error.message) }
    }
    initialize()
    return () => { live = false }
  }, [open, session, owner, selectedConversationId, conversations])
  useEffect(() => {
    if (!open || !conversationId || !supabase) return undefined
    let live = true
    const load = async () => { const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at'); if (!live) return; if (error) setProblem(error.message); else setMessages(data || []) }
    load()
    const channel = supabase.channel(`messages-${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => setMessages((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new])).subscribe()
    return () => { live = false; supabase.removeChannel(channel) }
  }, [open, conversationId])
  async function send(event) {
    event.preventDefault()
    if (!draft.trim() || !conversationId) return
    setBusy(true); setProblem('')
    try { const { error } = await requireSupabase().from('messages').insert({ conversation_id: conversationId, sender_id: session.user.id, body: draft.trim() }); if (error) throw error; setDraft('') }
    catch (error) { setProblem(error.message) } finally { setBusy(false) }
  }
  if (!open) return null
  return <section className="chat-panel" aria-label="Chat with the store"><header><span className="chat-heading-icon"><MessageCircle size={17} /></span><div><strong>{owner ? 'Customer conversation' : 'Message the shop'}</strong><small>{owner ? conversations.find((item) => item.id === conversationId)?.profiles?.full_name || 'Customer' : 'Replies appear here in real time'}</small></div>{owner && conversations.length > 1 && <select aria-label="Select conversation" value={conversationId} onChange={(event) => setConversationId(event.target.value)}>{conversations.map((item) => <option key={item.id} value={item.id}>{item.profiles?.full_name || item.customer_id.slice(0, 8)}</option>)}</select>}<button className="icon-button" onClick={onClose} aria-label="Close chat"><X size={17} /></button></header><div className="chat-messages">{messages.length ? messages.map((message) => <div key={message.id} className={`chat-message ${message.sender_id === session?.user?.id ? 'mine' : ''}`}><p>{message.body}</p><small>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="chat-empty"><MessageCircle size={24} /><p>Start a conversation with the shop.</p></div>}{problem && <p className="chat-error">{problem}</p>}</div><form className="chat-compose" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${owner ? 'customer' : 'the shop'}…`} aria-label="Message" /><button disabled={busy || !draft.trim()} aria-label="Send message"><ArrowUp size={17} /></button></form></section>
}
