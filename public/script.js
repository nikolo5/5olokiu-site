class WindowManager {
    constructor() {
        this.workspace = document.querySelector('.workspace');
        this.dock = document.querySelector('.dock');
        this.windows = new Map();
        
        // Bind methods
        this._handleResize = this._handleResize.bind(this);
        this._handleWindowMinimize = this._handleWindowMinimize.bind(this);
        this._handleWindowRestore = this._handleWindowRestore.bind(this);
    }

    initialize() {
        if (!this.workspace || !this.dock) {
            console.error('Required elements not found');
            return;
        }

        // Create windows with initial positions
        this._createWindows();
        
        // Set up event listeners
        window.addEventListener('resize', this._handleResize);
        this.workspace.addEventListener('minimize', this._handleWindowMinimize);
        this.workspace.addEventListener('restore', this._handleWindowRestore);
        
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
        
        // Add to workspace with fade-in effect
        this.windows.forEach(window => {
            window.style.opacity = '0';
            this.workspace.appendChild(window);
        });

        // Fade in windows after they're positioned
        requestAnimationFrame(() => {
            this.windows.forEach(window => {
                window.style.transition = 'opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                window.style.opacity = '1';
            });
        });
    }

    _layoutWindows() {
        const workspaceRect = this.workspace.getBoundingClientRect();
        const padding = 40; // Padding from edges

        // Calculate positions based on workspace size
        const positions = {
            nav: {
                x: padding,
                y: padding
            },
            draw: {
                x: workspaceRect.width * 0.3,
                y: workspaceRect.height * 0.2
            },
            write: {
                x: workspaceRect.width * 0.6,
                y: workspaceRect.height * 0.4
            }
        };

        // Position windows with staggered animation
        this.windows.forEach((window, id) => {
            if (!window.hasAttribute('minimized')) {
                const pos = positions[id];
                
                // Ensure windows are within bounds
                const rect = window.getBoundingClientRect();
                const maxX = workspaceRect.width - rect.width - padding;
                const maxY = workspaceRect.height - rect.height - padding;
                
                window.position = {
                    x: Math.max(padding, Math.min(pos.x, maxX)),
                    y: Math.max(padding, Math.min(pos.y, maxY))
                };
            }
        });
    }

    _handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this._layoutWindows();
        }, 100);
    }

    _handleWindowMinimize(event) {
        const window = event.target;
        const windowId = Array.from(this.windows.entries())
            .find(([id, w]) => w === window)?.[0];
            
        if (windowId) {
            // Create dock item with animation
            const dockItem = document.createElement('button');
            dockItem.className = 'dock-item';
            dockItem.classList.add(`${windowId}-dock-item`);
            dockItem.setAttribute('data-window-id', windowId);
            
            // Get window position for animation
            const rect = window.getBoundingClientRect();
            const dockRect = this.dock.getBoundingClientRect();
            
            // Set initial position
            dockItem.style.position = 'fixed';
            dockItem.style.left = `${rect.left}px`;
            dockItem.style.top = `${rect.top}px`;
            dockItem.style.width = `${rect.width}px`;
            dockItem.style.height = `${rect.height}px`;
            dockItem.style.transform = 'scale(1)';
            dockItem.style.opacity = '0';
            
            // Add to dock
            this.dock.appendChild(dockItem);
            
            // Trigger animation
            requestAnimationFrame(() => {
                dockItem.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                dockItem.style.left = `${dockRect.left}px`;
                dockItem.style.top = `${dockRect.top}px`;
                dockItem.style.width = '40px';
                dockItem.style.height = '40px';
                dockItem.style.transform = 'scale(1)';
                dockItem.style.opacity = '1';
                
                // Reset styles after animation
                setTimeout(() => {
                    dockItem.style.position = '';
                    dockItem.style.left = '';
                    dockItem.style.top = '';
                    dockItem.style.transform = '';
                    dockItem.style.transition = '';
                }, 300);
            });
            
            // Add click handler
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
