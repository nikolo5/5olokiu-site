/* -------------------------------------
   GLOBAL: Z-Index Management
--------------------------------------*/
let topZIndex = 1;

/* -------------------------------------
   DRAGGABLE & MINIMIZABLE BEHAVIOR
--------------------------------------*/
// Apply draggable behavior to both draw box and nav box
document.querySelectorAll('.movable-box, .movable-nav').forEach(box => {
  const dragBar = box.querySelector('.drag-bar');
  // Bring box to front on any mousedown
  box.addEventListener('mousedown', () => {
    topZIndex++;
    box.style.zIndex = topZIndex;
  });
  // Draggable logic
  dragBar.addEventListener('mousedown', function(e) {
    e.preventDefault();
    topZIndex++;
    box.style.zIndex = topZIndex;
    const rect = box.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    function drag(e) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      // Constrain to viewport
      const maxLeft = window.innerWidth - box.offsetWidth;
      const maxTop = window.innerHeight - box.offsetHeight;
      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop > maxTop) newTop = maxTop;
      box.style.left = newLeft + 'px';
      box.style.top = newTop + 'px';
      box.style.transform = 'none';
    }
    function stopDrag() {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  });
  
  // For draw box, add minimise button functionality; for nav box, do nothing
  if (box.classList.contains('movable-box')) {
    const minimiseIcon = box.querySelector('.minimise-icon');
    if (minimiseIcon) {
      minimiseIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        minimizeBox(box);
      });
    }
  }
});

/* Minimize function for draw box */
function minimizeBox(box) {
  box.style.display = 'none';
  const minimizedContainer = document.querySelector('.minimized-container');
  const miniBox = document.createElement('div');
  miniBox.classList.add('minimized-box');
  miniBox.innerText = "";
  minimizedContainer.appendChild(miniBox);
  miniBox.addEventListener('click', () => {
    box.style.display = 'block';
    minimizedContainer.removeChild(miniBox);
    if (box.id === 'box-drawing') {
      resizeDrawingCanvas();
    }
    topZIndex++;
    box.style.zIndex = topZIndex;
  });
}

/* Drawing Box Functionality */
const drawingCanvas = document.getElementById('drawing-canvas');
const drawingCtx = drawingCanvas ? drawingCanvas.getContext('2d') : null;
function resizeDrawingCanvas() {
  if (!drawingCanvas) return;
  const box = document.getElementById('box-drawing');
  const dragBarHeight = box.querySelector('.drag-bar').offsetHeight;
  const width = box.clientWidth;
  const height = box.clientHeight - dragBarHeight;
  const dpr = window.devicePixelRatio || 1;
  drawingCanvas.style.width = width + 'px';
  drawingCanvas.style.height = height + 'px';
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
  document.addEventListener('DOMContentLoaded', () => {
    // Get the current page filename; if empty, default to "index.html"
    let currentPage = window.location.pathname.split('/').pop();
    if (!currentPage) {
      currentPage = 'index.html';
    }
    
    // For links inside the nav box
    document.querySelectorAll('.movable-nav nav a').forEach(link => {
      // Remove any leading slash for matching
      const href = link.getAttribute('href').replace(/^\//, '');
      if (href === currentPage) {
        link.classList.add('active');
      }
    });
  });
}