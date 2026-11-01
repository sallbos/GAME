/**
 * ARCADE 30 - Core Platform Application
 * Handles catalog rendering, category filtering, search, modal launcher & state management.
 */

class ArcadePlatformApp {
    constructor() {
        this.games = window.ARCADE_GAMES || [];
        this.storage = window.arcadeStorage;
        this.audio = window.arcadeAudio;
        this.controls = window.arcadeControls;

        this.currentCategory = 'all';
        this.searchQuery = '';
        this.activeGameInstance = null;
        this.activeGameMeta = null;

        // DOM elements
        this.gridEl = document.getElementById('games-grid');
        this.searchInput = document.getElementById('search-input');
        this.categoryPills = document.querySelectorAll('.category-pill');
        this.muteBtn = document.getElementById('mute-btn');
        this.statsCounter = document.getElementById('stats-counter');

        // Modal elements
        this.modalEl = document.getElementById('game-modal');
        this.canvasEl = document.getElementById('game-canvas');
        this.canvasWrapper = document.getElementById('canvas-wrapper');
        this.modalBadge = document.getElementById('modal-badge');
        this.modalTitle = document.getElementById('modal-title');
        this.modalCategory = document.getElementById('modal-category');
        this.modalInstructions = document.getElementById('modal-instructions');
        this.modalControls = document.getElementById('modal-controls');
        this.difficultyContainer = document.getElementById('difficulty-container');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.touchContainer = document.getElementById('touch-controls-container');

        // Buttons
        this.restartBtn = document.getElementById('restart-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.modalAudioBtn = document.getElementById('modal-audio-btn');

        // Game Over Overlay
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverScore = document.getElementById('game-over-score');
        this.gameOverHigh = document.getElementById('game-over-high');
        this.overlayRestartBtn = document.getElementById('overlay-restart-btn');
        this.overlayCloseBtn = document.getElementById('overlay-close-btn');

        this.init();
    }

    init() {
        this.updateAudioButtonIcons();
        this.bindEvents();
        this.renderCatalog();
        this.updateStats();
    }

    bindEvents() {
        // Search clear button
        const searchClearBtn = document.getElementById('search-clear-btn');

        // Search Input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.renderCatalog();
                if (searchClearBtn) {
                    searchClearBtn.style.display = this.searchQuery ? 'flex' : 'none';
                }
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                if (this.searchInput) this.searchInput.value = '';
                this.searchQuery = '';
                searchClearBtn.style.display = 'none';
                this.renderCatalog();
                if (this.searchInput) this.searchInput.focus();
            });
        }

        // Category Filter Pills
        this.categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.categoryPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.currentCategory = pill.getAttribute('data-category');
                this.renderCatalog();
            });
        });

        // Audio Mute Toggle
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                this.audio.toggleMute();
                this.updateAudioButtonIcons();
            });
        }
        if (this.modalAudioBtn) {
            this.modalAudioBtn.addEventListener('click', () => {
                this.audio.toggleMute();
                this.updateAudioButtonIcons();
            });
        }

        // Modal Actions
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeGame());
        }
        if (this.overlayCloseBtn) {
            this.overlayCloseBtn.addEventListener('click', () => this.closeGame());
        }
        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => this.restartGame());
        }
        if (this.overlayRestartBtn) {
            this.overlayRestartBtn.addEventListener('click', () => this.restartGame());
        }
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Difficulty select
        if (this.difficultySelect) {
            this.difficultySelect.addEventListener('change', (e) => {
                if (this.activeGameInstance && this.activeGameInstance.setDifficulty) {
                    this.activeGameInstance.setDifficulty(e.target.value);
                }
            });
        }

        // Global key shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
                this.closeGame();
            }
        });

        // Footer category links
        document.querySelectorAll('.footer-cat-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const cat = link.getAttribute('data-category');
                if (cat) {
                    this.categoryPills.forEach(p => p.classList.remove('active'));
                    const pill = document.querySelector(`.category-pill[data-category="${cat}"]`);
                    if (pill) pill.classList.add('active');
                    this.currentCategory = cat;
                    this.renderCatalog();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

        // Footer quick-play game links
        document.querySelectorAll('.footer-game-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const gameId = link.getAttribute('data-game');
                if (gameId) this.launchGame(gameId);
            });
        });
    }

    updateAudioButtonIcons() {
        const isMuted = this.audio.isMuted();
        const icon = isMuted ? '🔇' : '🔊';
        if (this.muteBtn) this.muteBtn.innerHTML = icon;
        if (this.modalAudioBtn) this.modalAudioBtn.innerHTML = icon;
    }

    updateStats() {
        const totalGames = this.games.length;
        const allScores = this.storage.getAllScores();
        const highScoresCount = Object.keys(allScores).length;

        if (this.statsCounter) {
            this.statsCounter.innerHTML = `<span>${totalGames}</span> Games Ready &nbsp;|&nbsp; <span>${highScoresCount}</span> High Scores Saved`;
        }
    }

    renderCatalog() {
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';

        const favorites = this.storage.getFavorites();

        const filtered = this.games.filter(game => {
            // Category check
            if (this.currentCategory === 'favorites') {
                if (!favorites.includes(game.id)) return false;
            } else if (this.currentCategory !== 'all') {
                if (game.categoryKey !== this.currentCategory) return false;
            }

            // Search query check
            if (this.searchQuery) {
                const matchTitle = game.title.toLowerCase().includes(this.searchQuery);
                const matchNum = String(game.number) === this.searchQuery;
                const matchDesc = game.description.toLowerCase().includes(this.searchQuery);
                const matchCat = game.category.toLowerCase().includes(this.searchQuery);
                if (!matchTitle && !matchNum && !matchDesc && !matchCat) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            this.gridEl.innerHTML = `
                <div class="no-results">
                    <p>🎮 No games match your filter or search.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(game => {
            const isFav = favorites.includes(game.id);
            const high = this.storage.getHighScore(game.id);

            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="card-thumbnail-wrapper" style="background: ${game.gradient}">
                    <span class="card-number-badge">#${String(game.number).padStart(2, '0')}</span>
                    <button class="card-fav-btn ${isFav ? 'active' : ''}" data-id="${game.id}" title="Toggle Favorite">
                        ${isFav ? '❤️' : '🤍'}
                    </button>
                    <div class="card-thumbnail-icon">${game.badge}</div>
                </div>
                <div class="card-content">
                    <div class="card-category">${game.category}</div>
                    <div class="card-title">${game.title}</div>
                    <div class="card-description">${game.description}</div>
                    <div class="card-footer">
                        <div class="card-highscore">BEST: <span>${high}</span></div>
                        <button class="play-btn" data-id="${game.id}">
                            PLAY NOW <span>▶</span>
                        </button>
                    </div>
                </div>
            `;

            // Favorite button handler
            const favBtn = card.querySelector('.card-fav-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nowFav = this.storage.toggleFavorite(game.id);
                favBtn.innerHTML = nowFav ? '❤️' : '🤍';
                favBtn.classList.toggle('active', nowFav);
                if (this.currentCategory === 'favorites') {
                    this.renderCatalog();
                }
            });

            // Play button handler
            const playBtn = card.querySelector('.play-btn');
            playBtn.addEventListener('click', () => {
                this.launchGame(game.id);
            });

            this.gridEl.appendChild(card);
        });
    }

    launchGame(gameId) {
        const gameMeta = this.games.find(g => g.id === gameId);
        if (!gameMeta) return;

        this.activeGameMeta = gameMeta;
        this.storage.recordGamePlay(gameId);

        // Update modal header & info
        this.modalBadge.innerHTML = gameMeta.badge;
        this.modalTitle.innerHTML = gameMeta.title;
        this.modalCategory.innerHTML = gameMeta.category;
        this.modalInstructions.innerHTML = gameMeta.instructions;
        this.modalControls.innerHTML = gameMeta.controls;

        // Difficulty Selector Setup
        if (gameMeta.hasDifficulty && gameMeta.difficulties) {
            this.difficultyContainer.style.display = 'block';
            this.difficultySelect.innerHTML = gameMeta.difficulties.map(d => `<option value="${d}">${d}</option>`).join('');
            this.difficultySelect.value = gameMeta.difficulties.includes('Normal') ? 'Normal' : gameMeta.difficulties[0];
        } else {
            this.difficultyContainer.style.display = 'none';
        }

        // Hide Game Over Overlay
        this.gameOverOverlay.classList.remove('active');

        // Show Modal
        this.modalEl.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Instantiate Game
        const GameClass = window[gameMeta.classRef];
        if (GameClass) {
            const high = this.storage.getHighScore(gameMeta.id);
            const difficulty = this.difficultySelect.value || 'Normal';

            this.activeGameInstance = new GameClass(
                this.canvasEl,
                this.modalEl,
                this.audio,
                this.controls,
                {
                    highScore: high,
                    difficulty: difficulty,
                    onScoreUpdate: (score) => {
                        this.storage.setHighScore(gameMeta.id, score);
                    },
                    onGameOver: (finalScore) => {
                        this.handleGameOver(finalScore);
                    }
                }
            );

            this.activeGameInstance.start();
        }
    }

    handleGameOver(finalScore) {
        const { isNewHigh, score: high } = this.storage.setHighScore(this.activeGameMeta.id, finalScore);

        this.gameOverTitle.innerHTML = finalScore > 0 ? 'GAME OVER!' : 'MATCH COMPLETED';
        this.gameOverScore.innerHTML = `FINAL SCORE: ${finalScore}`;
        this.gameOverHigh.innerHTML = isNewHigh
            ? `🎉 NEW HIGH SCORE: ${high}! 🎉`
            : `BEST SCORE: ${high}`;

        this.gameOverOverlay.classList.add('active');
        this.updateStats();
    }

    restartGame() {
        this.gameOverOverlay.classList.remove('active');
        if (this.activeGameInstance && this.activeGameInstance.restart) {
            this.activeGameInstance.restart();
        }
    }

    closeGame() {
        if (this.activeGameInstance && this.activeGameInstance.destroy) {
            this.activeGameInstance.destroy();
        }
        this.activeGameInstance = null;
        this.activeGameMeta = null;

        this.gameOverOverlay.classList.remove('active');
        this.modalEl.classList.remove('active');
        document.body.style.overflow = '';
        this.controls.destroyTouchOverlay();

        // Refresh card high scores & stats
        this.renderCatalog();
        this.updateStats();
    }

    toggleFullscreen() {
        const wrapper = this.canvasWrapper;
        if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen();
            } else if (wrapper.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}

// Instantiate App once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.arcadeApp = new ArcadePlatformApp();
});
