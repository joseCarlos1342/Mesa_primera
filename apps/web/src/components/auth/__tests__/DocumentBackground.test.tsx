import { render } from '@testing-library/react'
import { DocumentBackground } from '../DocumentBackground'

describe('DocumentBackground', () => {
  it('pinta html y body mientras está montado y restaura al desmontar', () => {
    document.body.style.backgroundColor = 'red'
    const { unmount } = render(<DocumentBackground color="#0a0a0a" />)

    expect(document.documentElement.style.backgroundColor).toBe('rgb(10, 10, 10)')
    expect(document.body.style.backgroundColor).toBe('rgb(10, 10, 10)')

    unmount()
    expect(document.body.style.backgroundColor).toBe('red')
    expect(document.documentElement.style.backgroundColor).toBe('')
    document.body.style.backgroundColor = ''
  })
})
