import { CONFIG } from './config.js';

export class AIManager {
  constructor() {
    this.apiKey = CONFIG.GROQ_API_KEY;
    this.model = CONFIG.GROQ_MODEL;
    this.lastNarration = Date.now();
    this.narrationCooldown = 15000;
  }

  async generateNarration(gameState, event) {
    if (!CONFIG.AI_ENABLED || !CONFIG.AI_NARRATION) return null;
    if (event !== 'intro' && event !== 'treasure_found' && Date.now() - this.lastNarration < this.narrationCooldown) return null;

    try {
      const prompt = this.buildNarrationPrompt(gameState, event);
      const response = await this.callGroqAPI(prompt);
      this.lastNarration = Date.now();
      return response;
    } catch (error) {
      console.error('AI Narration error:', error);
      return this.getFallbackResponse(event);
    }
  }

  async getDynamicHint(gameState, playerPos) {
    if (!CONFIG.AI_ENABLED) return this.getFallbackHint(gameState, playerPos);

    try {
      // Find nearest structure
      let nearest = null;
      let minDist = Infinity;

      if (gameState.structures) {
        gameState.structures.forEach(struct => {
          const dist = Math.hypot(struct.x - playerPos.x, struct.z - playerPos.z);
          if (dist < minDist) {
            minDist = dist;
            nearest = struct;
          }
        });
      }

      let locationContext = nearest
        ? `The player is near ${nearest.name} (${Math.floor(minDist)}m away).`
        : "The player is lost in the deep caves.";

      const prompt = `You are a guide in a subterranean world. ${locationContext} The player has found ${gameState.treasuresCollected}/${gameState.treasuresRequired} crystals. Give them a specific direction or hint (max 15 words).`;
      return await this.callGroqAPI(prompt);
    } catch (error) {
      return this.getFallbackHint(gameState, playerPos);
    }
  }

  getFallbackHint(gameState, playerPos) {
    // Basic logic if AI fails
    let nearest = null;
    let minDist = Infinity;

    if (gameState.structures) {
      gameState.structures.forEach(struct => {
        const dist = Math.hypot(struct.x - playerPos.x, struct.z - playerPos.z);
        if (dist < minDist) {
          minDist = dist;
          nearest = struct;
        }
      });
    }

    if (nearest) {
      return `Seek the ${nearest.name}. It is close.`;
    }
    return "Look for the ancient stone structures.";
  }

  buildNarrationPrompt(gameState, event) {
    let context = `You are the narrator of a Journey to the Center of the Earth. The player is exploring a bioluminescent cave system. Current progress: ${gameState.treasuresCollected}/${gameState.treasuresRequired} crystals found.`;
    switch (event) {
      case 'intro': context += ' The player has just descended. Describe the glowing fungi and ancient silence.'; break;
      case 'treasure_found': context += ' The player found a glowing crystal. Describe its power.'; break;
      default: context += ' Generate atmospheric subterranean narration.';
    }
    context += ' Respond with ONE short sentence (max 15 words). Be mysterious.';
    return context;
  }

  async callGroqAPI(prompt) {
    if (this.apiKey === 'YOUR_GROQ_API_KEY_HERE' || !this.apiKey) return this.getFallbackResponse('general');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: 'You are a sci-fi/fantasy narrator. Be vivid and brief.' }, { role: 'user', content: prompt }],
        temperature: 0.7, max_tokens: 60
      })
    });
    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  getFallbackResponse(type) {
    const fallbacks = {
      intro: ["The earth hums with a strange, glowing life.", "Welcome to the depths.", "Giant fungi tower above you."],
      treasure_found: ["The crystal vibrates in your hand.", "A piece of the earth's heart.", "It glows with an inner fire."],
      general: ["Shadows dance on the cavern walls.", "You hear the drip of ancient water."]
    };
    return (fallbacks[type] || fallbacks['general'])[0];
  }
}
