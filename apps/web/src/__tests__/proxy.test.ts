/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'

import { buildContentSecurityPolicy } from '@/lib/security/csp'
import { updateSession } from '@/utils/supabase/middleware'
import { proxy } from '../proxy'

jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: jest.fn(),
}))

jest.mock('@/lib/security/csp', () => ({
  buildContentSecurityPolicy: jest.fn(() => "default-src 'self'"),
}))

const mockUpdateSession = updateSession as jest.MockedFunction<typeof updateSession>
const mockBuildContentSecurityPolicy = buildContentSecurityPolicy as jest.MockedFunction<
  typeof buildContentSecurityPolicy
>

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateSession.mockResolvedValue(NextResponse.next())
  })

  it('redirects GET requests from redirect hosts while preserving path and query', async () => {
    const request = new NextRequest('http://www.primerariveradalos4ases.com/mesa/7?tab=chat')

    const response = await proxy(request)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://primerariveradalos4ases.com/mesa/7?tab=chat',
    )
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
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
    expect(requestHeaders?.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('adds the same generated nonce to request headers and the CSP builder', async () => {
    const request = new NextRequest('https://primerariveradalos4ases.com/dashboard')

    await proxy(request)

    const requestHeaders = mockUpdateSession.mock.calls[0]?.[1]
    const nonce = requestHeaders?.get('x-nonce')

    expect(nonce).toEqual(expect.any(String))
    expect(mockBuildContentSecurityPolicy).toHaveBeenCalledWith({
      nonce,
      isDevelopment: false,
    })
  })

  it('applies CSP to a response returned by session middleware', async () => {
    const sessionResponse = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    mockUpdateSession.mockResolvedValueOnce(sessionResponse)

    const response = await proxy(
      new NextRequest('https://primerariveradalos4ases.com/private'),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })
})
