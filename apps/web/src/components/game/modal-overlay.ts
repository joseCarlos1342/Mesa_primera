export function getGameModalOverlayClassName() {
  return [
    'fixed inset-0 z-1000 flex items-center justify-center overflow-hidden',
    'p-0 sm:p-4',
    'bg-black/80 supports-backdrop-filter:bg-black/60 backdrop-blur-sm',
  ].join(' ')
}