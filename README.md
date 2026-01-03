# 🎮 The Forgotten Corridor - Enhanced Horror Game

An immersive 3D horror game with AI-powered narration, procedural audio, and complex level design.

## 🚀 Features

### Core Gameplay
- **Complex Multi-Corridor Level** - Multiple branching paths, rooms, and secrets
- **5 Keys to Collect** - Hidden throughout the facility
- **Smart Monster AI** - Patrol and chase behaviors
- **Sanity System** - Manage your mental state or lose
- **Battery Management** - Your flashlight won't last forever
- **Interactive Doors** - Some locked, some open

### Advanced Features
- **Groq AI Integration** - Dynamic narration and hints
- **Procedural Audio** - Real-time sound generation using Web Audio API
- **Textured Environment** - Procedurally generated textures
- **Atmospheric Lighting** - Flickering corridor lights
- **VR Support** - Full WebXR compatibility

### Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move forward/left/back/right |
| **Shift** | Sprint (drains stamina) |
| **C / Ctrl** | Crouch (move slower, quieter) |
| **F** | Toggle flashlight on/off |
| **H** | Request AI hint |
| **E** | Interact with doors |
| **Mouse** | Look around |
| **ESC** | Pause / Unlock mouse |

## 🔧 Setup

### 1. Get Groq API Key (Optional but Recommended)

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Generate an API key
4. Open `config.js` and replace `YOUR_GROQ_API_KEY_HERE` with your key

**Note:** The game works without an API key, but you'll get fallback narration instead of AI-generated content.

### 2. Run Local Server

The game must run on a local server (not just opening the HTML file).

**Option A: Python**
```bash
python -m http.server 8080
```

**Option B: Node.js**
```bash
npx http-server -p 8080
```

**Option C: VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 3. Open in Browser

Navigate to:
```
http://localhost:8080
```

## 📁 File Structure

```
cglabel/
├── index.html          # Entry point
├── game.js            # Main game logic
├── config.js          # Game configuration
├── ai.js              # Groq AI integration
├── audio.js           # Procedural audio system
├── level.js           # Level builder & textures
├── assets/
│   ├── sounds/        # (Optional) Add MP3 files
│   └── textures/      # (Optional) Add image textures
└── README.md          # This file
```

## 🎯 Gameplay Tips

1. **Manage Your Resources**
   - Turn off flashlight to save battery
   - Sprint only when necessary
   - Low sanity causes hallucinations

2. **Explore Carefully**
   - Keys are hidden in different areas
   - Some rooms are dead ends
   - Listen for monster growls

3. **Monster Avoidance**
   - Monsters patrol when inactive
   - They chase when they spot you
   - Crouching makes less noise

4. **Use AI Hints**
   - Press H when stuck
   - AI adapts to your progress
   - Hints cooldown after use

## 🛠️ Configuration

Edit `config.js` to customize:

```javascript
KEYS_REQUIRED: 5              // How many keys to collect
INITIAL_SANITY: 100          // Starting sanity
INITIAL_BATTERY: 100         // Starting battery
MONSTER_SPEED: 0.6           // How fast monsters move
MONSTER_DETECTION_RANGE: 12 // Detection distance
AI_ENABLED: true             // Use Groq AI
AI_NARRATION: true           // Dynamic narration
```

## 🎨 Adding Custom Assets

### Sounds
Place MP3 files in `assets/sounds/`:
- `collect.mp3` - Key collection
- `doorOpen.mp3` - Door opening
- `monsterGrowl.mp3` - Monster sounds
- `ambient.mp3` - Background ambience

### Textures  
Place image files in `assets/textures/`:
- `wall.jpg` - Wall texture
- `floor.jpg` - Floor texture
- `door.jpg` - Door texture

Update `level.js` to load them:
```javascript
const texture = this.textureLoader.load('assets/textures/wall.jpg');
```

## 🤖 AI Features

### Dynamic Narration
- Context-aware horror narration
- Responds to game events
- Creates atmospheric tension

### Adaptive Difficulty
- AI monitors player performance
- Adjusts monster behavior
- Provides helpful hints when struggling

### Intelligent Hints
- Context-specific guidance
- Never spoils solutions
- Cooldown prevents spam

## 🐛 Troubleshooting

**Black Screen?**
- Check browser console (F12)
- Ensure you're using a local server
- Try hard refresh (Ctrl+Shift+R)

**No AI Narration?**
- Check your API key in `config.js`
- Verify internet connection
- Fallback narration works without API

**Performance Issues?**
- Lower shadow quality in code
- Reduce number of lights
- Disable fog in scene setup

## 📊 Game Stats

Track your performance:
- **Time to Escape** - How fast can you beat it?
- **Deaths** - Number of failed attempts
- **Keys Found** - Collection progress
- **Doors Opened** - Exploration metric

## 🎮 VR Mode

1. Connect VR headset (Quest, Vive, etc.)
2. Click "Enter VR" button
3. Use controller to aim flashlight
4. Use thumbsticks to move

## 📝 Credits

Built with:
- **Three.js** - 3D rendering
- **Groq API** - AI narration
- **Web Audio API** - Procedural sound
- **WebXR** - VR support

## 📄 License

MIT License - Feel free to modify and extend!

## 🚧 Future Enhancements

Ideas for expansion:
- [ ] Save/load game state
- [ ] Multiple difficulty modes
- [ ] More monster types
- [ ] Puzzle mechanics
- [ ] Multiplayer co-op
- [ ] Custom level editor
- [ ] Achievement system
- [ ] Story mode with chapters

---

**Have fun exploring the darkness! 👻🔦**
