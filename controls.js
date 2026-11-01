/**
 * Unified Controls Manager:
 * Handles desktop keyboard inputs and virtual on-screen touch controls (D-Pad, Analog Stick, Action Buttons)
 */
class ControlsManager {
    constructor() {
        this.keys = {};
        this.buttons = {};
        this.vector = { x: 0, y: 0 };
        this.activeConfig = null;
        this.touchContainer = null;
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        this.initKeyboard();
    }

    initKeyboard() {
        const preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

        window.addEventListener('keydown', (e) => {
            if (window.arcadeApp && window.arcadeApp.activeGame) {
                if (preventKeys.includes(e.code)) {
                    e.preventDefault();
                }
            }
            this.keys[e.code] = true;
            this.keys[e.key] = true;
        }, { passive: false });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });

        window.addEventListener('blur', () => {
            this.reset();
        });
    }

    reset() {
        this.keys = {};
        this.buttons = {};
        this.vector = { x: 0, y: 0 };
    }

    isPressed(action) {
        switch (action) {
            case 'up':
                return !!(this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w'] || this.buttons['up']);
            case 'down':
                return !!(this.keys['ArrowDown'] || this.keys['KeyS'] || this.keys['s'] || this.buttons['down']);
            case 'left':
                return !!(this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a'] || this.buttons['left']);
            case 'right':
                return !!(this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d'] || this.buttons['right']);
            case 'action':
            case 'jump':
            case 'space':
                return !!(this.keys['Space'] || this.keys[' '] || this.keys['KeyZ'] || this.keys['KeyJ'] || this.buttons['action'] || this.buttons['jump']);
            case 'shoot':
                return !!(this.keys['Space'] || this.keys['KeyX'] || this.keys['KeyK'] || this.buttons['shoot']);
            case 'punch':
                return !!(this.keys['KeyJ'] || this.keys['j'] || this.buttons['punch']);
            case 'kick':
                return !!(this.keys['KeyK'] || this.keys['k'] || this.buttons['kick']);
            case 'special':
                return !!(this.keys['KeyL'] || this.keys['l'] || this.buttons['special']);
            case 'block':
                return !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.buttons['block']);
            case 'pause':
                return !!(this.keys['KeyP'] || this.keys['p'] || this.keys['Escape']);
            default:
                return !!(this.keys[action] || this.buttons[action]);
        }
    }

    getVector() {
        let vx = 0;
        let vy = 0;

        if (this.isPressed('left')) vx -= 1;
        if (this.isPressed('right')) vx += 1;
        if (this.isPressed('up')) vy -= 1;
        if (this.isPressed('down')) vy += 1;

        if (this.vector.x !== 0 || this.vector.y !== 0) {
            return this.vector;
        }

        const len = Math.hypot(vx, vy);
        if (len > 0) {
            return { x: vx / len, y: vy / len };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Mounts touch overlay depending on game layout requirements:
     * layout can be:
     * - 'dpad-action': Left D-pad, Right Action button
     * - 'horizontal-action': Left/Right buttons on left, Jump/Action on right
     * - 'dpad-only': Just D-pad (for Snake, 2048, Maze)
     * - 'action-only': Single large Tap/Flap button
     * - 'fighter': D-pad plus Punch, Kick, Jump, Block buttons
     * - 'dual-action': Left/Right plus Accelerate/Brake or Lean
     * - 'none': Direct canvas touch interaction (like chess, cards, tic tac toe, fruit slicer)
     */
    setupTouchOverlay(container, layout = 'dpad-action', labels = {}) {
        this.touchContainer = container;
        container.innerHTML = '';
        this.buttons = {};
        this.vector = { x: 0, y: 0 };

        if (layout === 'none') {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.className = `touch-controls-overlay layout-${layout}`;

        const createBtn = (id, text, className = 'touch-btn') => {
            const btn = document.createElement('button');
            btn.className = `${className} touch-${id}`;
            btn.setAttribute('type', 'button');
            btn.innerHTML = labels[id] || text;
            
            const activate = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.buttons[id] = true;
                btn.classList.add('active');
                if (window.arcadeAudio && !['up','down','left','right'].includes(id)) {
                    window.arcadeAudio.init();
                }
            };
            const deactivate = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.buttons[id] = false;
                btn.classList.remove('active');
            };

            btn.addEventListener('touchstart', activate, { passive: false });
            btn.addEventListener('touchend', deactivate, { passive: false });
            btn.addEventListener('touchcancel', deactivate, { passive: false });
            btn.addEventListener('mousedown', activate);
            btn.addEventListener('mouseup', deactivate);
            btn.addEventListener('mouseleave', deactivate);

            return btn;
        };

        if (layout === 'dpad-action' || layout === 'dpad-only' || layout === 'fighter') {
            const dpad = document.createElement('div');
            dpad.className = 'touch-dpad';
            dpad.appendChild(createBtn('up', '▲', 'touch-btn dpad-up'));
            
            const middle = document.createElement('div');
            middle.className = 'dpad-middle';
            middle.appendChild(createBtn('left', '◀', 'touch-btn dpad-left'));
            const centerSpacer = document.createElement('div');
            centerSpacer.className = 'dpad-center';
            middle.appendChild(centerSpacer);
            middle.appendChild(createBtn('right', '▶', 'touch-btn dpad-right'));
            dpad.appendChild(middle);

            dpad.appendChild(createBtn('down', '▼', 'touch-btn dpad-down'));
            container.appendChild(dpad);
        } else if (layout === 'horizontal-action' || layout === 'steer-pedals') {
            const leftGroup = document.createElement('div');
            leftGroup.className = 'touch-group-horizontal';
            leftGroup.appendChild(createBtn('left', '◀', 'touch-btn steer-left'));
            leftGroup.appendChild(createBtn('right', '▶', 'touch-btn steer-right'));
            container.appendChild(leftGroup);
        }

        // Action Buttons Group
        if (layout === 'action-only') {
            const actionGroup = document.createElement('div');
            actionGroup.className = 'touch-action-full';
            actionGroup.appendChild(createBtn('action', labels.action || 'TAP / JUMP', 'touch-btn-huge'));
            container.appendChild(actionGroup);
        } else if (layout === 'dpad-action' || layout === 'horizontal-action') {
            const actionGroup = document.createElement('div');
            actionGroup.className = 'touch-actions-group';
            actionGroup.appendChild(createBtn('action', labels.action || 'A', 'touch-btn action-main'));
            if (labels.secondary || labels.shoot) {
                actionGroup.appendChild(createBtn('shoot', labels.shoot || 'B', 'touch-btn action-sub'));
            }
            container.appendChild(actionGroup);
        } else if (layout === 'fighter') {
            const fighterGroup = document.createElement('div');
            fighterGroup.className = 'touch-actions-fighter';
            fighterGroup.appendChild(createBtn('punch', 'PUNCH', 'touch-btn combat-btn'));
            fighterGroup.appendChild(createBtn('kick', 'KICK', 'touch-btn combat-btn'));
            fighterGroup.appendChild(createBtn('special', 'SPECIAL', 'touch-btn combat-btn special'));
            fighterGroup.appendChild(createBtn('block', 'BLOCK', 'touch-btn combat-btn block'));
            container.appendChild(fighterGroup);
        } else if (layout === 'bike') {
            const bikeGroup = document.createElement('div');
            bikeGroup.className = 'touch-actions-bike';
            bikeGroup.appendChild(createBtn('up', 'GAS ⚡', 'touch-btn bike-btn gas'));
            bikeGroup.appendChild(createBtn('down', 'BRAKE ⛔', 'touch-btn bike-btn brake'));
            container.appendChild(bikeGroup);
        }
    }

    destroyTouchOverlay() {
        if (this.touchContainer) {
            this.touchContainer.innerHTML = '';
            this.touchContainer.style.display = 'none';
        }
        this.reset();
    }
}

window.arcadeControls = new ControlsManager();
