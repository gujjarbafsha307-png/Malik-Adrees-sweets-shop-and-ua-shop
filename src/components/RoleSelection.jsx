import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, BriefcaseBusiness, ShoppingBag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function RoleSelection() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { t } = useLanguage()
  return (
    <main className="role-page">
      <div className="role-topline"><a className="wordmark" href="/">MI<span>✳</span></a><span>CHAKKI BAZAR · SAMUNDRI</span></div>
      <section className="role-content">
        <p className="eyebrow">MALIK IDREES SHOP & UA TRADER</p>
        <h1>Good to have<br />you <em>here.</em></h1>
        <p className="role-intro">Choose how you would like to continue.</p>
        <div className="role-options">
          {[{ key: 'customer', icon: ShoppingBag, title: t('customer'), text: 'Browse the catalogue and place an order.', path: '/auth/customer' }, { key: 'owner', icon: BriefcaseBusiness, title: t('owner'), text: 'Manage products, orders and your store.', path: '/auth/owner' }].map((item, index) => {
            const Icon = item.icon
            return <motion.button key={item.key} className={`role-card role-${item.key}`} onClick={() => navigate(item.path)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }} whileHover={reduceMotion ? {} : { y: -5 }}>
              <span className="role-icon"><Icon size={21} /></span><span className="role-copy"><strong>{item.title}</strong><small>{item.text}</small></span><ArrowUpRight className="role-arrow" size={19} />
            </motion.button>
          })}
        </div>
        <button className="text-button register-link" onClick={() => navigate('/register')}>New customer? Create an account <ArrowUpRight size={15} /></button>
      </section>
      <footer className="role-footer"><span>FAMILY-RUN · LOCALLY TRUSTED</span><span>0310 40866111</span></footer>
    </main>
  )
}
