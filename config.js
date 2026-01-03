// Game configuration
export const CONFIG = {
  // Groq API Configuration
  GROQ_API_KEY: '', // Get from https://console.groq.com
  GROQ_MODEL: 'mixtral-8x7b-32768',

  // Game Settings
  INITIAL_SANITY: 100,
  INITIAL_BATTERY: 100,
  BATTERY_DRAIN_RATE: 1.5,
  SANITY_DRAIN_RATE: 3,
  SPRINT_MULTIPLIER: 1.8,
  BASE_SPEED: 5,
  INTERACTION_DISTANCE: 3,

  // Keys to collect
  KEYS_REQUIRED: 5,

  // Monster Settings
  MONSTER_SPEED: 0.6,
  MONSTER_DETECTION_RANGE: 12,
  MONSTER_KILL_RANGE: 1.5,

  // Audio volumes
  AMBIENT_VOLUME: 0.3,
  SFX_VOLUME: 0.5,
  MUSIC_VOLUME: 0.2,

  // Textures
  USE_TEXTURES: true,

  // AI Features
  AI_ENABLED: true,
  AI_NARRATION: true,
  AI_ADAPTIVE_DIFFICULTY: true
};
