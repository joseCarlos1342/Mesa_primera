import { render } from '@testing-library/react'
import { useCardPreloader } from '../useCardPreloader'

function CardPreloaderProbe() {
  useCardPreloader()
  return null
}

describe('useCardPreloader', () => {
  const originalImage = global.Image

  afterEach(() => {
    global.Image = originalImage
  })

  it('precarga cartas españolas y dorso solo una vez', () => {
    const loadedSources: string[] = []

    class MockImage {
      set src(value: string) {
        loadedSources.push(value)
      }
    }

    global.Image = MockImage as unknown as typeof Image

    const { unmount } = render(<CardPreloaderProbe />)

    expect(loadedSources).toHaveLength(29)
    expect(loadedSources).toContain('/cards/01-oros.png?v=3')
    expect(loadedSources).toContain('/cards/07-bastos.png?v=3')
    expect(loadedSources).toContain('/images/card-back-rooster.png')

    unmount()
    render(<CardPreloaderProbe />)

    expect(loadedSources).toHaveLength(29)
  })
})
