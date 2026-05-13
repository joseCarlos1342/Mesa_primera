'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Mail, Smartphone, Grid2x2, Wine, Coffee,
  Spade, Dices, Menu, X, ChevronLeft, ChevronRight, ImageIcon,
  Play, ArrowRight, MapPin, Navigation,
} from 'lucide-react'
import { LOCAL_LOCATION } from '@/components/landing/LocationMap'

const LocationMap = dynamic(
  () => import('@/components/landing/LocationMap').then((m) => ({ default: m.LocationMapInner })),
  { ssr: false },
)

const TutorialWalkthrough = dynamic(
  () => import('@/components/landing/tutorials/TutorialWalkthrough').then((m) => ({ default: m.TutorialWalkthrough })),
  { ssr: false },
)

const TUTORIAL_IMPORTS = {
  'Cómo instalar la app': () => import('@/components/landing/tutorials/InstallAppTutorial').then((m) => m.installAppSteps),
  'Cómo registrarte': () => import('@/components/landing/tutorials/RegisterTutorial').then((m) => m.registerSteps),
  'Cómo iniciar sesión': () => import('@/components/landing/tutorials/LoginTutorial').then((m) => m.loginSteps),
  'Cómo cargar saldo': () => import('@/components/landing/tutorials/WalletTutorial').then((m) => m.walletSteps),
  'Cómo retirar saldo': () => import('@/components/landing/tutorials/WithdrawTutorial').then((m) => m.withdrawSteps),
  'Cómo transferir saldo': () => import('@/components/landing/tutorials/TransferTutorial').then((m) => m.transferSteps),
  'Cómo jugar tu primera partida': () => import('@/components/landing/tutorials/FirstGameTutorial').then((m) => m.firstGameSteps),
  'Funciones del menú de mesa': () => import('@/components/landing/tutorials/GameMenuTutorial').then((m) => m.gameMenuSteps),
  'Amigos': () => import('@/components/landing/tutorials/FriendsTutorial').then((m) => m.friendsSteps),
} as const

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
  { title: 'Cómo instalar la app', desc: 'Agrega Mesa Primera a tu celular como app.' },
  { title: 'Cómo registrarte', desc: 'Crea tu cuenta en menos de 2 minutos.' },
  { title: 'Cómo iniciar sesión', desc: 'Entra con tu teléfono, PIN o huella.' },
  { title: 'Cómo cargar saldo', desc: 'Deposita fondos vía Nequi y juega.' },
  { title: 'Cómo retirar saldo', desc: 'Retira tus ganancias a tu cuenta bancaria.' },
  { title: 'Cómo transferir saldo', desc: 'Envía fichas a otros jugadores.' },
  { title: 'Cómo jugar tu primera partida', desc: 'Únete a una mesa y empieza a jugar.' },
  { title: 'Funciones del menú de mesa', desc: 'Audio, reglas, admin, transferir y salir.' },
  { title: 'Amigos', desc: 'Agrega, elimina, invita y chatea con amigos.' },
]

const FAQ_ITEMS = [
  {
    q: '¿Dónde queda Primera Riverada los 4 Ases?',
    a: 'Nuestro establecimiento está en Neiva, Huila (Cra. 7 #06-87), y también puedes jugar online en tiempo real desde la plataforma. Primera Riverada Neiva — el club de cartas y tomadero de la región.',
  },
  {
    q: '¿Puedo tomar bebidas y jugar en el mismo lugar?',
    a: 'Sí. El club combina mesas de juego con zona de bebidas para una experiencia social completa.',
  },
  {
    q: '¿Cómo empiezo a jugar en línea?',
    a: 'Crea tu cuenta, valida tu número de celular y entra a una mesa activa de Primera con otros jugadores.',
  },
  {
    q: '¿Dónde reviso reglas y seguridad del sitio?',
    a: 'Puedes revisar reglas del juego, políticas de seguridad y términos desde las páginas públicas oficiales.',
  },
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
  { id: 'faq', label: 'FAQ' },
  { id: 'ubicacion', label: 'Ubicación' },
]

/* ── Tutorial Carousel (horizontal) ─────────────────────────────── */

function TutorialCarousel({
  tutorials,
  onSelect,
}: {
  tutorials: { title: string; desc: string; preview?: string }[]
  onSelect: (title: string) => void
}) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(1)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const total = tutorials.length

  useEffect(() => {
    const updateVisible = () => setVisible(window.innerWidth >= 640 ? 2 : 1)
    updateVisible()
    window.addEventListener('resize', updateVisible)
    return () => window.removeEventListener('resize', updateVisible)
  }, [])

  const go = useCallback(
    (dir: 'next' | 'prev') => {
      setIndex((prev) => {
        const next = dir === 'next' ? prev + 1 : prev - 1
        return Math.max(0, Math.min(next, total - visible))
      })
    },
    [total, visible],
  )

  const goTo = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(i, total - visible)))
    },
    [total, visible],
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return
      const delta = e.changedTouches[0].clientX - touchStart
      const threshold = 50
      if (Math.abs(delta) > threshold) {
        if (delta > 0) go('prev')
        else go('next')
      }
      setTouchStart(null)
    },
    [touchStart, go],
  )

  useEffect(() => {
    if (trackRef.current) {
      const cardW = trackRef.current.children[0]?.getBoundingClientRect().width ?? 0
      const gap = 24
      trackRef.current.style.transform = `translateX(-${index * (cardW + gap)}px)`
    }
  }, [index])

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full flex items-center">
        {/* Left arrow */}
        <button
          onClick={() => go('prev')}
          disabled={index === 0}
          className="hidden sm:flex shrink-0 mr-2 p-2 rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-10"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Track */}
        <div
          className="overflow-hidden flex-1"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={trackRef}
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ width: 'max-content', touchAction: 'pan-y' }}
          >
            {tutorials.map((t, i) => (
              <div
                key={t.title}
                id={t.title === 'Cómo instalar la app' ? 'instalar-app' : undefined}
                onClick={() => onSelect(t.title)}
                data-testid="tutorial-card"
                className="group bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col hover:border-brand-gold/20 transition-all duration-500 text-left cursor-pointer w-[280px] sm:w-[340px] shrink-0 select-none"
              >
                <div className="w-full aspect-[16/10] rounded-xl border border-white/5 group-hover:border-brand-gold/10 transition-all overflow-hidden relative mb-4">
                  {/* Preview gradient background */}
                  <div className={`absolute inset-0 ${getTutorialPreviewGradient(t.title)}`} />
                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />

                  {/* Mini phone mockup with tutorial preview */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Phone frame mini */}
                      <div className="w-20 h-32 sm:w-24 sm:h-36 rounded-2xl bg-[#0d211a]/90 border border-brand-gold/20 shadow-2xl overflow-hidden flex flex-col">
                        {/* Top bar */}
                        <div className="h-4 bg-[#0a180e] flex items-center justify-center">
                          <div className="w-6 h-1.5 bg-white/10 rounded-full" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-1 flex flex-col gap-0.5">
                          {getTutorialPreviewContent(t.title).map((item, idx) => (
                            <div key={idx} className={`w-full h-full rounded ${item} flex items-center justify-center`}>
                              <div className="w-3 h-3 rounded-sm bg-white/10" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-500 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-brand-gold/20 backdrop-blur-sm border border-brand-gold/40 flex items-center justify-center group-hover:bg-brand-gold/40 group-hover:border-brand-gold/60 group-hover:scale-110 transition-all duration-500 shadow-lg">
                      <Play className="w-5 h-5 text-brand-gold group-hover:text-slate-950 ml-0.5" />
                    </div>
                  </div>

                  {/* Step count badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                    <span className="text-[10px] font-bold text-white/70">{getTutorialStepCount(t.title)} pasos</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1">{t.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={() => go('next')}
          disabled={index >= total - visible}
          className="hidden sm:flex shrink-0 ml-2 p-2 rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-10"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mx-auto mt-6">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((index + visible) / total) * 100}%` }}
          />
        </div>
        <p className="text-center text-xs text-text-secondary/60 mt-2 tracking-wide">
          {Math.floor(index / visible) + 1} / {Math.ceil(total / visible)}
        </p>
      </div>
    </div>
  )
}

function getTutorialPreviewGradient(title: string): string {
  const gradients: Record<string, string> = {
    'Cómo instalar la app': 'bg-gradient-to-br from-blue-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo registrarte': 'bg-gradient-to-br from-emerald-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo iniciar sesión': 'bg-gradient-to-br from-violet-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo cargar saldo': 'bg-gradient-to-br from-amber-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo retirar saldo': 'bg-gradient-to-br from-red-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo transferir saldo': 'bg-gradient-to-br from-cyan-900/60 via-slate-800/80 to-slate-900/60',
    'Cómo jugar tu primera partida': 'bg-gradient-to-br from-green-900/60 via-slate-800/80 to-slate-900/60',
    'Funciones del menú de mesa': 'bg-gradient-to-br from-yellow-900/60 via-slate-800/80 to-slate-900/60',
    'Amigos': 'bg-gradient-to-br from-pink-900/60 via-slate-800/80 to-slate-900/60',
  }
  return gradients[title] || 'bg-gradient-to-br from-slate-800/60 via-slate-800/80 to-slate-900/60'
}

function getTutorialPreviewContent(title: string): string[] {
  const contents: Record<string, string[]> = {
    'Cómo instalar la app': ['bg-blue-500/20', 'bg-blue-500/30', 'bg-blue-500/20'],
    'Cómo registrarte': ['bg-emerald-500/20', 'bg-emerald-500/30', 'bg-emerald-500/20'],
    'Cómo iniciar sesión': ['bg-violet-500/20', 'bg-violet-500/30', 'bg-violet-500/20'],
    'Cómo cargar saldo': ['bg-amber-500/20', 'bg-amber-500/30', 'bg-amber-500/20'],
    'Cómo retirar saldo': ['bg-red-500/20', 'bg-red-500/30', 'bg-red-500/20'],
    'Cómo transferir saldo': ['bg-cyan-500/20', 'bg-cyan-500/30', 'bg-cyan-500/20'],
    'Cómo jugar tu primera partida': ['bg-green-500/20', 'bg-green-500/30', 'bg-green-500/20'],
    'Funciones del menú de mesa': ['bg-yellow-500/20', 'bg-yellow-500/30', 'bg-yellow-500/20'],
    'Amigos': ['bg-pink-500/20', 'bg-pink-500/30', 'bg-pink-500/20'],
  }
  return contents[title] || ['bg-slate-500/20', 'bg-slate-500/30', 'bg-slate-500/20']
}

function getTutorialStepCount(title: string): number {
  const counts: Record<string, number> = {
    'Cómo instalar la app': 4,
    'Cómo registrarte': 4,
    'Cómo iniciar sesión': 3,
    'Cómo cargar saldo': 4,
    'Cómo retirar saldo': 3,
    'Cómo transferir saldo': 3,
    'Cómo jugar tu primera partida': 4,
    'Funciones del menú de mesa': 4,
    'Amigos': 4,
  }
  return counts[title] || 3
}

/* ── Component ──────────────────────────────────────────────────── */

function LazyLocationMap() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {visible ? (
        <LocationMap />
      ) : (
        <div
          className="w-full rounded-2xl overflow-hidden border border-brand-gold/20 bg-surface-poker flex items-center justify-center"
          style={{ height: '380px' }}
          role="region"
          aria-label="Mapa de ubicación (cargando)"
        >
          <span className="text-text-secondary text-sm">Cargando mapa…</span>
        </div>
      )}
    </div>
  )
}

export function LandingContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [photoTouchStart, setPhotoTouchStart] = useState<number | null>(null)
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null)
  const [tutorialSteps, setTutorialSteps] = useState<{ label: string; screen: React.ReactNode; landscape?: boolean }[] | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlBackground = html.style.backgroundColor
    const previousBodyBackground = body.style.backgroundColor

    html.style.backgroundColor = '#0a180e'
    body.style.backgroundColor = '#0a180e'

    return () => {
      html.style.backgroundColor = previousHtmlBackground
      body.style.backgroundColor = previousBodyBackground
    }
  }, [])

  const handleTutorialSelect = useCallback((title: string) => {
    setActiveTutorial(title)
    const loader = TUTORIAL_IMPORTS[title as keyof typeof TUTORIAL_IMPORTS]
    if (loader) {
      loader().then((steps) => setTutorialSteps(steps))
    }
  }, [])

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

  const handlePhotoTouchStart = useCallback((e: React.TouchEvent) => {
    setPhotoTouchStart(e.touches[0].clientX)
  }, [])

  const handlePhotoTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (photoTouchStart === null) return
      const delta = e.changedTouches[0].clientX - photoTouchStart
      const threshold = 50
      if (Math.abs(delta) > threshold) {
        if (delta > 0) prevSlide()
        else nextSlide()
      }
      setPhotoTouchStart(null)
    },
    [photoTouchStart, nextSlide, prevSlide],
  )

  useEffect(() => {
    if (carouselPaused) return
    const id = setInterval(nextSlide, 4500)
    return () => clearInterval(id)
}, [carouselPaused, nextSlide])

  useEffect(() => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.transform = `translateX(-${currentSlide * 100}%)`
    }
  }, [currentSlide])

  /* ── GSAP Animations ────────────────────────────── */
  useGSAP(
    () => {
      if (!containerRef.current) return

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      heroTl
        .from('[data-hero-title]', { y: 80, opacity: 0, duration: 1.2 })
        .from('[data-hero-subtitle]', { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('[data-hero-cta]', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('[data-hero-hint]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')

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
    <div className="relative min-h-screen bg-[#0a180e] text-text-premium font-sans selection:bg-brand-gold/30 overflow-x-clip">
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
            ? 'bg-[#0a180e]/80 backdrop-blur-xl border-b border-brand-gold/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
          <button
            onClick={() => scrollTo('inicio')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Primera Riverada los 4 Ases"
          >
            <Image
              src="/brand/logo-transparent.svg"
              alt="Logo"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
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
          <div className="bg-[#0a180e]/95 backdrop-blur-xl border-t border-white/5">
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

      <main id="contenido-principal">
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
                className={`absolute text-[#e2b0440d] font-serif select-none will-change-transform ${FLOAT_CLASSES[i]}`}
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

            <div data-hero-cta="" className="mt-10 md:mt-12 flex flex-wrap justify-center gap-3 md:gap-4">
              <Link
                href="/register/player"
                className="group px-8 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold text-base md:text-lg shadow-[0_4px_24px_rgba(226,176,68,0.35)] hover:shadow-[0_8px_40px_rgba(226,176,68,0.5)] hover:scale-[1.03] transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                Crear cuenta gratis
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login/player"
                className="px-8 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 border-brand-gold/30 text-brand-gold font-bold text-base md:text-lg hover:bg-brand-gold/10 hover:border-brand-gold/50 transition-all duration-300 active:scale-95"
              >
                Iniciar sesión
              </Link>
            </div>

            <div className="mt-8 md:mt-10 mb-12 md:mb-20 flex justify-center px-6">
              <button
                data-hero-hint=""
                onClick={() => document.getElementById('instalar-app')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex items-center gap-4 md:gap-5 w-full max-w-sm border-t border-white/10 pt-5 md:pt-6 cursor-pointer"
              >
                <Smartphone className="w-7 h-7 md:w-8 md:h-8 text-brand-gold shrink-0" strokeWidth={1.5} />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm md:text-base font-semibold text-text-premium group-hover:text-brand-gold transition-colors duration-300">
                    Disponible como app.
                  </p>
                  <p className="text-xs md:text-sm text-text-secondary mt-0.5">
                    Ver tutorial de instalación para navegador
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-text-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all duration-300 shrink-0" />
              </button>
            </div>
          </div>

        </section>

        {/* ── Gold Divider ── */}
        <div data-divider="" className="flex items-center justify-center gap-3 py-4">
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-[#e2b0444d]" />
          <span className="text-[#e2b04440] text-lg">⚔</span>
          <span className="text-[#e2b04440] text-lg">🏆</span>
          <span className="text-[#e2b04440] text-lg">⬤</span>
          <span className="text-[#e2b04440] text-lg">⚜</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-[#e2b0444d]" />
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
              <span className="text-[#e2b04499] text-2xl">⚔</span>
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
                  <strong className="text-text-premium"> Primera</strong> y dominó. Conocido también como
                  <strong className="text-text-premium"> Primera Riverada Dario</strong> o la mesa de Primera de Neiva,
                  con años de experiencia reuniendo jugadores, ahora también ofrecemos
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
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-[#e2b0444d]" />
          <span className="text-[#e2b04440] text-lg">⬤</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-[#e2b0444d]" />
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
              onTouchStart={handlePhotoTouchStart}
              onTouchEnd={handlePhotoTouchEnd}
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

              {/* Arrows — desktop only */}
              <button
                onClick={prevSlide}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all hidden md:flex"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-brand-gold hover:border-brand-gold/30 transition-all hidden md:flex"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Ir a slide ${i + 1}`}
                  className="w-11 h-11 flex items-center justify-center rounded-full"
                >
                  <span
                    className={`block h-2.5 rounded-full transition-transform duration-300 ease-out origin-center w-8 ${
                      currentSlide === i
                        ? 'bg-brand-gold scale-x-100'
                        : 'bg-white/20 hover:bg-white/40 scale-x-[0.3125]'
                    }`}
                  />
                </button>
              ))}
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
                className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-linear-to-r from-[#e2b0444d] via-[#e2b04480] to-[#e2b0444d] z-0"
              />

              {STEPS.map((item) => (
                <div key={item.step} data-step="" className="text-center relative">
                  <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-[#0a1a12] border-2 border-brand-gold/30 flex items-center justify-center shadow-[0_0_20px_rgba(226,176,68,0.15)]">
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

            <p
              data-reveal=""
              className="mt-12 text-center text-text-secondary text-sm md:text-base"
            >
              Antes de jugar, revisa nuestras{' '}
              <Link href="/rules" className="text-brand-gold hover:text-brand-gold-light underline underline-offset-4">
                reglas oficiales
              </Link>{' '}
              y la{' '}
              <Link href="/security-policy" className="text-brand-gold hover:text-brand-gold-light underline underline-offset-4">
                política de seguridad
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── Gold Divider ── */}
        <div data-divider="" className="flex items-center justify-center gap-3 py-4">
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-[#e2b0444d]" />
          <span className="text-[#e2b04440] text-lg">⚜</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-[#e2b0444d]" />
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
              Tutoriales interactivos para que aprendas a usar todas las funciones.
            </p>

            {/* ── Tutorial Modal Overlay ─────────────────────────── */}
            {activeTutorial && tutorialSteps && (
              <div
                className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 py-8 overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setActiveTutorial(null)
                    setTutorialSteps(null)
                  }
                }}
              >
                <div className="relative w-full max-w-3xl flex flex-col items-center">
                  <TutorialWalkthrough
                    key={activeTutorial}
                    steps={tutorialSteps}
                    className="w-full"
                    onClose={() => {
                      setActiveTutorial(null)
                      setTutorialSteps(null)
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Tutorial Cards Carousel ─────────────────────────── */}
            <TutorialCarousel
              tutorials={TUTORIALS}
              onSelect={handleTutorialSelect}
            />
          </div>
        </section>

        {/* ═══ FAQ ════════════════════════════════ */}
        <section id="faq" className="px-6 py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <h2
              data-reveal-right=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-4"
            >
              Preguntas{' '}
              <span className="text-brand-gold">frecuentes</span>
            </h2>
            <p
              data-reveal=""
              className="text-center text-text-secondary mb-12 max-w-2xl mx-auto text-lg"
            >
              Respuestas rápidas para jugadores que buscan un buen sitio para tomar bebidas y jugar Primera en Neiva.
            </p>

            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <article
                  key={item.q}
                  data-stagger-card=""
                  className="bg-white/3 border border-white/8 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-text-premium">{item.q}</h3>
                  <p className="mt-2 text-text-secondary leading-relaxed">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gold Divider ── */}
        <div data-divider="" className="flex items-center justify-center gap-3 py-4">
          <div className="h-px w-16 md:w-24 bg-linear-to-r from-transparent to-[#e2b0444d]" />
          <span className="text-[#e2b04440] text-lg">⚔</span>
          <span className="text-[#e2b04440] text-lg">🏆</span>
          <span className="text-[#e2b04440] text-lg">⚜</span>
          <div className="h-px w-16 md:w-24 bg-linear-to-l from-transparent to-[#e2b0444d]" />
        </div>

        {/* ═══ Ubicación ═══════════════════════════ */}
        <section id="ubicacion" className="px-6 py-20 md:py-28 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <h2
              data-reveal-right=""
              className="text-3xl md:text-5xl font-display font-bold text-center mb-4"
            >
              Cómo{' '}
              <span className="text-brand-gold">llegarnos</span>
            </h2>
            <p
              data-reveal=""
              className="text-center text-text-secondary mb-4 max-w-2xl mx-auto text-lg"
            >
              Visítanos en nuestro establecimiento en Neiva, Huila.
            </p>
            <p
              data-reveal=""
              className="flex items-center justify-center gap-2 text-text-secondary mb-10 text-sm"
            >
              <MapPin className="w-4 h-4 text-brand-gold shrink-0" />
              {LOCAL_LOCATION.address}
            </p>

            {/* Mapa interactivo */}
            <div data-reveal="" className="mb-8">
              <LazyLocationMap />
            </div>

            {/* Botones Google Maps */}
            <div
              data-reveal=""
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <a
                href="https://maps.google.com/maps?q=2.9268522,-75.2866714"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl border border-brand-gold/30 text-brand-gold font-bold hover:bg-brand-gold/10 hover:border-brand-gold/50 transition-all duration-300 active:scale-95"
              >
                <MapPin className="w-4 h-4" />
                Ver en Google Maps
              </a>
              <a
                href="https://maps.google.com/maps/dir/?api=1&destination=2.9268522,-75.2866714"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-linear-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold shadow-[0_4px_24px_rgba(226,176,68,0.25)] hover:shadow-[0_8px_40px_rgba(226,176,68,0.4)] hover:scale-[1.03] transition-all duration-300 active:scale-95"
              >
                <Navigation className="w-4 h-4" />
                Cómo llegar
              </a>
            </div>
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

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Enlaces del sitio">
              <Link
                href="/login/player"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors whitespace-nowrap"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register/player"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors whitespace-nowrap"
              >
                Crear cuenta
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors whitespace-nowrap"
              >
                Política de privacidad
              </Link>
              <Link
                href="/terms"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors whitespace-nowrap"
              >
                Términos y condiciones
              </Link>
            </nav>

            <ul className="flex gap-3 list-none p-0 m-0" aria-label="Redes sociales">
              <li className="list-none p-0 m-0">
                <a
                  href={SOCIAL.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de Primera Riverada los 4 Ases"
                  className="inline-flex p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </li>
              <li className="list-none p-0 m-0">
                <a
                  href={SOCIAL.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de Primera Riverada los 4 Ases"
                  className="inline-flex p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
              </li>
              <li className="list-none p-0 m-0">
                <a
                  href={`mailto:${SOCIAL.email}`}
                  aria-label="Correo electrónico de contacto"
                  className="inline-flex p-2.5 rounded-xl bg-white/3 border border-white/8 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </li>
            </ul>
          </div>

          <p className="text-center text-text-secondary/50 text-xs mt-10">
            © {new Date().getFullYear()} Primera Riverada los 4 Ases. Todos los
            derechos reservados.
          </p>

          <p className="sr-only">
            Primera Riverada los 4 Ases — club de cartas y tomadero en Neiva, Huila.
            También conocido como Primera Riverada Dario, mesa de juego Dario,
            Los 4 Ases Neiva, juego de cartas Primera online. Juega Primera Riverada
            en tiempo real desde cualquier lugar.
          </p>
        </footer>
      </div>
    </main>
  </div>
  )
}
