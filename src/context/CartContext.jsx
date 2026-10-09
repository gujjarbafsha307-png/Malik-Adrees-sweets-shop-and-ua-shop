/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { session } = useAuth()
  const storageKey = `malik-shop-cart:${session?.user?.id || 'guest'}`
  return <CartState key={storageKey} storageKey={storageKey}>{children}</CartState>
}

function CartState({ children, storageKey }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items, storageKey])

  const value = {
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + Number(item.price) * item.quantity, 0),
    add(product) {
      const discountedPrice = Number((product.price * (1 - (product.discount_percent || 0) / 100)).toFixed(2))
      setItems((current) => {
        const found = current.find((item) => item.id === product.id)
        if (found) return current.map((item) => item.id === product.id ? { ...item, price: discountedPrice, stock_quantity: product.stock_quantity, quantity: Math.min(item.quantity + 1, product.stock_quantity) } : item)
        return [...current, { ...product, price: discountedPrice, quantity: 1 }]
      })
    },
    setQuantity(id, quantity) {
      setItems((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, item.stock_quantity) } : item))
    },
    remove(id) { setItems((current) => current.filter((item) => item.id !== id)) },
    clear() { setItems([]) },
  }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used within CartProvider')
  return value
}
