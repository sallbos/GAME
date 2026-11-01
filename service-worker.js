/**
 * SALEH GAMING — Progressive Web App Service Worker
 * Version: 1.0.0
 * Provides offline caching, network-first navigation fallback, and automatic cache updates.
 */

const CACHE_NAME = 'saleh-gaming-v1.0.1';

// Essential assets to cache on install for full offline gameplay
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './404.html',
    './manifest.json',
    './css/main.css',
    './css/game-ui.css',
    './js/audio.js',
    './js/storage.js',
    './js/controls.js',
    './js/games-registry.js',
    './js/app.js',
    './js/pwa.js',

    // All 30 Game Modules
    './js/games/01-snake.js',
    './js/games/02-flappy.js',
    './js/games/03-space-shooter.js',
    './js/games/04-breakout.js',
    './js/games/05-pong.js',
    './js/games/06-zombie-survival.js',
    './js/games/07-ninja-adventure.js',
    './js/games/08-stickman-fighter.js',
    './js/games/09-tic-tac-toe.js',
    './js/games/10-memory-cards.js',
    './js/games/11-2048.js',
    './js/games/12-minesweeper.js',
    './js/games/13-chess.js',
    './js/games/14-checkers.js',
    './js/games/15-sudoku.js',
    './js/games/16-car-racing.js',
    './js/games/17-basketball.js',
    './js/games/18-penalty-shootout.js',
    './js/games/19-endless-runner.js',
    './js/games/20-bike-racing.js',
    './js/games/21-pool-billiards.js',
    './js/games/22-platform-jumper.js',
    './js/games/23-maze-escape.js',
    './js/games/24-tower-defense.js',
    './js/games/25-dungeon-explorer.js',
    './js/games/26-survival-island.js',
    './js/games/27-rock-paper-scissors.js',
    './js/games/28-whack-a-mole.js',
    './js/games/29-fruit-slicer.js',
    './js/games/30-bubble-shooter.js',

    // Icons
    './icons/favicon.png',
    './icons/apple-touch-icon.png',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    './icons/icon-maskable-192x192.png',
    './icons/icon-maskable-512x512.png'
];

// Install Event: Cache all core platform and game assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('[Service Worker] Cache install error:', err);
            })
    );
});

// Activate Event: Delete previous cache versions and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Stale-While-Revalidate with Navigation Offline Fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests and http/https schemes
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    // Navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Try to return cached index.html, else fallback to offline.html
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) return cachedResponse;
                            return caches.match('./index.html')
                                .then((indexRes) => {
                                    if (indexRes) return indexRes;
                                    return caches.match('./offline.html');
                                });
                        });
                })
        );
        return;
    }

    // Static assets & game files: Cache-first with background network update
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to keep cache fresh
                fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                        }
                    })
                    .catch(() => {/* Ignore background network update errors */});
                return cachedResponse;
            }

            // Fallback to network
            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});

// Listen for message events (e.g. prompt to skip waiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
