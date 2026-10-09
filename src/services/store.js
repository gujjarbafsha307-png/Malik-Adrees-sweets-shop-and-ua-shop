import { requireSupabase } from './supabase'

export async function submitOrder(items, notes = '', idempotencyKey) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('place_order', {
    p_items: items.map(({ id, quantity }) => ({ product_id: id, quantity })),
    p_notes: notes,
    p_idempotency_key: idempotencyKey,
  })
  if (error) throw error
  return data
}

export async function uploadProductImage(file, userId) {
  const client = requireSupabase()
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-')
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from('product-images').upload(path, file, { upsert: false })
  if (error) throw error
  return client.storage.from('product-images').getPublicUrl(path).data.publicUrl
}
