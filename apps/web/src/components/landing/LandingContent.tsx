'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Facebook, Instagram, Mail, Smartphone, Grid2x2, Wine, Coffee,
  Spade, Dices, Menu, X, ChevronLeft, ChevronRight, ImageIcon,
  Play, ArrowRight, MapPin,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

/* ── Constants ──────────────────────────────────────────────────── */

const SOCIAL = {
  facebook: 'https://facebook.com/primerariveradalos4ases',
  instagram: 'https://instagram.com/primerariveradalos4ases',
  email: 'soporte@primerariveradalos4ases.com',
}

const SERVICES = [
  { icon: Spade, label: 'Juego de Primera', desc: 'Mesas activas de cartas Primera en tiempo real.' },
  { icon: Dices, label: 'Dominó', desc: 'Partidas de dominó presenciales y con amigos.' },
  { icon: Coffee, label: 'Bebidas sin alcohol', desc: 'Café, jugos y refrescos para tu partida.' },
  { icon: Wine, label: 'Bebidas con alcohol', desc: 'Cervezas, licores y cocteles disponibles.' },
  { icon: Grid2x2, label: 'Mesas de parqués', desc: 'Juegos de mesa y parqués para pasar el rato.' },
]

const TUTORIALS = [
  { title: 'Cómo registrarte', desc: 'Crea tu cuenta en menos de 2 minutos.' },
  { title: 'Cómo jugar tu primera partida', desc: 'Únete a una mesa y empieza a jugar.' },
  { title: 'Cómo usar tu billetera', desc: 'Deposita, retira y controla tus fondos.' },
  { title: 'Cómo instalar la app', desc: 'Agrega Mesa Primera a tu celular como app.' },
]

const STEPS = [
  { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta con tu número de celular. Rápido y seguro.' },
  { step: '2', title: 'Deposita fondos', desc: 'Agrega saldo a tu billetera digital para apostar en las mesas.' },
  { step: '3', title: 'Juega', desc: 'Únete a una mesa activa o crea una nueva con tus amigos.' },
]

const CAROUSEL_SLIDES = [
  { title: 'Nuestro establecimiento', desc: 'Un espacio cómodo para jugar cartas y compartir.' },
  { title: 'Mesas de juego', desc: 'Mesas profesionales para Primera y dominó.' },
  { title: 'Bar y bebidas', desc: 'Disfruta de nuestra selección mientras juegas.' },
  { title: 'Eventos especiales', desc: 'Torneos y noches temáticas para la comunidad.' },
  { title: 'Comunidad', desc: 'Más de una década reuniendo apasionados del juego.' },
]

/* Palos de la baraja española */
const CARD_SUITS = ['⚔', '🏆', '⬤', '⚜', '⚔', '🏆']

const FLOAT_CLASSES = [
  'top-[8%] left-[8%] -rotate-12 text-[7rem]',
  'top-[15%] right-[10%] rotate-[20deg] text-[6rem]',
  'bottom-[20%] left-[12%] rotate-[15deg] text-[9rem]',
  'top-[50%] right-[5%] -rotate-[25deg] text-[5rem]',
  'bottom-[10%] right-[15%] rotate-[8deg] text-[8rem]',
  'top-[35%] left-[3%] -rotate-[10deg] text-[6rem]',
]

const SLIDE_GRADIENTS = [
  'from-brand-gold/20 to-emerald-900/40',
  'from-emerald-800/30 to-brand-gold/20',
  'from-amber-900/30 to-emerald-900/30',
  'from-brand-gold/10 to-teal-900/40',
  'from-emerald-900/30 to-brand-gold/30',
]

const NAV_SECTIONS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'como-jugar', label: 'Cómo jugar' },
  { id: 'tutoriales', label: 'Tutoriales' },
]

/* ── Component ──────────────────────────────────────────────────── */

export function LandingContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)

  /* ── Nav scroll spy ─────────────────────────────── */
  useEffect(() => {
    const ids = NAV_SECTIONS.map((s) => s.id)
    const onScroll = () => {
      setScrolled(window.scrollY > 50)
      const y = window.scrollY + 120
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el && el.offsetTop <= y) {
          setActiveSection(ids[i])
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }, [])

  /* ── Carousel ───────────────────────────────────── */
  const nextSlide = useCallback(() => {
    setCurrentSlide((p) => (p + 1) % CAROUSEL_SLIDES.length)
  }, [])
  const prevSlide = useCallback(() => {
    setCurrentSlide((p) => (p - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)
  }, [])

  useEffect(() => {
    if (carouselPaused) return
    const id = setInterval(nextSlide, 4500)
    return () => clearInterval(id)
  }, [carouselPaused, nextSlide])

  // Apply carousel transform via JS (CSP-safe — no inline style in SSR)
  useEffect(() => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.transform = `translateX(-${currentSlide * 100}%)`
    }
  }, [currentSlide])

  /* ── GSAP Animations ────────────────────────────── */
  useGSAP(
    () => {
      if (!containerRef.current) return

      // Accessibility — skip animations if user prefers reduced motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Hero entrance
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      heroTl
        .from('[data-hero-title]', { y: 80, opacity: 0, duration: 1.2 })
        .from('[data-hero-subtitle]', { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('[data-hero-cta]', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('[data-hero-hint]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')

      // Floating card symbols
      gsap.utils.toArray<Element>('[data-float]').forEach((el, i) => {
        gsap.to(el, {
          y: 'random(-20, 20)',
          x: 'random(-10, 10)',
          rotation: 'random(-5, 5)',
          duration: 'random(3, 5)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.4,
        })
      })

      // Wave text — "Quiénes somos" character-by-character
      const waveHeading = containerRef.current.querySelector('[data-wave-heading]')
      if (waveHeading) {
        const chars = waveHeading.querySelectorAll('.wave-char')
        gsap.fromTo(
          chars,
          { y: 40, opacity: 0, scale: 0.7 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.04,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: waveHeading,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      }

      // Generic reveals (fade up)
      gsap.utils.toArray<Element>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      })

      // Reveal from left
      gsap.utils.toArray<Element>('[data-reveal-left]').forEach((el) => {
        gsap.from(el, {
          x: -80,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      })

      // Reveal from right
      gsap.utils.toArray<Element>('[data-reveal-right]').forEach((el) => {
        gsap.from(el, {
          x: 80,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      })

      // Stagger cards entrance
      ScrollTrigger.batch('[data-stagger-card]', {
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            overwrite: true,
          }),
        onLeaveBack: (batch) =>
          gsap.to(batch, {
            y: 50,
            opacity: 0,
            scale: 0.92,
            duration: 0.4,
            stagger: 0.05,
            ease: 'power2.in',
            overwrite: true,
          }),
        start: 'top 88%',
      })
      // Set initial state for stagger cards
      gsap.set('[data-stagger-card]', { y: 50, opacity: 0, scale: 0.92 })

      // Steps — sequential pop with rotation
      gsap.utils.toArray<Element>('[data-step]').forEach((el, i) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          scale: 0.85,
          rotation: i % 2 === 0 ? -5 : 5,
          duration: 0.8,
          delay: i * 0.2,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        })
      })

      // Gold connecting line (desktop only)
      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        gsap.from('[data-gold-line]', {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 1.5,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: '[data-gold-line]',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      })

      // Final CTA — elastic entrance
      gsap.from('[data-cta-final]', {
        scale: 0.8,
        opacity: 0,
        y: 60,
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)',
        scrollTrigger: {
          trigger: '[data-cta-final]',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })

      // Gold dividers
      gsap.utils.toArray<Element>('[data-divider]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          scaleX: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        })
      })
    },
    { scope: containerRef },
  )

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-x-clip">
      {/* ── Casino Background ─────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-bg-poker)_0%,#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] noise-texture" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-brand-gold/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
          <button
            onClick={() => scrollTo('inicio')}
            className="font-display font-bold text-xl tracking-[0.2em] text-brand-gold hover:text-brand-gold-light transition-colors"
          >
            4 ASES
          </button>

          <div className="hidden md:flex items-center gap-8">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`text-sm font-semibold tracking-wide uppercase transition-colors relative pb-1 ${
                  activeSection === s.id
                    ? 'text-brand-gold'
                    : 'text-text-secondary hover:text-text-premium'
                }`}
              >
                {s.label}
                {activeSection === s.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login/player"
              className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-text-secondary hover:text-brand-gold transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register/player"
              className="hidden sm:inline-block px-5 py-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-bold hover:bg-brand-gold/20 transition-all"
            >
              Crear cuenta
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-text-secondary hover:text-brand-gold transition-colors p-1"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          mobileOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          <div className="bg-slate-950/95 backdrop-blur-xl border-t border-white/5">
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`text-left py-3 text-base font-semibold transition-colors ${
                    activeSection === s.id ? 'text-brand-gold' : 'text-text-secondary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
                <Link
                  href="/login/player"
                  className="flex-1 text-center px-4 py-3 rounded-xl border border-white/10 text-text-secondary text-sm font-bold"
                  onClick={() => setMobileOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register/player"
                  className="flex-1 text-center px-4 py-3 rounded-xl bg-brand-gold text-slate-950 text-sm font-bold"
                  onClick={() => setMobileOpen(false)}
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Animated Content ──────────────────────── */}
      <div ref={containerRef} className="relative z-10">
        {/* ═══ Hero ════════════════════════════════ */}
        <section
          id="inicio"
          className="relative flex flex-col items-center justify-center text-center min-h-screen px-6 pt-20"
        >
          {/* Floating Spanish naipe symbols */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {CARD_SUITS.map((suit, i) => (
              <span
                key={i}
                data-float=""
                className={`absolute text-brand-gold/5 font-serif select-none will-change-transform ${FLOAT_CLASSES[i]}`}
              >
                {suit}
              </span>
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto">
            <h1
              data-hero-title=""
              className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-[1.1]"
            >
              <span className="bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent">
                Primera Riverada
              </span>
              <br />
              <span className="text-text-premium">los 4 Ases</span>
            </h1>

            <p
              data-hero-subtitle=""
              className="mt-8 text-lg md:text-xl lg:text-2xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
            >
              Club de cartas, dominó y entretenimiento.{' '}
              <span className="text-text-premium font-semibold">Juega Primera online</span>{' '}
              con amigos en tiempo real o visítanos en nuestro establecimiento.
            </p>

            <div data-hero-cta="" className="mt-12 flex flex-wrap justify-center gap-4">
              <Link
                href="/register/player"
                className="group px-10 py-4 rounded-2xl bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold text-lg shadow-[0_4px_24px_rgba(226,176,68,0.35)] hover:shadow-[0_8px_40px_rgba(226,176,68,0.5)] hover:scale-[1.03] transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                Crear cuenta gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login/player"
                className="px-10 py-4 rounded-2xl border-2 border-brand-gold/30 text-brand-gold font-bold text-lg hover:bg-brand-gold/10 hover:border-brand-gold/50 transition-all duration-300 active:scale-95"
              >
                Iniciar sesión
              </Link>
            </div>

            <div
              data-hero-hint=""
              className="mt-10 mb-16 md:mb-20 flex justify-center"
            >
              <button onClick={() => document.getElementById('instalar-app')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/25 backdrop-blur-sm hover:bg-brand-gold/15 hover:border-brand-gold/40 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-gold/15 border border-brand-gold/20 group-hover:bg-brand-gold/25 transition-all">
                  <Smartphone className="w-5 h-5 text-brand-gold" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-text-premium">
                    Disponible como app
                  </p>
                  <p className="text-xs text-text-secondary">
                    Instálala desde tu navegador en cualquier celular
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Scroll indicator */}
            <div className="absolute bottom-4 md:bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-brand-gold/30 animate-bounce">
            <span className="text-[10px] tracking-widest uppercase">Scroll</span>
            <div className="w-px h-6 bg-linear-to-b from-brand-gold/30 to-transparent" />
          </div>
        </section>

        {/* ── Gold Divider ── */}
        <div data-divider="" className="flex items-center justify-center gap-3 py-4">
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-brand-gold/30" />
          <span className="text-brand-gold/25 text-lg">⚔</span>
          <span className="text-brand-gold/25 text-lg">🏆</span>
          <span className="text-brand-gold/25 text-lg">⬤</span>
          <span className="text-brand-gold/25 text-lg">⚜</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-brand-gold/30" />
        </div>

        {/* ═══ About ═══════════════════════════════ */}
        <section id="nosotros" className="px-6 py-20 md:py-28">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-start">
            {/* Decorative left accent */}
            <div
              className="hidden md:flex flex-col items-center gap-4 pt-2"
              data-reveal-left=""
            >
              <div className="w-px h-16 bg-linear-to-b from-brand-gold/50 to-brand-gold/10" />
              <span className="text-brand-gold/60 text-2xl">⚔</span>
              <div className="w-px h-16 bg-linear-to-b from-brand-gold/10 to-transparent" />
            </div>

            <div>
              <h2
                data-wave-heading=""
                className="text-3xl md:text-5xl font-display font-bold mb-8"
              >
                {'Quiénes'.split('').map((c, i) => (
                  <span key={i} className="wave-char inline-block">{c}</span>
                ))}
                <span className="wave-char inline-block">{'\u00A0'}</span>
                {'somos'.split('').map((c, i) => (
                  <span key={`g${i}`} className="wave-char inline-block text-brand-gold">{c}</span>
                ))}
              </h2>
              <div
                data-reveal-left=""
                className="bg-white/3 border border-white/8 rounded-3xl p-8 md:p-12 backdrop-blur-sm"
              >
                <p className="text-text-secondary text-lg leading-relaxed">
                  Somos un club de entretenimiento con tradición en el juego de cartas
                  <strong className="text-text-premium"> Primera</strong> y dominó. Con
                  años de experiencia reuniendo jugadores, ahora también ofrecemos
                  partidas online en tiempo real para que disfrutes desde cualquier
                  lugar.
                </p>
                <p className="mt-6 text-text-secondary text-lg leading-relaxed">
                  Nuestro compromiso es el{' '}
                  <strong className="text-text-premium">fair play</strong>, la seguridad
                  de tus fondos y una comunidad de jugadores respetuosa.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Services ════════════════════════════ */}
        <section id="servicios" className="px-6 py-20 md:py-28 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <h2
              data-reveal-right=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-4"
            >
              Nuestro{' '}
              <span className="text-brand-gold">establecimiento</span>
            </h2>
            <p
              data-reveal=""
              className="text-center text-text-secondary mb-16 max-w-2xl mx-auto text-lg"
            >
              Visítanos en persona y disfruta de un espacio cómodo para jugar, comer
              y compartir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((s) => (
                <div
                  key={s.label}
                  data-stagger-card=""
                  className="group bg-white/3 border border-white/8 rounded-2xl p-7 hover:border-brand-gold/30 hover:bg-brand-gold/3 transition-all duration-500 cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-5 group-hover:bg-brand-gold/20 group-hover:border-brand-gold/40 transition-all duration-500">
                    <s.icon className="w-6 h-6 text-brand-gold" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{s.label}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gold Divider ── */}
        <div
          data-divider=""
          className="flex items-center justify-center gap-3 py-4 bg-black/20"
        >
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-brand-gold/30" />
          <span className="text-brand-gold/25 text-lg">⬤</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-brand-gold/30" />
        </div>

        {/* ═══ Photo Carousel ══════════════════════ */}
        <section className="px-6 py-20 md:py-28 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <h2
              data-reveal-left=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-12"
            >
              Nuestro <span className="text-brand-gold">espacio</span>
            </h2>

            <div
              data-reveal=""
              className="relative overflow-hidden rounded-3xl bg-white/3 border border-white/8"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
            >
              <div
                ref={carouselTrackRef}
                className="flex transition-transform duration-700 ease-out"
              >
                {CAROUSEL_SLIDES.map((slide, i) => (
                  <div
                    key={i}
                    className="w-full shrink-0 aspect-16/7 flex flex-col items-center justify-center p-8 md:p-16 relative"
                  >
                    <div
                      className={`absolute inset-0 opacity-30 bg-linear-to-br ${SLIDE_GRADIENTS[i]}`}
                    />
                    <ImageIcon className="w-12 h-12 text-brand-gold/30 mb-4 relative z-10" />
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-text-premium relative z-10 text-center">
                      {slide.title}
                    </h3>
                    <p className="text-text-secondary mt-2 relative z-10 text-center max-w-md">
                      {slide.desc}
                    </p>
                    <span className="mt-4 text-xs text-brand-gold/30 relative z-10 tracking-wider uppercase">
                      Foto próximamente
                    </span>
                  </div>
                ))}
              </div>

              {/* Arrows */}
              <button
                onClick={prevSlide}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {CAROUSEL_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Ir a slide ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      currentSlide === i
                        ? 'bg-brand-gold w-8'
                        : 'bg-white/20 hover:bg-white/40 w-2.5'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ How to Play ═════════════════════════ */}
        <section id="como-jugar" className="px-6 py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <h2
              data-reveal-right=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-4"
            >
              Cómo <span className="text-brand-gold">jugar</span>
            </h2>
            <p
              data-reveal=""
              className="text-center text-text-secondary mb-16 max-w-2xl mx-auto text-lg"
            >
              En tres pasos estás dentro de una mesa de Primera.
            </p>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {/* Connecting gold line (desktop) */}
              <div
                data-gold-line=""
                className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-linear-to-r from-brand-gold/30 via-brand-gold/50 to-brand-gold/30"
              />

              {STEPS.map((item) => (
                <div key={item.step} data-step="" className="text-center relative">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-linear-to-br from-brand-gold/20 to-brand-gold/5 border-2 border-brand-gold/30 flex items-center justify-center shadow-[0_0_20px_rgba(226,176,68,0.15)]">
                    <span className="text-2xl font-display font-black text-brand-gold">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed max-w-65 mx-auto">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gold Divider ── */}
        <div data-divider="" className="flex items-center justify-center gap-3 py-4">
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-brand-gold/30" />
          <span className="text-brand-gold/25 text-lg">⚜</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-brand-gold/30" />
        </div>

        {/* ═══ Tutorials ═══════════════════════════ */}
        <section id="tutoriales" className="px-6 py-20 md:py-28 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <h2
              data-reveal-left=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-4"
            >
              Cómo usar la{' '}
              <span className="text-brand-gold">plataforma</span>
            </h2>
            <p
              data-reveal=""
              className="text-center text-text-secondary mb-16 max-w-2xl mx-auto text-lg"
            >
              Videos tutoriales para que aprendas a usar todas las funciones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {TUTORIALS.map((t) => (
                <div
                  key={t.title}
                  id={t.title === 'Cómo instalar la app' ? 'instalar-app' : undefined}
                  data-stagger-card=""
                  className="group bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col hover:border-brand-gold/20 transition-all duration-500"
                >
                  <div className="w-full aspect-video rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-center mb-5 group-hover:border-brand-gold/10 transition-all overflow-hidden relative">
                    <div className="absolute inset-0 bg-linear-to-br from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex flex-col items-center gap-2 text-text-secondary/50">
                      <Play className="w-8 h-8" />
                      <span className="text-xs tracking-wider uppercase">
                        Próximamente
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{t.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Final CTA ═══════════════════════════ */}
        <section data-cta-final="" className="px-6 py-24 md:py-32 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              ¿Listo para{' '}
              <span className="text-brand-gold">jugar</span>?
            </h2>
            <p className="text-text-secondary text-lg mb-12 max-w-xl mx-auto">
              Únete a la comunidad de jugadores de Primera más grande de Colombia.
            </p>
            <Link
              href="/register/player"
              className="group inline-flex items-center gap-2 px-12 py-5 rounded-2xl bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold text-lg shadow-[0_4px_24px_rgba(226,176,68,0.35)] hover:shadow-[0_8px_40px_rgba(226,176,68,0.5)] hover:scale-[1.03] transition-all duration-300 active:scale-95"
            >
              Crear cuenta gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* ═══ Footer ══════════════════════════════ */}
        <footer
          data-reveal=""
          className="border-t border-brand-gold/10 bg-black/30 px-6 py-14"
        >
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <p className="font-display font-bold text-xl tracking-wider text-brand-gold">
                Primera Riverada los 4 Ases
              </p>
              <p className="text-text-secondary text-sm mt-2">
                Club de cartas, dominó y entretenimiento.
              </p>
              <p className="flex items-center gap-1.5 text-text-secondary text-sm mt-1.5 justify-center md:justify-start">
                <MapPin className="w-3.5 h-3.5 text-brand-gold/70 shrink-0" />
                Cra. 7 #06-87, Neiva, Huila
              </p>
            </div>

            <nav className="flex gap-6" aria-label="Enlaces legales">
              <Link
                href="/privacy"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors"
              >
                Política de privacidad
              </Link>
              <Link
                href="/terms"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors"
              >
                Términos y condiciones
              </Link>
            </nav>

            <div className="flex gap-3" role="list" aria-label="Redes sociales">
              <a
                href={SOCIAL.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de Primera Riverada los 4 Ases"
                className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Primera Riverada los 4 Ases"
                className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={`mailto:${SOCIAL.email}`}
                aria-label="Correo electrónico de contacto"
                className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <p className="text-center text-text-secondary/50 text-xs mt-10">
            © {new Date().getFullYear()} Primera Riverada los 4 Ases. Todos los
            derechos reservados.
          </p>
        </footer>
      </div>
    </div>
  )
}
