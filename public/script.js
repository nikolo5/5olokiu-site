/* -------------------------------------
   GLOBAL: Z-Index Management
--------------------------------------*/
let topZIndex = 1;

/* -------------------------------------
   DRAWING BOX FUNCTIONALITY
--------------------------------------*/
const drawingCanvas = document.getElementById('drawing-canvas');
const drawingCtx = drawingCanvas ? drawingCanvas.getContext('2d') : null;

function resizeDrawingCanvas() {
  if (!drawingCanvas) return;
  const box = document.getElementById('box-drawing');
  const dragBarHeight = box.querySelector('.drag-bar').offsetHeight;
  const width = box.clientWidth;
  const height = box.clientHeight - dragBarHeight;
  const dpr = window.devicePixelRatio || 1;

  // Set CSS display size
  drawingCanvas.style.width = width + 'px';
  drawingCanvas.style.height = height + 'px';

  // Set internal resolution
  drawingCanvas.width = width * dpr;
  drawingCanvas.height = height * dpr;

  drawingCtx.setTransform(1, 0, 0, 1, 0, 0);
  drawingCtx.scale(dpr, dpr);
  drawingCtx.lineWidth = 2;
  drawingCtx.lineCap = 'round';
  drawingCtx.lineJoin = 'round';
}

if (drawingCanvas) {
  window.addEventListener('resize', resizeDrawingCanvas);
  resizeDrawingCanvas();

  let drawing = false;
  function getDrawingPos(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function startDrawing(e) {
    drawing = true;
    drawingCtx.beginPath();
    const pos = getDrawingPos(e);
    drawingCtx.moveTo(pos.x, pos.y);
  }
  function draw(e) {
    if (!drawing) return;
    const pos = getDrawingPos(e);
    drawingCtx.lineTo(pos.x, pos.y);
    drawingCtx.stroke();
  }
  function stopDrawing() {
    drawing = false;
  }

  drawingCanvas.addEventListener('mousedown', startDrawing);
  drawingCanvas.addEventListener('mousemove', draw);
  drawingCanvas.addEventListener('mouseup', stopDrawing);
  drawingCanvas.addEventListener('mouseout', stopDrawing);

  // Restart and Send buttons
  const restartButton = document.querySelector('#box-drawing .restart-button');
  const sendButton = document.querySelector('#box-drawing .send-button');
  restartButton.addEventListener('click', () => {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  });
  sendButton.addEventListener('click', async () => {
    const dataURL = drawingCanvas.toDataURL('image/png');
    try {
      const response = await fetch('/api/saveDrawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL })
      });
      const result = await response.json();
      if (response.ok) {
        alert('Your drawing has been saved!');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Error sending drawing!');
      console.error(error);
    }
  });
}

/* -------------------------------------
   DRAGGABLE & MINIMIZABLE BOXES
--------------------------------------*/
document.querySelectorAll('.movable-box').forEach(box => {
  const dragBar = box.querySelector('.drag-bar');

  // Bring box to front on any mousedown
  box.addEventListener('mousedown', () => {
    topZIndex++;
    box.style.zIndex = topZIndex;
  });

  // Draggable logic
  dragBar.addEventListener('mousedown', function(e) {
    e.preventDefault();

    // Bring this box to the front
    topZIndex++;
    box.style.zIndex = topZIndex;

    const rect = box.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    function drag(e) {
      // Calculate the new position
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // Get viewport dimensions
      const maxLeft = window.innerWidth - box.offsetWidth;
      const maxTop = window.innerHeight - box.offsetHeight;

      // Constrain the box within the viewport
      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop > maxTop) newTop = maxTop;

      // Apply the new, clamped position
      box.style.left = newLeft + 'px';
      box.style.top = newTop + 'px';

      // Remove any initial transform
      box.style.transform = 'none';
    }

    function stopDrag() {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  });

  // Close icon -> minimize
  const closeIcon = box.querySelector('.close-icon');
  closeIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    minimizeBox(box);
  });
});

/**
 * Minimizes the box (hides it, creates a small representation at the bottom).
 */
function minimizeBox(box) {
  box.style.display = 'none';
  const minimizedContainer = document.querySelector('.minimized-container');

  // Create a minimized "icon" for the box
  const miniBox = document.createElement('div');
  miniBox.classList.add('minimized-box');
  miniBox.innerText = box.id.replace('box-', ''); // e.g. "green", "blue", etc.

  // Restore box on click
  miniBox.addEventListener('click', () => {
    box.style.display = 'block';
    minimizedContainer.removeChild(miniBox);

    // If it's the drawing box, re-size the canvas on restore
    if (box.id === 'box-drawing') {
      resizeDrawingCanvas();
    }

    // Bring the reopened box to front
    topZIndex++;
    box.style.zIndex = topZIndex;
  });

  minimizedContainer.appendChild(miniBox);
}