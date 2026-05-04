'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface LandingAnimationsProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function LandingAnimations({ containerRef }: LandingAnimationsProps) {
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

  return null
}