import fs from 'fs'
import path from 'path'

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')

describe('sistema tipográfico de Mesa Primera', () => {
  it('carga Alegreya, Source Sans 3 y Geist Mono desde next/font', () => {
    const source = readSource('../app/layout.tsx')

    expect(source).toMatch(/import\s*\{[^}]*Alegreya/)
    expect(source).toMatch(/Source_Sans_3/)
    expect(source).toMatch(/Geist_Mono/)
    expect(source).toMatch(/style:\s*\[['"]normal['"],\s*['"]italic['"]\]/)
  })

  it('expone aliases semánticos para marca, UI y datos', () => {
    const source = readSource('../app/layout.tsx')
    const globals = readSource('../app/globals.css')

    expect(source).toMatch(/variable:\s*["']--font-brand["']/)
    expect(source).toMatch(/variable:\s*["']--font-ui["']/)
    expect(source).toMatch(/variable:\s*["']--font-data["']/)
    expect(globals).toMatch(/--font-display:\s*var\(--font-brand\)/)
    expect(globals).toMatch(/--font-sans:\s*var\(--font-ui\)/)
    expect(globals).toMatch(/--font-mono:\s*var\(--font-data\)/)
  })

  it('mantiene los tokens de player y admin en una única fuente CSS', () => {
    const playerTheme = readSource('../app/(player)/player.css')
    const adminTheme = readSource('../app/(admin)/admin/admin.css')

    expect(playerTheme).toMatch(/@import\s+["']\.\.\/\.\.\/design\/player-theme\.css["']/)
    expect(adminTheme).toMatch(/@import\s+["']\.\.\/\.\.\/\.\.\/design\/admin-theme\.css["']/)
    expect(playerTheme).not.toMatch(/--font-headline-lg:/)
    expect(adminTheme).not.toMatch(/--font-headline-lg:/)
  })

  it('respeta la preferencia de movimiento reducido', () => {
    const globals = readSource('../app/globals.css')

    expect(globals).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(globals).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
  })
})

describe('mínimos tipográficos de interacción', () => {
  it('mantiene navegación player y acciones de mesa por encima de 10px', () => {
    const bottomNav = readSource('../components/navigation/BottomNav.tsx')
    const controls = readSource('../components/game/ActionControls.tsx')
    const badge = readSource('../components/game/PlayerBadge.tsx')

    expect(bottomNav).not.toMatch(/text-\[8px\]/)
    expect(controls).not.toMatch(/text-\[(?:[5-9]|10)px\]/)
    expect(badge).not.toMatch(/text-\[(?:[5-9]|10)px\]/)
  })

  it('permite desplazar acciones de mesa en pantallas estrechas', () => {
    const controls = readSource('../components/game/ActionControls.tsx')

    expect(controls).toMatch(/max-w-\[calc\(100vw-1rem\)\]/)
    expect(controls).toMatch(/overflow-x-auto/)
  })

  it('no usa microtexto funcional en mesa, estadísticas, wallet, perfil o chat', () => {
    const playerSurfaces = [
      '../components/game/Board.tsx',
      '../components/game/ChipSelector.tsx',
      '../components/game/Lobby.tsx',
      '../components/game/ManoIcon.tsx',
      '../components/game/TransferModal.tsx',
      '../components/game/ShowdownCinematic.tsx',
      '../components/game/ShuffleAnimation.tsx',
      '../components/game/CustomMesaModal.tsx',
      '../components/game/DepositForm.tsx',
      '../components/game/PermissionsGate.tsx',
      '../components/game/PiqueRevealOverlay.tsx',
      '../components/game/game-header.tsx',
      '../components/game/TableHelpModal.tsx',
      '../app/(player)/stats/_components/stats-dashboard.tsx',
      '../app/(player)/stats/_components/StatsTabs.tsx',
      '../app/(player)/wallet/history/HistoryList.tsx',
      '../app/(player)/profile/page.tsx',
      '../app/(player)/friends/page.tsx',
      '../app/(player)/friends/_components/FriendsList.tsx',
      '../app/(player)/friends/_components/DirectChat.tsx',
      '../app/(player)/friends/_components/AddFriendModal.tsx',
      '../app/(player)/wallet/withdraw/page.tsx',
      '../app/(player)/replays/page.tsx',
      '../app/(player)/replays/[gameId]/page.tsx',
      '../app/(player)/replays/mesa/[roomId]/page.tsx',
      '../app/(player)/stats/_components/StatsClient.tsx',
      '../app/(player)/stats/_components/Leaderboard.tsx',
      '../app/(player)/stats/_components/StatsShell.tsx',
      '../app/(player)/wallet/deposit/page.tsx',
      '../app/(player)/friends/_components/FriendRequests.tsx',
    ]

    for (const relativePath of playerSurfaces) {
      expect(readSource(relativePath)).not.toMatch(/text-\[(?:[4-9]|10)px\]/)
    }
  })

  it('mantiene legibles las ayudas de autenticación del jugador', () => {
    const playerAuthSurfaces = [
      '../app/(auth)/login/player/page.tsx',
      '../app/(auth)/login/player/verify/page.tsx',
      '../app/(auth)/login/player/device-verify/page.tsx',
      '../app/(auth)/register/player/page.tsx',
      '../app/(auth)/register/player/complete/page.tsx',
      '../app/(auth)/register/player/verify/page.tsx',
      '../app/(auth)/register/player/pin/page.tsx',
      '../app/(auth)/register/player/biometric/page.tsx',
      '../app/(auth)/recovery/page.tsx',
      '../app/(auth)/recovery/pin/page.tsx',
      '../app/(auth)/recovery/verify/page.tsx',
    ]

    for (const relativePath of playerAuthSurfaces) {
      expect(readSource(relativePath)).not.toMatch(/text-\[(?:[4-9]|10)px\]/)
    }
  })

  it('mantiene la mesa en el sistema display de Alegreya', () => {
    const gameRoute = readSource('../app/play/[id]/page.tsx')
    const demoRoute = readSource('../app/play/demo/table-preview.tsx')

    expect(gameRoute).not.toMatch(/text-\[(?:[4-9]|10)px\]/)
    expect(demoRoute).not.toMatch(/text-\[(?:[4-9]|10)px\]/)
    expect(readSource('../components/game/Board.tsx')).not.toMatch(/font-serif/)
    expect(readSource('../components/game/ShuffleAnimation.tsx')).not.toMatch(/font-serif/)
    expect(readSource('../components/game/GameAnnouncer.tsx')).not.toMatch(/font-serif/)
    expect(readSource('../components/game/Card.tsx')).not.toMatch(/font-playfair/)
  })
})
