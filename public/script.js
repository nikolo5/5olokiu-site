/***************************************
  GRID SYSTEM AND POSITIONING
****************************************/
class GridSystem {
  constructor() {
    this.container = document.querySelector('.grid-container');
    this.cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell'));
    this.goldenRatio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--golden-ratio'));
    this.minSpacing = 20; // Minimum pixels between boxes
    this.setupGrid();
  }

  setupGrid() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.cols = Math.floor(rect.width / this.cellSize);
    this.rows = Math.floor(rect.height / this.cellSize);
    this.width = rect.width;
    this.height = rect.height;
  }

  // Get nearest grid point
  getNearestGridPoint(x, y) {
    const col = Math.round(x / this.cellSize);
    const row = Math.round(y / this.cellSize);
    return {
      x: Math.max(0, Math.min(col * this.cellSize, this.width - this.cellSize)),
      y: Math.max(0, Math.min(row * this.cellSize, this.height - this.cellSize))
    };
  }

  // Get initial positions based on golden ratio
  getInitialPositions() {
    const containerRect = this.container.getBoundingClientRect();
    const navWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-box-width'));
    const drawWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--square-box-size'));
    const writeWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--wide-box-width'));
    
    // Calculate positions to ensure no overlap and proper spacing
    return {
      nav: {
        x: containerRect.width * 0.15,
        y: containerRect.height * 0.2
      },
      draw: {
        x: containerRect.width * 0.4,
        y: containerRect.height * 0.25
      },
      write: {
        x: containerRect.width * 0.65,
        y: containerRect.height * 0.45
      }
    };
  }
}

/***************************************
  DRAGGABLE BOX MANAGER
****************************************/
class DraggableBox {
  constructor(element, grid) {
    this.element = element;
    this.grid = grid;
    this.dragBar = element.querySelector('.drag-bar');
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.dragBar) return;

    this.dragBar.addEventListener('mousedown', (e) => this.startDragging(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDragging());

    // Bring to front on click
    this.element.addEventListener('mousedown', () => {
      topZIndex++;
      this.element.style.zIndex = topZIndex;
    });

    // Handle minimize
    const closeIcon = this.element.querySelector('.close-icon');
    if (closeIcon) {
      closeIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimize();
      });
    }
  }

  startDragging(e) {
    if (!this.element) return;
    
    this.isDragging = true;
    const rect = this.element.getBoundingClientRect();
    const containerRect = this.grid.container.getBoundingClientRect();
    
    this.startX = e.clientX - (rect.left - containerRect.left);
    this.startY = e.clientY - (rect.top - containerRect.top);
    
    this.element.style.transition = 'none';
    topZIndex++;
    this.element.style.zIndex = topZIndex;
  }

  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const containerRect = this.grid.container.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - this.startX;
    let newY = e.clientY - containerRect.top - this.startY;

    // Get nearest grid point
    const gridPoint = this.grid.getNearestGridPoint(newX, newY);

    // Apply soft attraction to grid points
    const attractionStrength = 0.3;
    newX = newX + (gridPoint.x - newX) * attractionStrength;
    newY = newY + (gridPoint.y - newY) * attractionStrength;

    // Constrain to container with padding
    const padding = 10;
    const maxX = containerRect.width - this.element.offsetWidth - padding;
    const maxY = containerRect.height - this.element.offsetHeight - padding;
    
    newX = Math.max(padding, Math.min(newX, maxX));
    newY = Math.max(padding, Math.min(newY, maxY));

    // Check spacing with other boxes
    const otherBoxes = Array.from(document.querySelectorAll('.movable-box, .movable-nav'))
      .filter(box => box !== this.element);

    otherBoxes.forEach(otherBox => {
      const otherRect = otherBox.getBoundingClientRect();
      const thisRect = this.element.getBoundingClientRect();
      
      // Horizontal spacing
      if (Math.abs(newX - (otherRect.left - containerRect.left)) < this.grid.minSpacing) {
        newX = otherRect.left - containerRect.left + 
          (newX > otherRect.left - containerRect.left ? this.grid.minSpacing : -this.grid.minSpacing - thisRect.width);
      }
      
      // Vertical spacing
      if (Math.abs(newY - (otherRect.top - containerRect.top)) < this.grid.minSpacing) {
        newY = otherRect.top - containerRect.top +
          (newY > otherRect.top - containerRect.top ? this.grid.minSpacing : -this.grid.minSpacing - thisRect.height);
      }
    });

    this.currentX = newX;
    this.currentY = newY;
    
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  }

  stopDragging() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.element.style.transition = `transform ${parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--transition-speed'))}s ease-out`;
    
    // Snap to nearest grid point
    const gridPoint = this.grid.getNearestGridPoint(this.currentX, this.currentY);
    this.element.style.left = `${gridPoint.x}px`;
    this.element.style.top = `${gridPoint.y}px`;
  }

  minimize() {
    this.element.style.display = 'none';
    const minimizedContainer = document.querySelector('.minimized-container');
    const miniBox = document.createElement('div');
    miniBox.classList.add('minimized-box');
    miniBox.style.backgroundColor = window.getComputedStyle(this.element).backgroundColor;
    minimizedContainer.appendChild(miniBox);
    
    miniBox.addEventListener('click', () => {
      this.element.style.display = 'block';
      minimizedContainer.removeChild(miniBox);
      topZIndex++;
      this.element.style.zIndex = topZIndex;
    });
  }

  setPosition(x, y) {
    if (!this.element) return;
    this.currentX = x;
    this.currentY = y;
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
}

/***************************************
  INITIALIZATION
****************************************/
let topZIndex = 1;
let grid;
let boxes = [];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize grid system
  grid = new GridSystem();

  // Initialize boxes
  const navBox = document.querySelector('.movable-nav');
  const drawBox = document.getElementById('box-drawing');
  const writeBox = document.getElementById('box-write');

  if (navBox && drawBox && writeBox) {
    boxes = [
      new DraggableBox(navBox, grid),
      new DraggableBox(drawBox, grid),
      new DraggableBox(writeBox, grid)
    ];

    // Set initial positions
    const positions = grid.getInitialPositions();
    boxes[0].setPosition(positions.nav.x, positions.nav.y);
    boxes[1].setPosition(positions.draw.x, positions.draw.y);
    boxes[2].setPosition(positions.write.x, positions.write.y);
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    grid.setupGrid();
    // Ensure boxes stay within bounds after resize
    boxes.forEach(box => {
      const rect = box.element.getBoundingClientRect();
      const containerRect = grid.container.getBoundingClientRect();
      const maxX = containerRect.width - rect.width;
      const maxY = containerRect.height - rect.height;
      
      let newX = parseFloat(box.element.style.left);
      let newY = parseFloat(box.element.style.top);
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      box.setPosition(newX, newY);
    });
  });

  // Initialize canvas
  const canvas = document.getElementById('drawing-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const box = document.getElementById('box-drawing');
    const dragBarHeight = box.querySelector('.drag-bar').offsetHeight;
    
    function resizeCanvas() {
      const width = box.clientWidth;
      const height = box.clientHeight - dragBarHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
});
