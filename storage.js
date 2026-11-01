/**
 * LocalStorage state manager for Arcade 30
 * Stores high scores, favorites, recent plays, and user preferences.
 */
class ArcadeStorage {
    constructor() {
        this.SCORES_KEY = 'arcade30_highscores';
        this.FAVS_KEY = 'arcade30_favorites';
        this.RECENTS_KEY = 'arcade30_recent_plays';
        this.STATS_KEY = 'arcade30_stats';
    }

    getHighScore(gameId) {
        try {
            const scores = JSON.parse(localStorage.getItem(this.SCORES_KEY) || '{}');
            return scores[gameId] || 0;
        } catch (e) {
            return 0;
        }
    }

    setHighScore(gameId, score) {
        try {
            const scores = JSON.parse(localStorage.getItem(this.SCORES_KEY) || '{}');
            const current = scores[gameId] || 0;
            if (score > current) {
                scores[gameId] = score;
                localStorage.setItem(this.SCORES_KEY, JSON.stringify(scores));
                return { isNewHigh: true, score };
            }
            return { isNewHigh: false, score: current };
        } catch (e) {
            return { isNewHigh: false, score };
        }
    }

    getAllScores() {
        try {
            return JSON.parse(localStorage.getItem(this.SCORES_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(this.FAVS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    isFavorite(gameId) {
        const favs = this.getFavorites();
        return favs.includes(gameId);
    }

    toggleFavorite(gameId) {
        const favs = this.getFavorites();
        const index = favs.indexOf(gameId);
        let isFav = false;
        if (index > -1) {
            favs.splice(index, 1);
            isFav = false;
        } else {
            favs.push(gameId);
            isFav = true;
        }
        localStorage.setItem(this.FAVS_KEY, JSON.stringify(favs));
        return isFav;
    }

    recordGamePlay(gameId) {
        try {
            // Update recents
            let recents = JSON.parse(localStorage.getItem(this.RECENTS_KEY) || '[]');
            recents = recents.filter(id => id !== gameId);
            recents.unshift(gameId);
            if (recents.length > 8) recents.pop();
            localStorage.setItem(this.RECENTS_KEY, JSON.stringify(recents));

            // Update stats
            const stats = JSON.parse(localStorage.getItem(this.STATS_KEY) || '{"totalPlays": 0, "gamePlays": {}}');
            stats.totalPlays = (stats.totalPlays || 0) + 1;
            stats.gamePlays = stats.gamePlays || {};
            stats.gamePlays[gameId] = (stats.gamePlays[gameId] || 0) + 1;
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        } catch (e) {}
    }

    getRecentPlays() {
        try {
            return JSON.parse(localStorage.getItem(this.RECENTS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }
}

window.arcadeStorage = new ArcadeStorage();
