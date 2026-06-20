# Search Bharat - System Architecture Document

## 1. Overview

Search Bharat is a next-generation web browser designed to compete with Google Chrome through radical UI innovation, AI integration, and unique offline capabilities. This document defines the complete system architecture, from high-level process model to individual module specifications.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        NOVA SHELL (UI)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Tab Bar  │ │ Nav Bar  │ │ URL Bar  │ │Statusbar │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Content Area                        │          │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐    │          │
│  │  │New Tab  │ │Web View │ │  Game Center   │    │          │
│  │  │  Page   │ │(iframe) │ │  (Canvas/GPU)  │    │          │
│  │  └─────────┘ └─────────┘ └────────────────┘    │          │
│  └──────────────────────────────────────────────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Command  │ │   AI     │ │  Focus   │ │ Settings │          │
│  │ Palette  │ │Assistant │ │  Mode    │ │  Panel   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
    ┌────▼────┐   ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
    │   Tab   │   │  Theme   │  │ Security │  │  Voice   │
    │ Manager │   │  Engine  │  │  Module  │  │  Nav     │
    └─────────┘   └──────────┘  └──────────┘  └──────────┘
```

## 3. Multi-Process Architecture (Native Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER PROCESS (Main)                     │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ UI       │  │ IO       │  │ File     │  │ Database │    │
│  │ Thread   │  │ Thread   │  │ Thread   │  │ Thread   │    │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘    │
│       │              │                                        │
│       │    IPC (Mojo/Channels)                                │
│       │              │                                        │
└───────┼──────────────┼────────────────────────────────────────┘
        │              │
   ┌────▼────┐    ┌────▼────┐    ┌──────────┐    ┌──────────┐
   │Renderer │    │Renderer │    │   GPU    │    │ Network  │
   │Process 1│    │Process 2│    │ Process  │    │ Process  │
   │(Tab 1)  │    │(Tab 2)  │    │          │    │          │
   │         │    │         │    │ ┌──────┐ │    │ ┌──────┐ │
   │ ┌─────┐ │    │ ┌─────┐ │    │ │Comp- │ │    │ │URL   │ │
   │ │Blink│ │    │ │Blink│ │    │ │ositor│ │    │ │Loader│ │
   │ │(DOM)│ │    │ │(DOM)│ │    │ └──────┘ │    │ └──────┘ │
   │ └─────┘ │    │ └─────┘ │    │ ┌──────┐ │    │ ┌──────┐ │
   │ ┌─────┐ │    │ ┌─────┐ │    │ │Shader│ │    │ │DNS   │ │
   │ │V8   │ │    │ │V8   │ │    │ │Cache │ │    │ │Resol.│ │
   │ │(JS) │ │    │ │(JS) │ │    │ └──────┘ │    │ └──────┘ │
   │ └─────┘ │    │ └─────┘ │    └──────────┘    │ ┌──────┐ │
   │ ┌─────┐ │    │ ┌─────┐ │                    │ │Cache │ │
   │ │Skia │ │    │ │Skia │ │    ┌──────────┐    │ │Mgr.  │ │
   │ │(2D) │ │    │ │(2D) │ │    │Extension │    │ └──────┘ │
   │ └─────┘ │    │ └─────┘ │    │ Process  │    └──────────┘
   └─────────┘    └─────────┘    └──────────┘
```

## 4. Rendering Pipeline

```
HTML/CSS/JS Input
       │
       ▼
┌──────────────┐
│  Parse HTML  │ ──► DOM Tree
│  Parse CSS   │ ──► CSSOM Tree
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Style      │ DOM + CSSOM = Render Tree
│ Calculation  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Layout     │ Calculate geometry (position, size)
│  (Reflow)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Paint      │ Rasterize to pixels (layers)
│ (Rasterize)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Composite   │ GPU composites layers ──► Screen
│   (GPU)      │
└──────────────┘
```

## 5. Core Modules

### 5.1 Tab Manager
- **Responsibility**: Create, close, switch, suspend, reorder, and group tabs
- **Key Features**: 
  - Drag-and-drop reordering
  - Tab suspension (freezes inactive tabs after 5 min)
  - 3D visual tab overview
  - Tab groups with color coding
  - Pinned tabs support
- **File**: `js/tab-manager.js`

### 5.2 Theme Engine
- **Responsibility**: Dynamic theming based on time-of-day and user preference
- **Key Features**:
  - 6 curated themes (Midnight, Aurora, Sunset, Forest, Cosmos, Cyber)
  - AI-based time-adaptive switching
  - Smooth CSS variable transitions
  - LocalStorage persistence
- **File**: `js/theme-engine.js`

### 5.3 Command Palette
- **Responsibility**: VS Code-style command launcher for quick actions
- **Key Features**:
  - 25+ registered commands across 7 categories
  - Fuzzy search filtering
  - Keyboard navigation (↑↓ Enter Esc)
  - Shortcut display per command
  - Categories: Navigation, View, Tools, Settings, Themes, Privacy, Games
- **File**: `js/command-palette.js`

### 5.4 AI Assistant
- **Responsibility**: Integrated AI chat panel for browsing assistance
- **Key Features**:
  - Context-aware response generation
  - Suggestion chips for common actions
  - Typing indicator animation
  - Markdown-like content formatting
  - Quick actions (Summarize, Explain, Research)
  - Voice input support
- **File**: `js/ai-assistant.js`

### 5.5 Security Module
- **Responsibility**: Privacy protection and security enforcement
- **Key Features**:
  - Tracker blocker (simulated with real-time counter)
  - Ad blocker with live statistics
  - HTTPS enforcement / upgrades
  - AI-powered phishing detection
  - Privacy dashboard with toggle controls
- **File**: `js/security.js`

### 5.6 Voice Navigation
- **Responsibility**: Hands-free browsing via Web Speech API
- **Key Features**:
  - Voice command recognition
  - Natural language commands ("new tab", "open games", etc.)
  - AI assistant voice input mode
  - Visual feedback during listening
- **File**: `js/voice-nav.js`

### 5.7 Focus Mode
- **Responsibility**: Distraction-free reading experience
- **Key Features**:
  - Hides all browser chrome (tabs, navbar, status bar)
  - Navbar reappears on hover
  - One-key toggle (F11)
- **File**: `js/focus-mode.js`

### 5.8 Game Center
- **3 Offline Games**:
  1. **Anti-Gravity Runner** (`js/games/runner.js`)
     - Endless runner with gravity-flip mechanic
     - Space theme with asteroids, beams, powerups
     - Particle effects and explosions
     - Score persistence via LocalStorage
  2. **Bharat Puzzle** (`js/games/puzzle.js`)
     - Match-3 color puzzle with cascading combos
     - Level progression with targets
     - Smooth swap and drop animations
  3. **Space Strategy** (`js/games/strategy.js`)
     - Tower defense with 3 tower types
     - Wave-based enemy spawning
     - Resource management (credits)
     - Path-finding and targeting AI

## 6. Folder Structure

```
bharat-browser/
├── index.html                    # Main browser shell
├── ARCHITECTURE.md               # This document
│
├── css/
│   ├── core.css                  # Design system (tokens, reset, utilities)
│   ├── browser.css               # Browser chrome (titlebar, tabs, navbar, etc.)
│   ├── tabs.css                  # 3D tab management
│   ├── command-palette.css       # Command palette overlay
│   ├── ai-assistant.css          # AI chat panel
│   ├── games.css                 # Game center & game views
│   └── themes.css                # Dynamic themes & settings
│
├── js/
│   ├── app.js                    # Main application controller
│   ├── tab-manager.js            # Tab management engine
│   ├── theme-engine.js           # Dynamic theme engine
│   ├── command-palette.js        # Command palette logic
│   ├── ai-assistant.js           # AI assistant controller
│   ├── focus-mode.js             # Focus mode controller
│   ├── voice-nav.js              # Voice navigation
│   ├── security.js               # Security & privacy module
│   └── games/
│       ├── runner.js             # Anti-Gravity Runner
│       ├── puzzle.js             # Bharat Puzzle
│       └── strategy.js           # Space Strategy
│
└── (future)
    ├── src/core/                 # Native core (C++/Rust)
    ├── src/extensions/           # Extension system
    ├── platform/                 # Platform-specific code
    └── third_party/              # Chromium, V8, Skia
```

## 7. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Shell | HTML5 + CSS3 + JS | Browser chrome & UX |
| Design System | CSS Custom Properties | Tokens, themes, animations |
| Rendering | Canvas 2D API / WebGL | Games, visualizations |
| Speech | Web Speech API | Voice navigation |
| Storage | LocalStorage | Settings, scores, preferences |
| Fonts | Google Fonts (Inter, Outfit, JetBrains Mono) | Typography |
| **Future Native** | | |
| Core Engine | Chromium (Blink + V8) | Web rendering |
| Performance | Rust / C++ | Process management, IPC |
| GPU | Skia / WebGPU | 2D/3D compositing |
| Desktop App | Tauri / Electron | Cross-platform shell |
| Mobile | Flutter / React Native | Android/iOS |

## 8. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+K` | Command palette |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+J` | AI Assistant |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+1-9` | Switch to tab N |
| `F11` | Focus mode |
| `Esc` | Close overlays |

## 9. Security Architecture

```
┌─────────────────────────────────────────┐
│           SECURITY LAYER                 │
│                                          │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  Sandbox   │  │  Content Security  │ │
│  │ (per-tab)  │  │     Policy (CSP)   │ │
│  └────────────┘  └────────────────────┘ │
│                                          │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  Tracker   │  │   Ad Blocker       │ │
│  │  Blocker   │  │   (Filter Lists)   │ │
│  └────────────┘  └────────────────────┘ │
│                                          │
│  ┌────────────┐  ┌────────────────────┐ │
│  │   HTTPS    │  │    Phishing        │ │
│  │  Enforcer  │  │    Detector (AI)   │ │
│  └────────────┘  └────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Incognito Mode                  │   │
│  │  (Zero data retention)          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 10. Performance Strategy

| Optimization | Implementation |
|-------------|---------------|
| Fast Startup | Lazy-load modules, precompile shaders |
| Tab Suspension | Freeze JS + release memory for idle tabs |
| GPU Acceleration | Hardware-accelerated compositing for all layers |
| Smart Caching | Service workers + predictive preloading |
| Memory Management | Per-process isolation, aggressive garbage collection |
| Code Splitting | Load games/AI only when needed |

## 11. MVP Roadmap

### Phase 1: Prototype ✅ (Complete)
- [x] Browser shell UI with glassmorphism design
- [x] 3D tab management with drag-and-drop
- [x] Command palette with 25+ commands
- [x] AI assistant with chat interface
- [x] Focus mode
- [x] 6 dynamic themes with time-based switching
- [x] Offline game center with 3 games
- [x] Privacy dashboard with toggle controls
- [x] Voice navigation
- [x] Settings panel
- [x] Toast notifications

### Phase 2: Core Engine (Weeks 1-8)
- [ ] Integrate Chromium rendering via Electron/Tauri
- [ ] Multi-process architecture with IPC
- [ ] Actual URL navigation with webview
- [ ] Network stack with proxy/cache
- [ ] GPU compositor integration

### Phase 3: Features (Weeks 9-16)
- [ ] Real tab suspension (freeze renderer process)
- [ ] Extension system (Chrome-compatible API subset)
- [ ] Built-in developer tools
- [ ] Actual AI model integration (LLM API)
- [ ] Split-screen with draggable divider
- [ ] Bookmark/history sync

### Phase 4: Cross-Platform (Weeks 17-24)
- [ ] Windows installer (NSIS/WiX)
- [ ] Linux AppImage/Snap/Flatpak
- [ ] macOS DMG
- [ ] Android app (WebView + Flutter UI)
- [ ] Cloud sync service

### Phase 5: Differentiation (Weeks 25+)
- [ ] AI-powered browsing flow (auto-summarize, auto-translate)
- [ ] Immersive UI mode (VR/AR browsing)
- [ ] Custom rendering engine for specific use cases
- [ ] Marketplace for themes and extensions
