// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON in request body
app.use(bodyParser.json({ limit: '10mb' }));

// Serve static files (HTML, CSS, JS) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to save the drawing
app.post('/api/saveDrawing', (req, res) => {
  try {
    // The base64-encoded image data from the client
    const imageData = req.body.image;

    // Remove the prefix (data:image/png;base64,) if present
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

    // Generate a filename based on current timestamp
    const timestamp = Date.now();
    const filename = `drawing-${timestamp}.png`;

    // Create a path to the drawings folder
    const filepath = path.join(__dirname, 'drawings', filename);

    // Write the base64 file to disk
    fs.writeFileSync(filepath, base64Data, 'base64');

    res.json({ success: true, message: 'Drawing saved.', filename });
  } catch (err) {
    console.error('Error saving drawing:', err);
    res.status(500).json({ success: false, message: 'Error saving drawing.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});