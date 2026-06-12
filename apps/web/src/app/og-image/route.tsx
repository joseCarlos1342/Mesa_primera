import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const revalidate = 86400

const size = {
  width: 1200,
  height: 630,
}

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          background: '#0a0a0a',
          color: '#f3edd7',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 14%, rgba(226, 176, 68, 0.20), transparent 28%), radial-gradient(circle at 88% 18%, rgba(197, 160, 89, 0.14), transparent 26%), linear-gradient(135deg, #0a0a0a 0%, #111111 46%, #050505 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 34,
            borderRadius: 42,
            border: '2px solid rgba(226, 176, 68, 0.56)',
            background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.85), rgba(8, 8, 8, 0.5))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 58,
            right: 58,
            top: 58,
            bottom: 58,
            borderRadius: 34,
            border: '1px solid rgba(240, 215, 140, 0.24)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 82,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: '#f0d78c',
              fontSize: 22,
              letterSpacing: 5,
              textTransform: 'uppercase',
              fontWeight: 800,
            }}
          >
            <span style={{ width: 54, height: 2, background: '#e2b044', display: 'flex' }} />
            Neiva, Huila
          </div>
          <div style={{ color: '#a0a0b0', fontSize: 18, marginLeft: 68, letterSpacing: 1 }}>
            Cra. 7 #06-87
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 170,
            width: 900,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 80, lineHeight: 0.96, fontWeight: 900, letterSpacing: -2 }}>
            Primera Riverada
          </div>
          <div style={{ fontSize: 64, lineHeight: 1.04, fontWeight: 900, color: '#e2b044', marginTop: 4 }}>
            los 4 Ases
          </div>
          <div style={{ width: 600, height: 1, background: 'rgba(226, 176, 68, 0.48)', marginTop: 28 }} />
          <div style={{ fontSize: 28, lineHeight: 1.3, color: '#f3edd7', marginTop: 24, width: 800 }}>
            Club de cartas Primera, dominó y entretenimiento. Juega online en tiempo real o ven con tus amigos.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 84,
            bottom: 72,
            display: 'flex',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '15px 22px',
              borderRadius: 999,
              background: '#e2b044',
              color: '#0a0a0a',
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            Juega online
          </div>
          <div style={{ fontSize: 24, color: '#f0d78c', fontWeight: 800 }}>primerariveradalos4ases.com</div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 84,
            bottom: 72,
            width: 118,
            height: 118,
            borderRadius: 999,
            border: '3px solid rgba(226, 176, 68, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e2b044',
            fontSize: 54,
            fontWeight: 900,
          }}
        >
          4A
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  )
}
