const BASE_SHELL_CLASS_NAME = 'flex flex-col font-sans relative bg-[#073926]'

const GAMEPLAY_VIGNETTE_CLASS_NAME = [
  "before:content-['']",
  'before:absolute',
  'before:inset-0',
  'before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]',
  'before:from-transparent',
  'before:via-[rgba(0,0,0,0.1)]',
  'before:to-[rgba(0,0,0,0.5)]',
  'before:pointer-events-none',
].join(' ')

export function getPlayRoomShellClassName(phase: string) {
  const heightClassName = phase === 'LOBBY' ? 'min-h-screen' : 'h-screen overflow-hidden'

  if (phase === 'LOBBY') {
    return `${BASE_SHELL_CLASS_NAME} ${heightClassName}`
  }

  return `${BASE_SHELL_CLASS_NAME} ${GAMEPLAY_VIGNETTE_CLASS_NAME} ${heightClassName}`
}