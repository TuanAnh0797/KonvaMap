// Advanced features for Map Drawing Application
// NOTE: This file should be loaded AFTER map.js

// Wait for stage to be initialized
function initAdvancedFeatures() {
    if (typeof stage === 'undefined' || !stage) {
        console.log('Waiting for stage initialization...');
        setTimeout(initAdvancedFeatures, 100);
        return;
    }

    console.log('Initializing advanced features...');
    setupAdvancedFeatures();
}

function setupAdvancedFeatures() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Delete selected object with Delete key
        if (e.key === 'Delete' && selectedShape) {
            $('#deleteBtn').click();
        }

        // Deselect with Escape
        if (e.key === 'Escape') {
            if (transformer) {
                transformer.nodes([]);
                selectedShape = null;
                layer.draw();
            }
        }

        // Save with Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            $('#saveBtn').click();
        }
    });

    // Mouse wheel zoom
    if (stage) {
        stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const oldScale = stage.scaleX();
            const pointer = stage.getPointerPosition();

            const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
            };

            const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;

            const scale = Math.max(0.3, Math.min(3, newScale));
            stage.scale({ x: scale, y: scale });

            const newPos = {
                x: pointer.x - mousePointTo.x * scale,
                y: pointer.y - mousePointTo.y * scale,
            };
            stage.position(newPos);
            layer.draw();
        });
    }
}

// Export map as image
function exportMapAsImage() {
    if (!stage) {
        alert('Stage not initialized');
        return;
    }
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'map_export_' + new Date().getTime() + '.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    updateStatus('Map exported as image');
}

// Export map as JSON
function exportMapAsJSON() {
    if (!stage) {
        alert('Stage not initialized');
        return;
    }
    const json = stage.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'map_export_' + new Date().getTime() + '.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    updateStatus('Map exported as JSON');
}

// Import map from JSON
function importMapFromJSON(jsonString) {
    try {
        const json = JSON.parse(jsonString);
        stage = Konva.Node.create(json, 'container');
        layer = stage.children[0];

        // Re-setup transformer
        transformer = new Konva.Transformer({
            rotateEnabled: true,
            borderStroke: '#0d6efd',
            borderStrokeWidth: 2
        });
        layer.add(transformer);

        // Re-setup events for all shapes
        layer.children.forEach(shape => {
            if (shape !== transformer) {
                setupShapeEvents(shape);
            }
        });

        layer.draw();
        updateStatus('Map imported successfully');
    } catch (error) {
        console.error('Import error:', error);
        updateStatus('Error importing map', 'error');
    }
}

// Grid snap functionality
let snapToGrid = false;
const gridSize = 20;

function toggleGridSnap() {
    snapToGrid = !snapToGrid;
    updateStatus(snapToGrid ? 'Grid snap enabled' : 'Grid snap disabled');
}

function snapToGridPoint(pos) {
    if (!snapToGrid) return pos;
    return {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize
    };
}

// Zoom functionality
let scale = 1;

function zoomIn() {
    if (!stage) return;
    scale = Math.min(scale * 1.2, 3);
    stage.scale({ x: scale, y: scale });
    layer.draw();
    updateStatus('Zoomed in: ' + Math.round(scale * 100) + '%');
}

function zoomOut() {
    if (!stage) return;
    scale = Math.max(scale / 1.2, 0.3);
    stage.scale({ x: scale, y: scale });
    layer.draw();
    updateStatus('Zoomed out: ' + Math.round(scale * 100) + '%');
}

function resetZoom() {
    if (!stage) return;
    scale = 1;
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    layer.draw();
    updateStatus('Zoom reset');
}

// Copy and paste functionality
let copiedShape = null;

function copySelectedShape() {
    if (selectedShape) {
        copiedShape = selectedShape.clone();
        updateStatus('Object copied');
    }
}

function pasteShape() {
    if (copiedShape && layer) {
        const newShape = copiedShape.clone();
        newShape.position({
            x: copiedShape.x() + 20,
            y: copiedShape.y() + 20
        });

        setupShapeEvents(newShape);
        layer.add(newShape);
        layer.draw();

        saveObjectToDatabase(newShape, newShape.getClassName().toLowerCase());
        updateStatus('Object pasted');
    }
}

// Undo/Redo functionality (simplified version)
const history = [];
let historyStep = -1;

function saveHistory() {
    if (!stage) return;
    if (historyStep < history.length - 1) {
        history.splice(historyStep + 1);
    }
    history.push(stage.toJSON());
    historyStep++;

    // Limit history to 50 steps
    if (history.length > 50) {
        history.shift();
        historyStep--;
    }
}

function undo() {
    if (!stage || historyStep <= 0) return;
    historyStep--;
    restoreHistory();
    updateStatus('Undo');
}

function redo() {
    if (!stage || historyStep >= history.length - 1) return;
    historyStep++;
    restoreHistory();
    updateStatus('Redo');
}

function restoreHistory() {
    if (!history[historyStep]) return;
    const json = history[historyStep];
    stage = Konva.Node.create(json, 'container');
    layer = stage.children[0];

    transformer = new Konva.Transformer();
    layer.add(transformer);

    layer.children.forEach(shape => {
        if (shape !== transformer) {
            setupShapeEvents(shape);
        }
    });

    layer.draw();
}

// Layer management
function bringToFront() {
    if (selectedShape && layer) {
        selectedShape.moveToTop();
        transformer.moveToTop();
        layer.draw();
        updateObjectInDatabase(selectedShape);
        updateStatus('Brought to front');
    }
}

function sendToBack() {
    if (selectedShape && layer) {
        selectedShape.moveToBottom();
        layer.draw();
        updateObjectInDatabase(selectedShape);
        updateStatus('Sent to back');
    }
}

// Alignment tools
function alignLeft() {
    if (!transformer || !layer) return;
    const nodes = transformer.nodes();
    if (nodes.length < 2) return;

    const minX = Math.min(...nodes.map(n => n.x()));
    nodes.forEach(node => {
        node.x(minX);
        updateObjectInDatabase(node);
    });
    layer.draw();
    updateStatus('Aligned left');
}

function alignCenter() {
    if (!transformer || !layer) return;
    const nodes = transformer.nodes();
    if (nodes.length < 2) return;

    const avgX = nodes.reduce((sum, n) => sum + n.x(), 0) / nodes.length;
    nodes.forEach(node => {
        node.x(avgX);
        updateObjectInDatabase(node);
    });
    layer.draw();
    updateStatus('Aligned center');
}

function alignRight() {
    if (!transformer || !layer) return;
    const nodes = transformer.nodes();
    if (nodes.length < 2) return;

    const maxX = Math.max(...nodes.map(n => n.x()));
    nodes.forEach(node => {
        node.x(maxX);
        updateObjectInDatabase(node);
    });
    layer.draw();
    updateStatus('Aligned right');
}

// Distribution tools
function distributeHorizontally() {
    if (!transformer || !layer) return;
    const nodes = transformer.nodes();
    if (nodes.length < 3) return;

    nodes.sort((a, b) => a.x() - b.x());
    const totalWidth = nodes[nodes.length - 1].x() - nodes[0].x();
    const spacing = totalWidth / (nodes.length - 1);

    nodes.forEach((node, i) => {
        node.x(nodes[0].x() + spacing * i);
        updateObjectInDatabase(node);
    });
    layer.draw();
    updateStatus('Distributed horizontally');
}

function distributeVertically() {
    if (!transformer || !layer) return;
    const nodes = transformer.nodes();
    if (nodes.length < 3) return;

    nodes.sort((a, b) => a.y() - b.y());
    const totalHeight = nodes[nodes.length - 1].y() - nodes[0].y();
    const spacing = totalHeight / (nodes.length - 1);

    nodes.forEach((node, i) => {
        node.y(nodes[0].y() + spacing * i);
        updateObjectInDatabase(node);
    });
    layer.draw();
    updateStatus('Distributed vertically');
}

// Search functionality
function searchObjects(query) {
    if (!layer) return [];
    const results = [];
    layer.children.forEach(shape => {
        if (shape === transformer) return;

        const name = shape.getAttr('objectName') || '';
        const description = shape.getAttr('objectDescription') || '';

        if (name.toLowerCase().includes(query.toLowerCase()) ||
            description.toLowerCase().includes(query.toLowerCase())) {
            results.push(shape);
        }
    });

    return results;
}

// Statistics
function getMapStatistics() {
    if (!layer) return { total: 0, byType: {} };

    const stats = {
        total: 0,
        byType: {}
    };

    layer.children.forEach(shape => {
        if (shape === transformer) return;

        stats.total++;
        const type = shape.getClassName();
        stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
}

// Export functions for use in HTML
window.mapAdvancedFunctions = {
    exportMapAsImage,
    exportMapAsJSON,
    importMapFromJSON,
    toggleGridSnap,
    zoomIn,
    zoomOut,
    resetZoom,
    copySelectedShape,
    pasteShape,
    undo,
    redo,
    bringToFront,
    sendToBack,
    alignLeft,
    alignCenter,
    alignRight,
    distributeHorizontally,
    distributeVertically,
    searchObjects,
    getMapStatistics
};

// Initialize when document is ready
$(document).ready(function () {
    initAdvancedFeatures();
});

console.log('map-advanced.js loaded');