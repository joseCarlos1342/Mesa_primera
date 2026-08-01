/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'

import { updateSession } from '@/utils/supabase/middleware'
import { proxy } from '../proxy'

jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: jest.fn(),
}))

const mockUpdateSession = updateSession as jest.MockedFunction<typeof updateSession>
const originalNodeEnv = process.env.NODE_ENV

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'
    mockUpdateSession.mockResolvedValue(NextResponse.next())
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('redirects GET requests from redirect hosts while preserving path and query', async () => {
    const request = new NextRequest('http://www.primerariveradalos4ases.com/mesa/7?tab=chat')

    const response = await proxy(request)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://primerariveradalos4ases.com/mesa/7?tab=chat',
    )
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src")
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it('redirects HEAD requests from redirect hosts without invoking session middleware', async () => {
    const response = await proxy(
      new NextRequest('https://mesa-primera-web.vercel.app/health', { method: 'HEAD' }),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://primerariveradalos4ases.com/health',
    )
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it('passes POST requests from redirect hosts to the session middleware', async () => {
    const request = new NextRequest('https://www.primerariveradalos4ases.com/api/livekit', {
      method: 'POST',
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(mockUpdateSession).toHaveBeenCalledTimes(1)
    expect(mockUpdateSession.mock.calls[0]?.[0]).toBe(request)
    const requestHeaders = mockUpdateSession.mock.calls[0]?.[1]
    expect(requestHeaders?.get('x-nonce')).toEqual(expect.any(String))
    expect(requestHeaders?.get('Content-Security-Policy')).toContain("script-src")
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src")
  })

  it('adds the generated nonce to the request headers and resulting CSP', async () => {
    const request = new NextRequest('https://primerariveradalos4ases.com/dashboard')

    const response = await proxy(request)

    const requestHeaders = mockUpdateSession.mock.calls[0]?.[1]
    const nonce = requestHeaders?.get('x-nonce')

    expect(nonce).toEqual(expect.any(String))
    expect(response.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce}'`)
  })

  it('passes unknown hosts to session middleware instead of redirecting them', async () => {
    const request = new NextRequest('https://staging.example.test/private')

    await proxy(request)

    expect(mockUpdateSession).toHaveBeenCalledWith(request, expect.any(Headers))
  })

  it('includes development CSP directives when running in development', async () => {
    process.env.NODE_ENV = 'development'

    const response = await proxy(
      new NextRequest('http://localhost:3000/dashboard'),
    )

    expect(response.headers.get('Content-Security-Policy')).toContain("'unsafe-eval'")
  })

  it('applies CSP to a response returned by session middleware', async () => {
    const sessionResponse = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    mockUpdateSession.mockResolvedValueOnce(sessionResponse)

    const response = await proxy(
      new NextRequest('https://primerariveradalos4ases.com/private'),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src")
  })
})
