rexport class WindowElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // State
        this._position = { x: 0, y: 0 };
        this._isDragging = false;
        this._dragOffset = { x: 0, y: 0 };
        this._boundaryThreshold = 20; // px from edge to show boundary
        
        // Bind methods
        this._onDragStart = this._onDragStart.bind(this);
        this._onDrag = this._onDrag.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
        this._onMinimize = this._onMinimize.bind(this);
    }

    connectedCallback() {
        this._render();
        this._setupEventListeners();
        this._updatePosition();
    }

    disconnectedCallback() {
        this._removeEventListeners();
    }

    static get observedAttributes() {
        return ['title', 'x', 'y', 'minimized'];
    }

    get position() {
        return { ...this._position };
    }

    set position({ x, y }) {
        this._position = { x, y };
        this._updatePosition();
    }

    _render() {
        const template = document.getElementById('window-template');
        if (!template) {
            console.error('Window template not found');
            return;
        }

        const content = template.content.cloneNode(true);
        
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: absolute;
                display: block;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                            box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform;
                filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.1));
            }

            .window {
                background: white;
                border: 2px solid var(--color-border, #eee);
                border-radius: 12px;
                overflow: hidden;
                width: 100%;
                height: 100%;
                transition: border-color 0.2s ease,
                            box-shadow 0.2s ease;
            }

            .window-titlebar {
                height: 2rem;
                background: rgba(0, 0, 0, 0.1);
                padding: 0 0.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: move;
                user-select: none;
                border-radius: 10px 10px 0 0;
                touch-action: none;
            }

            .window-title {
                font-family: var(--main-font, sans-serif);
                font-size: 1rem;
                pointer-events: none;
            }

            .window-minimize {
                width: 1.2rem;
                height: 1.2rem;
                padding: 0;
                border: none;
                background: none;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .window-minimize:hover {
                opacity: 1;
            }

            .window-minimize img {
                width: 100%;
                height: 100%;
                display: block;
            }

            .window-content {
                height: calc(100% - 2rem);
                position: relative;
            }

            :host([minimized]) {
                display: none;
            }

            :host(:hover) .window {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            :host([near-boundary="true"]) .window {
                border-color: rgba(255, 0, 0, 0.3);
                box-shadow: 0 0 0 1px rgba(255, 0, 0, 0.1),
                            0 4px 12px rgba(0, 0, 0, 0.1);
            }

            :host([near-boundary="true"]) .window::before {
                content: '';
                position: absolute;
                inset: -2px;
                border: 2px solid rgba(255, 0, 0, 0.2);
                border-radius: 14px;
                pointer-events: none;
                animation: pulse 1.5s ease-in-out infinite;
            }

            @keyframes pulse {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(content);

        const titleElement = this.shadowRoot.querySelector('.window-title');
        if (titleElement) {
            titleElement.textContent = this.getAttribute('title') || '';
        }
    }

    _setupEventListeners() {
        const titlebar = this.shadowRoot.querySelector('.window-titlebar');
        const minimizeButton = this.shadowRoot.querySelector('.window-minimize');

        if (titlebar) {
            titlebar.addEventListener('mousedown', this._onDragStart);
            titlebar.addEventListener('touchstart', this._onDragStart, { passive: false });
        }

        if (minimizeButton) {
            minimizeButton.addEventListener('click', this._onMinimize);
        }

        this.addEventListener('mousedown', () => {
            const currentMax = Math.max(
                ...Array.from(document.querySelectorAll('*'))
                    .map(el => parseInt(getComputedStyle(el).zIndex) || 0)
            );
            this.style.zIndex = (currentMax + 1).toString();
        });
    }

    _removeEventListeners() {
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);
        document.removeEventListener('touchmove', this._onDrag);
        document.removeEventListener('touchend', this._onDragEnd);
    }

    _updatePosition() {
        this.style.transition = this._isDragging ? 'none' : '';
        this.style.transform = `translate3d(${this._position.x}px, ${this._position.y}px, 0)`;
    }

    _getContainer() {
        return this.closest('.workspace');
    }

    _getEventPosition(e) {
        if (e.touches) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            };
        }
        return {
            clientX: e.clientX,
            clientY: e.clientY
        };
    }

    _checkBoundaryProximity(x, y) {
        const container = this._getContainer();
        if (!container) return false;

        const containerRect = container.getBoundingClientRect();
        const windowRect = this.getBoundingClientRect();
        const threshold = this._boundaryThreshold;

        const nearLeft = x < threshold;
        const nearRight = x + windowRect.width > containerRect.width - threshold;
        const nearTop = y < threshold;
        const nearBottom = y + windowRect.height > containerRect.height - threshold;

        return nearLeft || nearRight || nearTop || nearBottom;
    }

    _constrainToContainer(x, y) {
        const container = this._getContainer();
        if (!container) return { x, y };

        const containerRect = container.getBoundingClientRect();
        const windowRect = this.getBoundingClientRect();
        const padding = 10;

        return {
            x: Math.max(padding, Math.min(x, containerRect.width - windowRect.width - padding)),
            y: Math.max(padding, Math.min(y, containerRect.height - windowRect.height - padding))
        };
    }

    _onDragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        e.preventDefault();

        this._isDragging = true;
        const pos = this._getEventPosition(e);
        const rect = this.getBoundingClientRect();
        
        this._dragOffset = {
            x: pos.clientX - rect.left,
            y: pos.clientY - rect.top
        };

        this.style.transition = 'none';
        this.style.cursor = 'grabbing';

        document.addEventListener('mousemove', this._onDrag);
        document.addEventListener('mouseup', this._onDragEnd);
        document.addEventListener('touchmove', this._onDrag, { passive: false });
        document.addEventListener('touchend', this._onDragEnd);
    }

    _onDrag(e) {
        if (!this._isDragging) return;
        e.preventDefault();

        const container = this._getContainer();
        if (!container) return;

        const pos = this._getEventPosition(e);
        const containerRect = container.getBoundingClientRect();

        let newX = pos.clientX - containerRect.left - this._dragOffset.x;
        let newY = pos.clientY - containerRect.top - this._dragOffset.y;

        const isNearBoundary = this._checkBoundaryProximity(newX, newY);
        this.toggleAttribute('near-boundary', isNearBoundary);

        const constrained = this._constrainToContainer(newX, newY);
        this._position = constrained;
        this._updatePosition();
    }

    _onDragEnd() {
        if (!this._isDragging) return;

        this._isDragging = false;
        this.toggleAttribute('near-boundary', false);
        this.style.cursor = '';
        this.style.transition = '';

        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);
        document.removeEventListener('touchmove', this._onDrag);
        document.removeEventListener('touchend', this._onDragEnd);

        this.dispatchEvent(new CustomEvent('positionchange', {
            detail: this.position,
            bubbles: true,
            composed: true
        }));
    }

    _onMinimize(e) {
        e?.stopPropagation();
        this.setAttribute('minimized', '');
        
        this.dispatchEvent(new CustomEvent('minimize', {
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('window-element', WindowElement);
