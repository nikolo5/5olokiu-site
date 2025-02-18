import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoints
app.post('/api/saveDrawing', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Remove the data URL prefix
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create timestamp for unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `drawing-${timestamp}.png`;

        // Ensure drawings directory exists
        const drawingsDir = path.join(__dirname, 'drawings');
        await fs.mkdir(drawingsDir, { recursive: true });

        // Save the file
        await fs.writeFile(path.join(drawingsDir, filename), buffer);

        res.json({ success: true, filename });
    } catch (error) {
        console.error('Error saving drawing:', error);
        res.status(500).json({ error: 'Failed to save drawing' });
    }
});

app.post('/api/saveText', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'No message provided' });
        }

        // Create timestamp
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${message}\n`;

        // Ensure texts directory exists
        const textsDir = path.join(__dirname, 'texts');
        await fs.mkdir(textsDir, { recursive: true });

        // Append to log file
        const logFile = path.join(textsDir, 'messages.log');
        await fs.appendFile(logFile, entry);

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Serve other pages
['images', 'blog', 'projects', 'about', 'contact'].forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
