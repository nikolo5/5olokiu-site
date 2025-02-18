export class WindowElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // State
        this._position = { x: 0, y: 0 };
        this._isDragging = false;
        this._dragOffset = { x: 0, y: 0 };
        this._gridSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'));
        this._minSpacing = 20;
        
        // Bind methods
        this._onDragStart = this._onDragStart.bind(this);
        this._onDrag = this._onDrag.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
        this._onMinimize = this._onMinimize.bind(this);
    }

    // Lifecycle methods
    connectedCallback() {
        this._render();
        this._setupEventListeners();
        this._updatePosition();
    }

    disconnectedCallback() {
        this._removeEventListeners();
    }

    // Static properties
    static get observedAttributes() {
        return ['title', 'x', 'y', 'minimized'];
    }

    // Getters/Setters
    get position() {
        return { ...this._position };
    }

    set position({ x, y }) {
        this._position = { x, y };
        this._updatePosition();
    }

    // Private methods
    _render() {
        // Get template
        const template = document.getElementById('window-template');
        if (!template) {
            console.error('Window template not found');
            return;
        }

        const content = template.content.cloneNode(true);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: absolute;
                display: block;
                transition: transform var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform;
            }

            .window {
                background: white;
                border: 2px solid var(--color-border, #eee);
                border-radius: 12px;
                box-shadow: 2px 2px 5px var(--color-shadow, rgba(0, 0, 0, 0.2));
                overflow: hidden;
                width: 100%;
                height: 100%;
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

            :host(:hover) {
                box-shadow: 0 4px 12px var(--color-shadow, rgba(0, 0, 0, 0.2));
            }
        `;

        // Add to shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(content);

        // Set initial title
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
        }

        if (minimizeButton) {
            minimizeButton.addEventListener('click', this._onMinimize);
        }

        // Bring to front on mousedown
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
    }

    _updatePosition() {
        // Remove transition during drag
        this.style.transition = this._isDragging ? 'none' : '';
        
        // Update position with transform
        this.style.transform = `translate(${this._position.x}px, ${this._position.y}px)`;
    }

    _snapToGrid(x, y) {
        return {
            x: Math.round(x / this._gridSize) * this._gridSize,
            y: Math.round(y / this._gridSize) * this._gridSize
        };
    }

    _getContainer() {
        return this.closest('.grid-container');
    }

    _constrainToContainer(x, y) {
        const container = this._getContainer();
        if (!container) return { x, y };

        const containerRect = container.getBoundingClientRect();
        const windowRect = this.getBoundingClientRect();

        const maxX = containerRect.width - windowRect.width;
        const maxY = containerRect.height - windowRect.height;

        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY))
        };
    }

    _onDragStart(e) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        this._isDragging = true;
        const rect = this.getBoundingClientRect();
        const containerRect = this._getContainer()?.getBoundingClientRect();
        
        if (containerRect) {
            this._dragOffset = {
                x: e.clientX - (rect.left - containerRect.left),
                y: e.clientY - (rect.top - containerRect.top)
            };
        }

        document.addEventListener('mousemove', this._onDrag);
        document.addEventListener('mouseup', this._onDragEnd);
    }

    _onDrag(e) {
        if (!this._isDragging) return;
        e.preventDefault();

        const container = this._getContainer();
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - this._dragOffset.x;
        let newY = e.clientY - containerRect.top - this._dragOffset.y;

        // Apply constraints
        const constrained = this._constrainToContainer(newX, newY);
        const snapped = this._snapToGrid(constrained.x, constrained.y);

        this._position = snapped;
        this._updatePosition();
    }

    _onDragEnd() {
        if (!this._isDragging) return;

        this._isDragging = false;
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);

        // Dispatch position change event
        this.dispatchEvent(new CustomEvent('positionchange', {
            detail: this.position,
            bubbles: true,
            composed: true
        }));
    }

    _onMinimize(e) {
        e?.stopPropagation();
        this.setAttribute('minimized', '');
        
        // Dispatch minimize event
        this.dispatchEvent(new CustomEvent('minimize', {
            bubbles: true,
            composed: true
        }));
    }
}

// Register the component
customElements.define('window-element', WindowElement);
