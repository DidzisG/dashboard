export function initWindowManager(state, saveCallback) {
  const container = document.getElementById('main-content');
  const dashboardGrid = document.querySelector('.dashboard-grid');
  
  if (!dashboardGrid || !state.layout) return;

  const widgets = Array.from(dashboardGrid.querySelectorAll('.widget'));
  
  // Apply initial layout
  widgets.forEach(widget => {
    const id = widget.id;
    const layout = state.layout[id];
    if (layout) {
      widget.style.left = `${layout.x}px`;
      widget.style.top = `${layout.y}px`;
      widget.style.width = `${layout.w}px`;
      widget.style.height = `${layout.h}px`;
      widget.style.zIndex = layout.z || 1;
    }
  });

  let draggedWidget = null;
  let offsetX = 0;
  let offsetY = 0;
  let resizingWidget = null;
  let startW = 0;
  let startH = 0;
  let startX = 0;
  let startY = 0;
  
  // Bring to front logic
  function bringToFront(widget) {
    let maxZ = 0;
    widgets.forEach(w => {
      const z = parseInt(window.getComputedStyle(w).zIndex || 1);
      if (z > maxZ) maxZ = z;
    });
    widget.style.zIndex = maxZ + 1;
  }

  // Setup drag headers
  widgets.forEach(widget => {
    const header = widget.querySelector('.widget-header');
    if (header) {
      header.style.cursor = 'grab';
      header.addEventListener('mousedown', (e) => {
        // Prevent drag if clicking on buttons
        if (e.target.closest('button')) return;
        
        bringToFront(widget);
        draggedWidget = widget;
        const rect = widget.getBoundingClientRect();
        const gridRect = dashboardGrid.getBoundingClientRect();
        
        // Offset relative to the widget's current absolute position
        offsetX = e.clientX - rect.left + gridRect.left;
        offsetY = e.clientY - rect.top + gridRect.top;
        
        header.style.cursor = 'grabbing';
      });
    }

    // Setup resize handles
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    widget.appendChild(resizeHandle);

    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      bringToFront(widget);
      resizingWidget = widget;
      startW = widget.offsetWidth;
      startH = widget.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
    });
    
    // Add click to focus
    widget.addEventListener('mousedown', () => {
      if (draggedWidget !== widget && resizingWidget !== widget) {
        bringToFront(widget);
      }
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (draggedWidget) {
      const gridRect = dashboardGrid.getBoundingClientRect();
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;
      
      // Basic bounds checking (don't go off top/left)
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      
      draggedWidget.style.left = `${newX}px`;
      draggedWidget.style.top = `${newY}px`;
    } else if (resizingWidget) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      let newW = Math.max(300, startW + dx); // minimum width
      let newH = Math.max(200, startH + dy); // minimum height
      
      resizingWidget.style.width = `${newW}px`;
      resizingWidget.style.height = `${newH}px`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (draggedWidget || resizingWidget) {
      if (draggedWidget) {
        const header = draggedWidget.querySelector('.widget-header');
        if (header) header.style.cursor = 'grab';
      }
      
      // Save state
      widgets.forEach(w => {
        const id = w.id;
        state.layout[id] = {
          x: parseInt(w.style.left || 0),
          y: parseInt(w.style.top || 0),
          w: parseInt(w.style.width || w.offsetWidth),
          h: parseInt(w.style.height || w.offsetHeight),
          z: parseInt(w.style.zIndex || 1)
        };
      });
      saveCallback('layout', state.layout);
      
      draggedWidget = null;
      resizingWidget = null;
    }
  });
}
