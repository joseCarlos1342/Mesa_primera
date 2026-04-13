import fs from 'fs'
import path from 'path'

describe('auth layout regressions', () => {
  it('complete profile page allows long Google emails to wrap inside the card', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../register/player/complete/page.tsx'),
      'utf-8',
    )

    expect(source).toMatch(/min-w-0/)
    expect(source).toMatch(/break-all|break-words/)
  })

  it('player login divider keeps the separator text without the black capsule background', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../login/player/page.tsx'),
      'utf-8',
    )

    expect(source).toMatch(/>o<|\{'o'\}/)
    expect(source).not.toMatch(/bg-black\/60/)
    expect(source).not.toMatch(/rounded-full text-xs font-bold text-white\/30 uppercase tracking-widest">o<\/span>/)
  })
})