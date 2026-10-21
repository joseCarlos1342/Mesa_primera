'use client'

import { useEffect } from 'react'

/** Pinta `html` y `body` (el body global es azul `surface`) para que el rebote del scroll no rompa el mundo. */
export function DocumentBackground({ color }: { readonly color: string }) {
  useEffect(() => {
    const { documentElement: html, body } = document
    const previous = [html.style.backgroundColor, body.style.backgroundColor] as const
    html.style.backgroundColor = color
    body.style.backgroundColor = color
    return () => {
      html.style.backgroundColor = previous[0]
      body.style.backgroundColor = previous[1]
    }
  }, [color])

  return null
}
