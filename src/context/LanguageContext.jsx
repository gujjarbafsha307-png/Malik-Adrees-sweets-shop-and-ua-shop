/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const translations = {
  en: { shop: 'Shop', search: 'Search products', categories: 'Categories', all: 'All products', cart: 'Your basket', checkout: 'Checkout', orders: 'My orders', account: 'Account', signIn: 'Sign in', signOut: 'Sign out', owner: 'Owner', customer: 'Customer', continue: 'Continue', welcome: 'Assalamualaikum', empty: 'No products yet', emptyHint: 'Our catalogue will appear here as soon as the shop adds products.', add: 'Add to basket', total: 'Total', placeOrder: 'Place order', loading: 'Loading', policies: 'Store policies', contact: 'Contact', price: 'Price', stock: 'In stock', dashboard: 'Dashboard', products: 'Products', customers: 'Customers', complaints: 'Feedback', save: 'Save', cancel: 'Cancel' },
  ur: { shop: 'دکان', search: 'مصنوعات تلاش کریں', categories: 'اقسام', all: 'تمام مصنوعات', cart: 'آپ کی ٹوکری', checkout: 'آرڈر مکمل کریں', orders: 'میرے آرڈرز', account: 'اکاؤنٹ', signIn: 'لاگ ان', signOut: 'لاگ آؤٹ', owner: 'مالک', customer: 'گاہک', continue: 'جاری رکھیں', welcome: 'السلام علیکم', empty: 'ابھی کوئی مصنوعات نہیں', emptyHint: 'دکان کی مصنوعات شامل ہوتے ہی یہاں نظر آئیں گی۔', add: 'ٹوکری میں شامل کریں', total: 'کل', placeOrder: 'آرڈر بھیجیں', loading: 'لوڈ ہو رہا ہے', policies: 'دکان کی پالیسیاں', contact: 'رابطہ', price: 'قیمت', stock: 'دستیاب اسٹاک', dashboard: 'ڈیش بورڈ', products: 'مصنوعات', customers: 'گاہک', complaints: 'رائے', save: 'محفوظ کریں', cancel: 'منسوخ' },
  ar: { shop: 'المتجر', search: 'ابحث عن المنتجات', categories: 'الفئات', all: 'جميع المنتجات', cart: 'سلتك', checkout: 'إتمام الطلب', orders: 'طلباتي', account: 'الحساب', signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', owner: 'المالك', customer: 'العميل', continue: 'متابعة', welcome: 'السلام عليكم', empty: 'لا توجد منتجات بعد', emptyHint: 'ستظهر المنتجات هنا عندما يضيفها المتجر.', add: 'أضف إلى السلة', total: 'الإجمالي', placeOrder: 'إرسال الطلب', loading: 'جار التحميل', policies: 'سياسات المتجر', contact: 'اتصل بنا', price: 'السعر', stock: 'المخزون المتاح', dashboard: 'لوحة التحكم', products: 'المنتجات', customers: 'العملاء', complaints: 'الملاحظات', save: 'حفظ', cancel: 'إلغاء' },
}
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('malik-shop-language') || 'en')
  useEffect(() => {
    localStorage.setItem('malik-shop-language', language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl'
  }, [language])
  const value = { language, setLanguage, t: (key) => translations[language][key] || translations.en[key] || key }
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used within LanguageProvider')
  return value
}
