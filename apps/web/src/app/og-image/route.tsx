import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const revalidate = 86400

const size = {
  width: 1200,
  height: 630,
}

function AceCard({ suit, color, rotate, x, y }: { suit: string; color: string; rotate: number; x: number; y: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 132,
        height: 188,
        borderRadius: 18,
        background: 'linear-gradient(155deg, #fffaf0 0%, #f8e9bd 100%)',
        border: '2px solid rgba(226, 176, 68, 0.72)',
        color,
        transform: `rotate(${rotate}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
      }}
    >
      <div style={{ position: 'absolute', top: 14, left: 16, fontSize: 28, fontWeight: 900 }}>A</div>
      <div style={{ fontSize: 72, lineHeight: 1 }}>{suit}</div>
      <div style={{ position: 'absolute', right: 16, bottom: 12, fontSize: 28, fontWeight: 900, transform: 'rotate(180deg)' }}>A</div>
    </div>
  )
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
          background: '#07150f',
          color: '#f3edd7',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 14%, rgba(226, 176, 68, 0.30), transparent 28%), radial-gradient(circle at 88% 18%, rgba(46, 204, 113, 0.22), transparent 26%), linear-gradient(135deg, #07150f 0%, #0a2a1f 46%, #020403 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 34,
            borderRadius: 42,
            border: '2px solid rgba(226, 176, 68, 0.56)',
            background: 'linear-gradient(145deg, rgba(10, 42, 31, 0.78), rgba(8, 8, 8, 0.46))',
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

        <AceCard suit="♠" color="#111827" rotate={-14} x={730} y={188} />
        <AceCard suit="♥" color="#b91c1c" rotate={-4} x={828} y={150} />
        <AceCard suit="♣" color="#111827" rotate={8} x={930} y={188} />
        <AceCard suit="♦" color="#b91c1c" rotate={18} x={1020} y={244} />

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 82,
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

        <div
          style={{
            position: 'absolute',
            left: 84,
            top: 154,
            width: 690,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 74, lineHeight: 0.96, fontWeight: 900, letterSpacing: -2 }}>
            Primera Riverada
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.04, fontWeight: 900, color: '#e2b044', marginTop: 4 }}>
            los 4 Ases
          </div>
          <div style={{ width: 560, height: 1, background: 'rgba(226, 176, 68, 0.48)', marginTop: 28 }} />
          <div style={{ fontSize: 31, lineHeight: 1.28, color: '#f3edd7', marginTop: 26 }}>
            Club de cartas Primera, dominó y entretenimiento en Neiva. Juega online en tiempo real o ven con tus amigos.
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
              color: '#07150f',
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
