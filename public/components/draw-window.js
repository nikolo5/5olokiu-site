import { WindowElement } from './window.js';

export class DrawWindow extends WindowElement {
    constructor() {
        super();
        this._width = 400;
        this._height = 400;
        this._isDrawing = false;
        this._lastPoint = null;
        this._canvas = null;
        this._ctx = null;
    }

    connectedCallback() {
        // Set attributes before rendering
        this.setAttribute('title', 'draw');
        
        // Set dimensions
        this.style.width = `${this._width}px`;
        this.style.height = `${this._height}px`;
        
        // Call parent's connectedCallback
        super.connectedCallback();
        
        // Setup drawing functionality
        this._setupDrawing();
    }

    _setupDrawing() {
        // Get draw template
        const template = document.getElementById('draw-content');
        if (!template) {
            console.error('Draw content template not found');
            return;
        }

        const content = template.content.cloneNode(true);
        
        // Add draw-specific styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                background-color: var(--color-blue, #e3eafd);
            }

            canvas {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                border-radius: 0 0 10px 10px;
                cursor: crosshair;
            }

            .draw-controls {
                position: absolute;
                bottom: 0.5rem;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-between;
                padding: 0 0.5rem;
                pointer-events: none;
            }

            button {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                pointer-events: auto;
            }

            button:hover {
                opacity: 1;
            }

            button img {
                width: 24px;
                height: 24px;
                display: block;
            }
        `;

        // Add to shadow DOM
        const windowContent = this.shadowRoot.querySelector('.window-content');
        if (!windowContent) {
            console.error('Window content element not found');
            return;
        }

        windowContent.appendChild(style);
        windowContent.appendChild(content);

        // Setup canvas after content is in DOM
        requestAnimationFrame(() => {
            this._canvas = this.shadowRoot.querySelector('canvas');
            if (!this._canvas) {
                console.error('Canvas element not found');
                return;
            }

            this._ctx = this._canvas.getContext('2d');
            this._setupCanvas();
            this._setupEventListeners();
        });
    }

    _setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this._canvas.getBoundingClientRect();
        
        // Set canvas size accounting for device pixel ratio
        this._canvas.width = rect.width * dpr;
        this._canvas.height = rect.height * dpr;
        
        // Scale context to account for device pixel ratio
        this._ctx.scale(dpr, dpr);
        
        // Set drawing style
        this._ctx.lineWidth = 2;
        this._ctx.lineCap = 'round';
        this._ctx.lineJoin = 'round';
        this._ctx.strokeStyle = '#000';
    }

    _setupEventListeners() {
        if (!this._canvas) return;

        // Drawing events
        this._canvas.addEventListener('mousedown', this._startDrawing.bind(this));
        this._canvas.addEventListener('mousemove', this._draw.bind(this));
        this._canvas.addEventListener('mouseup', this._stopDrawing.bind(this));
        this._canvas.addEventListener('mouseleave', this._stopDrawing.bind(this));

        // Touch events
        this._canvas.addEventListener('touchstart', this._handleTouch.bind(this));
        this._canvas.addEventListener('touchmove', this._handleTouch.bind(this));
        this._canvas.addEventListener('touchend', this._stopDrawing.bind(this));

        // Control buttons
        const restartButton = this.shadowRoot.querySelector('.restart-button');
        const sendButton = this.shadowRoot.querySelector('.send-button');

        if (restartButton) {
            restartButton.addEventListener('click', this._clearCanvas.bind(this));
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', this._saveDrawing.bind(this));
        }

        // Handle resize
        this._handleResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._handleResize);
    }

    _startDrawing(e) {
        this._isDrawing = true;
        const point = this._getPoint(e);
        this._lastPoint = point;
        this._ctx.beginPath();
        this._ctx.moveTo(point.x, point.y);
    }

    _draw(e) {
        if (!this._isDrawing) return;
        
        const point = this._getPoint(e);
        this._ctx.lineTo(point.x, point.y);
        this._ctx.stroke();
        this._lastPoint = point;
    }

    _stopDrawing() {
        this._isDrawing = false;
        this._lastPoint = null;
        this._ctx.closePath();
    }

    _getPoint(e) {
        const rect = this._canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return { x, y };
    }

    _handleTouch(e) {
        e.preventDefault();
        const touch = e.type === 'touchstart' ? this._startDrawing : this._draw;
        touch.call(this, e);
    }

    _clearCanvas() {
        const rect = this._canvas.getBoundingClientRect();
        this._ctx.clearRect(0, 0, rect.width, rect.height);
    }

    async _saveDrawing() {
        try {
            const imageData = this._canvas.toDataURL('image/png');
            const response = await fetch('/api/saveDrawing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: imageData })
            });

            if (!response.ok) throw new Error('Failed to save drawing');

            // Dispatch save event
            this.dispatchEvent(new CustomEvent('drawingsaved', {
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Error saving drawing:', error);
        }
    }

    _handleResize() {
        // Save current drawing
        const imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        
        // Resize canvas
        this._setupCanvas();
        
        // Restore drawing
        this._ctx.putImageData(imageData, 0, 0);
    }

    // Override parent methods if needed
    _onMinimize() {
        // Add draw-specific class to dock item
        super._onMinimize();
        const dockItem = document.querySelector('.dock-item:last-child');
        if (dockItem) {
            dockItem.classList.add('draw-dock-item');
        }
    }
}

// Register the component
customElements.define('draw-window', DrawWindow);
