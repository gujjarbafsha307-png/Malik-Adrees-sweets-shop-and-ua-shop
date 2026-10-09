import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function WelcomeScreen({ onContinue }) {
  const reduceMotion = useReducedMotion()
  const { t } = useLanguage()
  return (
    <motion.main className="welcome-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: reduceMotion ? 0 : 0.65 }}>
      <div className="welcome-pattern" aria-hidden="true" />
      <motion.div className="welcome-mark" initial={{ scale: 0.8, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', duration: reduceMotion ? 0 : 1 }}>
        <span>م</span><Sparkles size={21} strokeWidth={1.5} />
      </motion.div>
      <motion.p className="welcome-kicker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>CHAKKI BAZAR · SAMUNDRI</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} lang="ur">{t('welcome')}</motion.h1>
      <motion.p className="welcome-shop-name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}>Malik Idrees Shop <span>&</span> UA Trader</motion.p>
      <motion.button className="button button-light welcome-continue" onClick={onContinue} whileHover={reduceMotion ? {} : { y: -3 }} whileTap={{ scale: 0.97 }}>
        {t('continue')} <ArrowRight size={17} />
      </motion.button>
      <div className="welcome-bottom"><span>WHOLESALE · GENERAL STORE</span><span>EST. SAMUNDRI, PAKISTAN</span></div>
    </motion.main>
  )
}
