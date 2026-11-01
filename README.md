# SALEH GAMING — Progressive Web App (PWA)

**SALEH GAMING** is a complete, installable Progressive Web App (PWA) containing **EXACTLY 30 fully functional, playable games** across 5 distinct categories. Built using HTML5, CSS3, Vanilla JavaScript, Canvas 2D, and synthesized Web Audio API.

The application runs 100% locally and offline in standalone mode on Android, iOS, tablets, and desktop devices without downloading or installing any external dependencies.

---

## 📱 PWA Features & Capabilities

- **Web App Manifest (`manifest.json`)**:
  - `name`: SALEH GAMING
  - `short_name`: SALEH GAMING
  - `display`: `standalone`
  - `theme_color`: `#080808`
  - `background_color`: `#080808`
  - Categorized shortcuts for rapid access to game categories.
- **Service Worker (`service-worker.js`)**:
  - Pre-caches all platform assets, core scripts, stylesheets, and all 30 game engines.
  - Stale-While-Revalidate caching strategy with automatic background updates.
  - Navigation requests fallback to cached game hub or custom `offline.html` fallback.
  - Automatic cache invalidation when a new version is deployed (`self.skipWaiting()` + `clients.claim()`).
- **Complete Icon Suite (`icons/`)**:
  - Standard sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512.
  - Maskable adaptive icons: 192x192 and 512x512 for modern Android launchers.
  - Apple touch icon: 180x180 for iOS Home Screen.
  - Favicon: 32x32.
- **Install App Integration (`js/pwa.js`)**:
  - Automatically captures `beforeinstallprompt` on Android and Chromium browsers and reveals a prominent **📲 INSTALL APP** button in the header.
  - Built-in **iOS Safari Guide Modal** with step-by-step instructions (Share ⎋ → Add to Home Screen ➕).
- **Professional Splash Screen**:
  - Features the SALEH GAMING emblem with glowing neon pulse animation that smoothly transitions into the app on load.
- **Offline Fallback Page (`offline.html`)**:
  - Dedicated offline page styled in SALEH GAMING's dark aesthetic (`#080808`).
- **Cloudflare Pages Compatibility**:
  - Configured with `_headers` for correct MIME types, caching directives, and `Service-Worker-Allowed: /`.

---

## 🎮 The 30 Playable Games by Category

### 💥 ACTION & ARCADE GAMES (1 - 8)
1. **Snake** — Classic arcade snake with glowing neon segments, fruit eating, golden bonus stars, and speed scaling.
2. **Flappy Cyber** — Flappy Bird-inspired game with drone flap impulse, gravity physics, and neon pipe obstacles.
3. **Space Shooter** — Retro vertical arcade shoot-em-up with alien waves, laser powerups, shields, and particle explosions.
4. **Breakout** — Brick breaker with dynamic paddle spin angles, multi-ball capsules, and explosive bricks.
5. **Pong** — 2D paddle duel with spin physics, AI difficulty scaling, escalating rally speeds, and win thresholds.
6. **Zombie Survival** — Top-down twin-stick arena shooter featuring zombie hordes, shotgun/machine gun drops, and medkits.
7. **Ninja Adventure** — Side-scrolling rooftop platformer with double jumps, shuriken throwing, slides, and sacred scrolls.
8. **Stickman Fighter** — 1v1 arena fighting brawl with punches, kicks, blocks, combos, and super energy blast attacks.

### 🧠 PUZZLE & BRAIN GAMES (9 - 15)
9. **Tic Tac Toe** — Neon glowing Tic Tac Toe with minimax AI, 2-player pass & play, and strike-through win animations.
10. **Memory Cards** — Visual card matching puzzle with 3D card flip effects, stopwatch timer, and star ratings.
11. **2048** — Authentic 4x4 sliding block puzzle with tile merging, animations, undo history, and swipe controls.
12. **Minesweeper** — Classic minefield deduction with first-click safety, flag mode toggle for mobile, flood fill, and timer.
13. **Chess** — Complete 8x8 standard chess with legal move highlights, captures, check warnings, pawn promotion, and AI.
14. **Checkers** — Standard 8x8 draughts with diagonal movement, jump captures, king crowning, and AI opponent.
15. **Sudoku** — 9x9 logic puzzle with 3x3 block borders, on-screen numpad, pencil notes mode, and error tracking.

### 🏎️ RACING & SPORTS GAMES (16 - 21)
16. **Car Racing** — High-speed highway racer with overtaking traffic, turbo nitro boost, fuel pickups, and distance meters.
17. **Basketball Challenge** — Physics arc shooting with drag-to-aim trajectory, backboard rebounds, and swish streaks.
18. **Football Penalty** — 3D perspective penalty shootout against an intelligent diving goalkeeper across 5 rounds.
19. **Endless Runner** — 2D cyberpunk rooftop sprint with double jumps, slide rolls, laser hurdles, and drone obstacles.
20. **Bike Racing** — Physics hill climb motorbike trial with undulating terrain, wheel balance, and stunt backflips.
21. **Pool Billiards** — Top-down pocket billiards with cue stick aiming, ball-to-ball collisions, and cushion rebounds.

### 🏰 ADVENTURE & STRATEGY GAMES (22 - 26)
22. **Platform Jumper** — Infinite vertical bounce adventure with moving platforms, breakable ledges, and golden springs.
23. **Maze Escape** — Procedural recursive backtracker labyrinth with flashlight fog of war, key quest, and exit portal.
24. **Tower Defense** — Tactical lane defense with Archer, Cannon, Frost, and Laser towers against creep waves.
25. **Dungeon Explorer** — Roguelite dungeon crawler with sword slashing, monsters, treasure chests, and descending stairs.
26. **Survival Island** — Island survival simulation with Day/Night cycle, wood chopping, rock mining, and campfire warmth.

### 🎯 CLASSIC & FUN GAMES (27 - 30)
27. **Rock Paper Scissors** — Animated showdown against AI with 3-2-1 countdown, streak multipliers, and tournament ladder.
28. **Whack-a-Mole** — Fast-paced reflex test with golden moles, bomb moles, hammer smashes, and frenzy streaks.
29. **Fruit Slicer** — Blade slicing action with severed fruit halves, juice bursts, bombs, and combo multipliers.
30. **Bubble Shooter** — Hexagonal bubble cluster shooter with wall reflection aiming, match-3 pops, and floating drops.

---

## 🚀 How to Run & Install

1. Open [index.html](file:///c:/Users/salehe/Documents/cite%20game/index.html) in any modern browser.
2. On Android/Chrome, tap the **📲 INSTALL APP** button in the header or the browser install prompt.
3. On iOS Safari, tap **Share** ⎋ → **Add to Home Screen** ➕.
4. Enjoy all 30 games in standalone fullscreen mode online or completely offline!
