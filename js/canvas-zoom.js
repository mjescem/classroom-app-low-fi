// Excalidraw Pan & Zoom Whiteboard Engine
class ExcalidrawCanvas {
  constructor() {
    this.viewport = document.getElementById('canvasViewport');
    this.content = document.getElementById('canvasContent');
    
    // Zoom & Pan state
    this.scale = 1;
    this.minScale = 0.2;
    this.maxScale = 3.0;
    this.panX = 0;
    this.panY = 0;
    
    // Drag/Pan tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.isSpacePressed = false;
    this.activeTool = 'pan'; // 'select' | 'pan'
    
    this.init();
  }

  init() {
    if (!this.viewport || !this.content) return;

    // Center content initially based on screen size
    this.centerContent();

    // Event listeners for Pan & Zoom
    this.bindMouseEvents();
    this.bindKeyboardEvents();
    this.bindControls();
    this.bindTouchEvents();

    // Window resize
    window.addEventListener('resize', () => this.updateTransform());
  }

  centerContent() {
    const viewportWidth = window.innerWidth;
    const contentWidth = 1420; // content max-width
    if (viewportWidth < contentWidth) {
      // Auto-fit if screen is smaller
      this.scale = Math.max(0.45, (viewportWidth - 40) / contentWidth);
      this.panX = Math.max(20, (viewportWidth - contentWidth * this.scale) / 2);
    } else {
      this.scale = 1;
      this.panX = (viewportWidth - contentWidth) / 2;
    }
    this.panY = 40;
    this.updateTransform();
  }

  updateTransform() {
    // Apply transform to content container
    this.content.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    
    // Sync background grid position & scale
    const gridSize = 24 * this.scale;
    const bgPosX = this.panX % gridSize;
    const bgPosY = this.panY % gridSize;
    document.body.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    document.body.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

    // Update zoom label in UI
    const zoomLevelEl = document.getElementById('zoomLevelDisplay');
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  zoomAt(delta, clientX, clientY) {
    const prevScale = this.scale;
    const zoomFactor = delta < 0 ? 1.12 : 0.89;
    let newScale = this.scale * zoomFactor;
    newScale = Math.min(Math.max(newScale, this.minScale), this.maxScale);

    if (newScale === prevScale) return;

    // Zoom anchored to mouse cursor coordinates
    const rect = this.viewport.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    this.panX = mouseX - (mouseX - this.panX) * (newScale / prevScale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / prevScale);
    this.scale = newScale;

    this.updateTransform();
  }

  setZoom(targetScale) {
    const prevScale = this.scale;
    this.scale = Math.min(Math.max(targetScale, this.minScale), this.maxScale);
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    this.panX = centerX - (centerX - this.panX) * (this.scale / prevScale);
    this.panY = centerY - (centerY - this.panY) * (this.scale / prevScale);

    this.updateTransform();
  }

  fitToScreen() {
    const viewportWidth = window.innerWidth - 60;
    const viewportHeight = window.innerHeight - 80;
    const contentWidth = 1420;
    const contentHeight = 1750;

    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.0);

    this.panX = (window.innerWidth - contentWidth * this.scale) / 2;
    this.panY = 40;
    this.updateTransform();
  }

  bindMouseEvents() {
    // Wheel zoom
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom
        this.zoomAt(e.deltaY, e.clientX, e.clientY);
      } else {
        // Standard wheel zoom
        this.zoomAt(e.deltaY, e.clientX, e.clientY);
      }
    }, { passive: false });

    // Pan on mouse drag
    this.viewport.addEventListener('mousedown', (e) => {
      // Allow drag if middle mouse button, spacebar is held, or clicking canvas background/board
      const isInteractiveElement = e.target.closest('button, input, textarea, a');
      if (isInteractiveElement && !this.isSpacePressed && e.button !== 1) return;

      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.viewport.style.cursor = this.isSpacePressed ? 'grab' : 'default';
      }
    });

    // Double click on background to fit
    this.viewport.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.phone-wireframe, button, input')) {
        this.fitToScreen();
      }
    });
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.isSpacePressed = true;
        this.viewport.style.cursor = 'grab';
        e.preventDefault();
      }
      
      // Ctrl + 0: Reset to 100%
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        this.setZoom(1);
      }

      // Ctrl + 1: Fit to screen
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        this.fitToScreen();
      }

      // '+' or '=' to zoom in
      if ((e.key === '+' || e.key === '=') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.setZoom(this.scale * 1.15);
      }

      // '-' to zoom out
      if (e.key === '-' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.setZoom(this.scale * 0.85);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.viewport.style.cursor = 'default';
      }
    });
  }

  bindTouchEvents() {
    let initialDistance = 0;
    let initialScale = 1;

    this.viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = this.scale;
      } else if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX - this.panX;
        this.dragStartY = e.touches[0].clientY - this.panY;
      }
    }, { passive: true });

    this.viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDistance / initialDistance;
        this.scale = Math.min(Math.max(initialScale * factor, this.minScale), this.maxScale);
        this.updateTransform();
      } else if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - this.dragStartX;
        this.panY = e.touches[0].clientY - this.dragStartY;
        this.updateTransform();
      }
    }, { passive: true });

    this.viewport.addEventListener('touchend', () => {
      this.isDragging = false;
      initialDistance = 0;
    });
  }

  bindControls() {
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomReset = document.getElementById('btnZoomReset');
    const btnFitScreen = document.getElementById('btnFitScreen');

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => this.setZoom(this.scale * 0.85));
    }

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => this.setZoom(this.scale * 1.15));
    }

    if (btnZoomReset) {
      btnZoomReset.addEventListener('click', () => this.setZoom(1.0));
    }

    if (btnFitScreen) {
      btnFitScreen.addEventListener('click', () => this.fitToScreen());
    }
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.excalidrawCanvas = new ExcalidrawCanvas();
});
