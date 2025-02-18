class WindowManager {
    constructor() {
        this.container = document.querySelector('.grid-container');
        this.dock = document.querySelector('.dock');
        this.windows = new Map();
        this.gridSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'));
        this.goldenRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--golden-ratio'));
        
        // Bind methods
        this._handleResize = this._handleResize.bind(this);
        this._handleWindowMinimize = this._handleWindowMinimize.bind(this);
        this._handleWindowRestore = this._handleWindowRestore.bind(this);
    }

    initialize() {
        if (!this.container || !this.dock) {
            console.error('Required elements not found');
            return;
        }

        // Create windows with initial positions
        this._createWindows();
        
        // Set up event listeners
        window.addEventListener('resize', this._handleResize);
        this.container.addEventListener('minimize', this._handleWindowMinimize);
        this.container.addEventListener('restore', this._handleWindowRestore);
        
        // Initial layout
        requestAnimationFrame(() => {
            this._layoutWindows();
        });
    }

    _createWindows() {
        // Create nav window
        const navWindow = document.createElement('nav-window');
        this.windows.set('nav', navWindow);
        
        // Create draw window
        const drawWindow = document.createElement('draw-window');
        this.windows.set('draw', drawWindow);
        
        // Create write window
        const writeWindow = document.createElement('write-window');
        this.windows.set('write', writeWindow);
        
        // Add to container
        this.windows.forEach(window => {
            window.style.opacity = '0';
            this.container.appendChild(window);
        });

        // Fade in windows after they're positioned
        requestAnimationFrame(() => {
            this.windows.forEach(window => {
                window.style.transition = 'opacity 0.3s ease-out';
                window.style.opacity = '1';
            });
        });
    }

    _layoutWindows() {
        const containerRect = this.container.getBoundingClientRect();
        const gridCols = Math.floor(containerRect.width / this.gridSize);
        const gridRows = Math.floor(containerRect.height / this.gridSize);

        // Calculate positions in grid units
        const positions = {
            nav: {
                x: Math.floor(gridCols * 0.2),
                y: Math.floor(gridRows * 0.2)
            },
            draw: {
                x: Math.floor(gridCols * 0.4),
                y: Math.floor(gridRows * 0.3)
            },
            write: {
                x: Math.floor(gridCols * 0.6),
                y: Math.floor(gridRows * 0.5)
            }
        };

        // Position windows
        this.windows.forEach((window, id) => {
            if (!window.hasAttribute('minimized')) {
                const pos = positions[id];
                const x = pos.x * this.gridSize;
                const y = pos.y * this.gridSize;
                window.position = { x, y };
            }
        });
    }

    _handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            // Update grid size
            this.gridSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'));
            
            // Reposition windows
            this._layoutWindows();
        }, 100);
    }

    _handleWindowMinimize(event) {
        const window = event.target;
        const windowId = Array.from(this.windows.entries())
            .find(([id, w]) => w === window)?.[0];
            
        if (windowId) {
            // Create dock item
            const dockItem = document.createElement('button');
            dockItem.className = 'dock-item';
            dockItem.classList.add(`${windowId}-dock-item`);
            dockItem.setAttribute('data-window-id', windowId);
            dockItem.addEventListener('click', () => {
                window.removeAttribute('minimized');
                this.dock.removeChild(dockItem);
                this._layoutWindows();
                
                // Dispatch restore event
                window.dispatchEvent(new CustomEvent('restore', {
                    bubbles: true,
                    composed: true
                }));
            });
            this.dock.appendChild(dockItem);
        }
    }

    _handleWindowRestore(event) {
        const window = event.target;
        const windowId = Array.from(this.windows.entries())
            .find(([id, w]) => w === window)?.[0];
            
        if (windowId) {
            // Remove dock item
            const dockItem = this.dock.querySelector(`[data-window-id="${windowId}"]`);
            if (dockItem) {
                this.dock.removeChild(dockItem);
            }
            
            // Restore window position
            this._layoutWindows();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const manager = new WindowManager();
    manager.initialize();
});
