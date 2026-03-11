export const SOUND_ASSETS = {
  deal: '/sounds/deal.mp3',
  bet: '/sounds/bet.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  action: '/sounds/action.mp3',
  notification: '/sounds/notification.mp3',
};

export type SoundEffect = keyof typeof SOUND_ASSETS;

/**
 * Plays a sound effect from the CDN/public directory.
 * Will catch errors gracefully if the user hasn't interacted with the document yet.
 */
export function playSound(name: SoundEffect) {
  try {
    const audio = new Audio(SOUND_ASSETS[name]);
    
    // Low volume for non-intrusive experience
    audio.volume = 0.5;
    
    audio.play().catch(e => {
      // Browsers often block autoplay if the user hasn't interacted with the DOM
      console.warn(`Audio play failed for ${name}:`, e);
    });
  } catch (e) {
    console.error(`Failed to play sound ${name}`, e);
  }
}
