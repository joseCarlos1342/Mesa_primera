import {
  getTutorialDefinition,
  TUTORIAL_CATALOG,
  type TutorialKey,
} from '../tutorialCatalog'

describe('catálogo de tutoriales', () => {
  it('mantiene claves únicas y metadatos completos', () => {
    const keys = TUTORIAL_CATALOG.map((tutorial) => tutorial.key)

    expect(new Set(keys).size).toBe(keys.length)
    expect(TUTORIAL_CATALOG).toHaveLength(9)
    expect(TUTORIAL_CATALOG.every((tutorial) => tutorial.stepCount > 0)).toBe(true)
    expect(TUTORIAL_CATALOG.every((tutorial) => tutorial.preview.action.length > 0)).toBe(true)
  })

  it('mantiene el conteo de la tarjeta sincronizado con sus pasos reales', async () => {
    const loadedTutorials = await Promise.all(
      TUTORIAL_CATALOG.map(async (tutorial) => ({
        tutorial,
        steps: await tutorial.loader(),
      })),
    )

    for (const { tutorial, steps } of loadedTutorials) {
      expect(tutorial.stepCount).toBe(steps.length)
    }
  })

  it('resuelve un tutorial por clave y rechaza claves desconocidas', () => {
    expect(getTutorialDefinition('register').title).toBe('Cómo registrarte')
    expect(() => getTutorialDefinition('missing' as TutorialKey)).toThrow(/tutorial desconocido/i)
  })
})
