import { WindowElement } from './window.js';

export class NavWindow extends WindowElement {
    constructor() {
        super();
        this._width = 200;
        this._height = 300;
        this._nav = null;
    }

    connectedCallback() {
        // Set attributes before rendering
        this.setAttribute('title', 'nav');
        
        // Set dimensions
        this.style.width = `${this._width}px`;
        this.style.height = `${this._height}px`;
        
        // Call parent's connectedCallback
        super.connectedCallback();
        
        // Setup navigation
        this._setupNavigation();
    }

    _setupNavigation() {
        // Get navigation template
        const template = document.getElementById('nav-content');
        if (!template) {
            console.error('Navigation content template not found');
            return;
        }

        const content = template.content.cloneNode(true);
        
        // Add nav-specific styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                background-color: #fff;
            }

            nav {
                padding: 0.5rem;
                height: 100%;
                overflow-y: auto;
            }

            ul {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            li {
                margin-bottom: 1rem;
            }

            a {
                text-decoration: none;
                color: #000;
                font-size: clamp(0.8rem, 2vw, 1rem);
                font-family: var(--main-font, sans-serif);
                transition: opacity 0.2s ease;
                display: block;
                padding: 0.25rem 0;
                position: relative;
            }

            a:hover {
                opacity: 0.7;
            }

            a.active {
                font-weight: bold;
            }

            a.active::before {
                content: '';
                position: absolute;
                left: -0.5rem;
                top: 50%;
                width: 0.25rem;
                height: 0.25rem;
                background-color: currentColor;
                border-radius: 50%;
                transform: translateY(-50%);
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

        // Setup navigation after content is in DOM
        requestAnimationFrame(() => {
            this._nav = this.shadowRoot.querySelector('nav');
            if (this._nav) {
                this._updateActiveLink();
                this._setupEventListeners();
            } else {
                console.error('Navigation element not found');
            }
        });
    }

    _setupEventListeners() {
        if (!this._nav) return;

        // Handle link clicks
        this._nav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            // Update active state immediately for better UX
            this._nav.querySelectorAll('a').forEach(a => {
                a.classList.remove('active');
            });
            link.classList.add('active');
        });

        // Handle navigation events
        window.addEventListener('popstate', () => this._updateActiveLink());
        window.addEventListener('pushstate', () => this._updateActiveLink());
    }

    _updateActiveLink() {
        if (!this._nav) return;

        const currentPath = window.location.pathname;
        const links = this._nav.querySelectorAll('a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (currentPath.endsWith(href)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Override parent methods if needed
    _onMinimize() {
        // Add nav-specific class to dock item
        super._onMinimize();
        const dockItem = document.querySelector('.dock-item:last-child');
        if (dockItem) {
            dockItem.classList.add('nav-dock-item');
        }
    }

    // Clean up
    disconnectedCallback() {
        super.disconnectedCallback();
        this._nav = null;
    }
}

// Register the component
customElements.define('nav-window', NavWindow);
