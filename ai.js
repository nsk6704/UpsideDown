import { CONFIG } from './config.js';

export class AIManager {
  constructor() {
    this.apiKey = CONFIG.GROQ_API_KEY;
    this.model = CONFIG.GROQ_MODEL;
    this.conversationHistory = [];
    this.lastNarration = Date.now();
    this.narrationCooldown = 30000; // 30 seconds between narrations
  }

  async generateNarration(gameState, event) {
    if (!CONFIG.AI_ENABLED || !CONFIG.AI_NARRATION) return null;
    if (Date.now() - this.lastNarration < this.narrationCooldown) return null;
    
    try {
      const prompt = this.buildNarrationPrompt(gameState, event);
      const response = await this.callGroqAPI(prompt);
      this.lastNarration = Date.now();
      return response;
    } catch (error) {
      console.error('AI Narration error:', error);
      return null;
    }
  }

  async getDynamicHint(gameState) {
    if (!CONFIG.AI_ENABLED) return null;
    
    try {
      const prompt = `You are a horror game narrator. The player has collected ${gameState.keysCollected}/${CONFIG.KEYS_REQUIRED} keys, has ${gameState.sanity}% sanity, and ${gameState.flashlightBattery}% battery. Give them a cryptic, short hint (1 sentence, max 15 words) about what to do next.`;
      return await this.callGroqAPI(prompt);
    } catch (error) {
      console.error('AI Hint error:', error);
      return null;
    }
  }

  async adaptDifficulty(gameState) {
    if (!CONFIG.AI_ENABLED || !CONFIG.AI_ADAPTIVE_DIFFICULTY) return null;
    
    try {
      const prompt = `Based on this horror game state: Keys: ${gameState.keysCollected}/${CONFIG.KEYS_REQUIRED}, Sanity: ${gameState.sanity}%, Battery: ${gameState.flashlightBattery}%, Deaths: ${gameState.deaths || 0}. Should difficulty be: "easier", "same", or "harder"? Respond with just one word.`;
      const response = await this.callGroqAPI(prompt);
      return response.toLowerCase().trim();
    } catch (error) {
      console.error('AI Difficulty error:', error);
      return null;
    }
  }

  buildNarrationPrompt(gameState, event) {
    let context = `You are narrating a psychological horror game. Current state: Sanity ${gameState.sanity}%, Battery ${gameState.flashlightBattery}%, Keys ${gameState.keysCollected}/${CONFIG.KEYS_REQUIRED}.`;
    
    switch(event) {
      case 'key_collected':
        context += ' The player just collected a key.';
        break;
      case 'monster_spotted':
        context += ' The player encountered a monster.';
        break;
      case 'low_sanity':
        context += ' The player has low sanity.';
        break;
      case 'low_battery':
        context += ' The flashlight battery is dying.';
        break;
      case 'door_locked':
        context += ' The player found a locked door.';
        break;
      default:
        context += ' Generate atmospheric horror narration.';
    }
    
    context += ' Respond with ONE short sentence (max 12 words) of creepy narration. Be atmospheric and unsettling.';
    return context;
  }

  async callGroqAPI(prompt) {
    if (this.apiKey === 'YOUR_GROQ_API_KEY_HERE') {
      console.warn('Groq API key not set. Using fallback responses.');
      return this.getFallbackResponse(prompt);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a horror game narrator. Be brief, atmospheric, and unsettling.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  getFallbackResponse(prompt) {
    const fallbacks = {
      key: [
        "One step closer to freedom... or oblivion.",
        "The key feels unnaturally cold in your hand.",
        "You hear whispers as you grasp the key.",
        "Something watches from the shadows."
      ],
      monster: [
        "It knows you're here.",
        "Run. Don't look back.",
        "The darkness has eyes.",
        "Your heartbeat echoes in the void."
      ],
      sanity: [
        "Reality begins to fracture.",
        "Are those footsteps yours?",
        "The walls seem to breathe.",
        "You feel yourself slipping away."
      ],
      battery: [
        "The darkness hungers.",
        "Your light is dying.",
        "Soon, only shadows remain.",
        "The battery flickers with malice."
      ],
      hint: [
        "Seek the glowing keys.",
        "The exit lies in shadow.",
        "Trust nothing, question everything.",
        "Your only escape is forward."
      ]
    };
    
    const type = prompt.includes('key') ? 'key' :
                 prompt.includes('monster') ? 'monster' :
                 prompt.includes('sanity') ? 'sanity' :
                 prompt.includes('battery') ? 'battery' : 'hint';
    
    const options = fallbacks[type];
    return options[Math.floor(Math.random() * options.length)];
  }
}
