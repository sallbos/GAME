/**
 * SALEH GAMING — PWA Manager
 * Handles Service Worker registration, install prompts (Android, Desktop & iOS), and splash screen.
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.installBtn = document.getElementById('install-app-btn');
        this.iosModal = document.getElementById('ios-install-modal');
        this.splashScreen = document.getElementById('pwa-splash-screen');
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupSplashScreen();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then((reg) => {
                        console.log('[PWA] Service Worker registered with scope:', reg.scope);

                        // Check for service worker updates
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification(reg);
                                }
                            });
                        });
                    })
                    .catch((err) => {
                        console.warn('[PWA] Service Worker registration failed:', err);
                    });
            });
        }
    }

    setupInstallPrompt() {
        // If already installed in standalone mode, hide install button
        if (this.isStandalone) {
            if (this.installBtn) this.installBtn.style.display = 'none';
            return;
        }

        // Android / Chromium beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            if (this.installBtn) {
                this.installBtn.style.display = 'inline-flex';
            }
        });

        // iOS Safari detection
        if (this.isIOS && !this.isStandalone) {
            if (this.installBtn) {
                this.installBtn.style.display = 'inline-flex';
            }
        }

        // Install button click handler
        if (this.installBtn) {
            this.installBtn.addEventListener('click', () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    this.deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('[PWA] User accepted the install prompt');
                            this.installBtn.style.display = 'none';
                        }
                        this.deferredPrompt = null;
                    });
                } else if (this.isIOS) {
                    // Open iOS install instructions
                    this.showIOSModal();
                } else {
                    // Fallback for browsers that already installed or don't support beforeinstallprompt
                    alert('To install SALEH GAMING on your device, use your browser menu (⋮ or Share) and select "Install app" or "Add to Home Screen".');
                }
            });
        }

        // App installed listener
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] SALEH GAMING was successfully installed!');
            if (this.installBtn) this.installBtn.style.display = 'none';
            this.deferredPrompt = null;
        });
    }

    showIOSModal() {
        if (this.iosModal) {
            this.iosModal.classList.add('active');
        }
    }

    hideIOSModal() {
        if (this.iosModal) {
            this.iosModal.classList.remove('active');
        }
    }

    setupSplashScreen() {
        if (!this.splashScreen) return;

        // Dismiss splash screen smoothly after page initialization
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.splashScreen.classList.add('fade-out');
                setTimeout(() => {
                    this.splashScreen.style.display = 'none';
                }, 500);
            }, 600);
        });
    }

    showUpdateNotification(reg) {
        const toast = document.createElement('div');
        toast.className = 'pwa-update-toast';
        toast.innerHTML = `
            <span>✨ New Update Available!</span>
            <button id="pwa-refresh-btn" class="pwa-refresh-btn">REFRESH</button>
        `;
        document.body.appendChild(toast);

        document.getElementById('pwa-refresh-btn').addEventListener('click', () => {
            if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        });
    }
}

// Close iOS modal button handler
document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();

    const closeIosBtn = document.getElementById('close-ios-modal');
    if (closeIosBtn) {
        closeIosBtn.addEventListener('click', () => {
            if (window.pwaManager) window.pwaManager.hideIOSModal();
        });
    }
});
