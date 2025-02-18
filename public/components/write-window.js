import { WindowElement } from './window.js';

export class WriteWindow extends WindowElement {
    constructor() {
        super();
        this._width = 450;
        this._height = 300;
        this._messages = [];
        this._input = null;
        this._messageLog = null;
    }

    connectedCallback() {
        // Set attributes before rendering
        this.setAttribute('title', 'write');
        
        // Set dimensions
        this.style.width = `${this._width}px`;
        this.style.height = `${this._height}px`;
        
        // Call parent's connectedCallback
        super.connectedCallback();
        
        // Setup write functionality
        this._setupWrite();
    }

    _setupWrite() {
        // Get write template
        const template = document.getElementById('write-content');
        if (!template) {
            console.error('Write content template not found');
            return;
        }

        const content = template.content.cloneNode(true);
        
        // Add write-specific styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                background-color: var(--color-base3, #fdf6e3);
            }

            .message-log {
                flex: 1;
                overflow-y: auto;
                font-family: var(--alternative-font, sans-serif);
                font-size: 0.8rem;
                margin-bottom: 0.5rem;
                padding: 0.5rem;
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 8px;
            }

            .log-entry {
                margin-bottom: 0.5rem;
                line-height: 1.4;
            }

            .user-info {
                font-family: var(--main-font, sans-serif);
                color: #777;
                font-size: 0.8rem;
            }

            .user-message {
                margin-left: 0.25rem;
            }

            .message-input {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background-color: #fff;
                padding: 0.5rem;
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .input-prefix {
                font-family: var(--main-font, sans-serif);
                color: #777;
                font-size: 0.8rem;
                user-select: none;
            }

            input {
                flex: 1;
                border: none;
                outline: none;
                background: transparent;
                font-family: var(--alternative-font, sans-serif);
                font-size: 0.8rem;
                min-width: 0;
            }

            .send-message {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .send-message:hover {
                opacity: 1;
            }

            .send-message img {
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

        // Setup message handling after content is in DOM
        requestAnimationFrame(() => {
            this._setupMessageHandling();
        });
    }

    _setupMessageHandling() {
        this._input = this.shadowRoot.querySelector('input');
        const sendButton = this.shadowRoot.querySelector('.send-message');
        this._messageLog = this.shadowRoot.querySelector('.message-log');

        if (!this._input || !sendButton || !this._messageLog) {
            console.error('Message handling elements not found');
            return;
        }

        // Send on button click
        sendButton.addEventListener('click', () => this._sendMessage());

        // Send on enter
        this._input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._sendMessage();
            }
        });

        // Auto-focus input when window is clicked
        this.addEventListener('mousedown', () => {
            // Use requestAnimationFrame to ensure focus happens after window is brought to front
            requestAnimationFrame(() => this._input?.focus());
        });
    }

    async _sendMessage() {
        if (!this._input) return;

        const text = this._input.value.trim();
        if (text === '') return;

        // Add message to log
        this._addMessageToLog(text);
        
        // Clear input
        this._input.value = '';

        try {
            // Send to server
            const response = await fetch('/api/saveText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error('Failed to save message');

            // Dispatch message event
            this.dispatchEvent(new CustomEvent('messagesent', {
                detail: { message: text },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Error saving message:', error);
            // Could add error message to log here
            this._addMessageToLog(`Error: ${error.message}`);
        }
    }

    _addMessageToLog(text) {
        if (!this._messageLog) return;
        
        // Create message elements
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const userInfo = document.createElement('span');
        userInfo.className = 'user-info';
        userInfo.textContent = 'user$: ';
        
        const message = document.createElement('span');
        message.className = 'user-message';
        message.textContent = text;
        
        // Add to log
        entry.appendChild(userInfo);
        entry.appendChild(message);
        this._messageLog.appendChild(entry);
        
        // Scroll to bottom using requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            if (this._messageLog) {
                this._messageLog.scrollTop = this._messageLog.scrollHeight;
            }
        });
        
        // Store message
        this._messages.push(text);
    }

    // Override parent methods if needed
    _onMinimize() {
        // Add write-specific class to dock item
        super._onMinimize();
        const dockItem = document.querySelector('.dock-item:last-child');
        if (dockItem) {
            dockItem.classList.add('write-dock-item');
        }
    }

    // Clean up
    disconnectedCallback() {
        super.disconnectedCallback();
        this._input = null;
        this._messageLog = null;
    }
}

// Register the component
customElements.define('write-window', WriteWindow);
