// ============================================
// MAP TOOLS MODULE
// Drawing Tools Management
// ============================================

/**
 * Manages drawing tools and tool states.
 * Handles tool selection, drawing operations, and tool-specific logic.
 */
const MapTools = (function () {
    'use strict';

    // ==================== STATE ====================

    let currentTool = 'select';
    let isDrawing = false;
    let currentShape = null;
    let startPos = null;

    // Polygon-specific state
    let isDrawingPolygon = false;
    let polygonPoints = [];
    let polygonLine = null;

    // Tool configuration
    const toolConfig = {
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent'
    };

    // Available tools
    const TOOLS = {
        SELECT: 'select',
        RECT: 'rect',
        CIRCLE: 'circle',
        ELLIPSE: 'ellipse',
        LINE: 'line',
        ARROW: 'arrow',
        TRIANGLE: 'triangle',
        STAR: 'star',
        POLYGON: 'polygon',
        TEXT: 'text',
        IMAGE: 'image'
    };

    // ==================== TOOL MANAGEMENT ====================

    /**
     * Set current drawing tool
     * @param {string} tool - Tool name
     * @returns {boolean} Success status
     */
    function setTool(tool) {
        // Validate tool
        if (!Object.values(TOOLS).includes(tool)) {
            console.error('❌ Invalid tool:', tool);
            return false;
        }

        // Cancel polygon if switching away from polygon tool
        if (isDrawingPolygon && tool !== TOOLS.POLYGON) {
            cancelPolygon();
        }

        // Cancel any current drawing
        if (isDrawing && tool !== currentTool) {
            cancelDrawing();
        }

        currentTool = tool;
        console.log('✓ Tool set:', tool);

        // Update cursor
        updateCursor();

        return true;
    }

    /**
     * Get current tool
     * @returns {string}
     */
    function getCurrentTool() {
        return currentTool;
    }

    /**
     * Check if a specific tool is active
     * @param {string} tool
     * @returns {boolean}
     */
    function isToolActive(tool) {
        return currentTool === tool;
    }

    /**
     * Update cursor based on current tool
     * @private
     */
    function updateCursor() {
        const stage = MapCore.getStage();
        if (!stage) return;

        const container = stage.container();

        if (currentTool === TOOLS.SELECT) {
            container.style.cursor = 'default';
        } else {
            container.style.cursor = 'crosshair';
        }
    }

    // ==================== TOOL CONFIGURATION ====================

    /**
     * Set tool stroke color
     * @param {string} color - Color value
     */
    function setStrokeColor(color) {
        if (typeof color === 'string') {
            toolConfig.stroke = color;
            console.log('✓ Stroke color:', color);
        }
    }

    /**
     * Set tool stroke width
     * @param {number} width - Width value
     */
    function setStrokeWidth(width) {
        const w = parseInt(width);
        if (!isNaN(w) && w > 0) {
            toolConfig.strokeWidth = w;
            console.log('✓ Stroke width:', w);
        }
    }

    /**
     * Set tool fill color
     * @param {string} color - Color value
     */
    function setFillColor(color) {
        if (typeof color === 'string') {
            toolConfig.fill = color;
            console.log('✓ Fill color:', color);
        }
    }

    /**
     * Get current tool configuration
     * @returns {object}
     */
    function getToolConfig() {
        return { ...toolConfig };
    }

    /**
     * Update tool configuration
     * @param {object} config - Configuration object
     */
    function updateToolConfig(config) {
        if (config.stroke !== undefined) toolConfig.stroke = config.stroke;
        if (config.strokeWidth !== undefined) toolConfig.strokeWidth = config.strokeWidth;
        if (config.fill !== undefined) toolConfig.fill = config.fill;
        console.log('✓ Tool config updated:', toolConfig);
    }

    // ==================== DRAWING OPERATIONS ====================

    /**
     * Start drawing operation
     * @param {{x: number, y: number}} stagePos - Stage position
     * @returns {boolean} Success status
     */
    function startDrawing(stagePos) {
        // Don't start if in select mode
        if (currentTool === TOOLS.SELECT) {
            return false;
        }

        // Check if position is in canvas
        if (!MapCore.isPositionInCanvas(stagePos)) {
            console.log('⚠️ Cannot draw outside canvas');
            return false;
        }

        // Convert to layer position
        const layerPos = MapCore.constrainToCanvas(stagePos);

        isDrawing = true;
        startPos = layerPos;

        // Create initial shape based on tool
        currentShape = createInitialShape(layerPos);

        if (currentShape) {
            const layer = MapCore.getLayer();
            if (layer) {
                layer.add(currentShape);
                layer.batchDraw();
            }
            console.log('→ Drawing started:', currentTool);
            return true;
        }

        return false;
    }

    /**
     * Create initial shape for drawing
     * @private
     * @param {{x: number, y: number}} layerPos
     * @returns {Konva.Shape|null}
     */
    function createInitialShape(layerPos) {
        const config = {
            ...toolConfig,
            draggable: false
        };

        switch (currentTool) {
            case TOOLS.RECT:
                return MapShapes.createRect({
                    ...config,
                    x: layerPos.x,
                    y: layerPos.y,
                    width: 0,
                    height: 0
                });

            case TOOLS.CIRCLE:
                return MapShapes.createCircle({
                    ...config,
                    x: layerPos.x,
                    y: layerPos.y,
                    radius: 0
                });

            case TOOLS.ELLIPSE:
                return MapShapes.createEllipse({
                    ...config,
                    x: layerPos.x,
                    y: layerPos.y,
                    radiusX: 0,
                    radiusY: 0
                });

            case TOOLS.LINE:
                return MapShapes.createLine({
                    ...config,
                    points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y]
                });

            case TOOLS.ARROW:
                return MapShapes.createArrow({
                    ...config,
                    points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y]
                });

            case TOOLS.TRIANGLE:
                return MapShapes.createTriangle({
                    ...config,
                    x: layerPos.x,
                    y: layerPos.y,
                    size: 0
                });

            case TOOLS.STAR:
                return MapShapes.createStar({
                    ...config,
                    x: layerPos.x,
                    y: layerPos.y,
                    innerRadius: 0,
                    outerRadius: 0
                });

            default:
                return null;
        }
    }

    /**
     * Update drawing operation
     * @param {{x: number, y: number}} stagePos - Current stage position
     */
    function updateDrawing(stagePos) {
        if (!isDrawing || !currentShape || !startPos) {
            return;
        }

        // Constrain to canvas
        const layerPos = MapCore.constrainToCanvas(stagePos);

        // Calculate deltas
        const dx = layerPos.x - startPos.x;
        const dy = layerPos.y - startPos.y;

        // Update shape based on type
        updateShapeWhileDrawing(currentShape, startPos, layerPos, dx, dy);

        const layer = MapCore.getLayer();
        if (layer) {
            layer.batchDraw();
        }
    }

    /**
     * Update shape while drawing
     * @private
     */
    function updateShapeWhileDrawing(shape, start, current, dx, dy) {
        const className = shape.getClassName();

        switch (className) {
            case 'Rect':
                shape.width(dx);
                shape.height(dy);
                break;

            case 'Circle':
                shape.radius(Math.sqrt(dx * dx + dy * dy));
                break;

            case 'Ellipse':
                shape.radiusX(Math.abs(dx));
                shape.radiusY(Math.abs(dy));
                break;

            case 'Line':
            case 'Arrow':
                shape.points([start.x, start.y, current.x, current.y]);
                break;

            case 'Star':
                const radius = Math.sqrt(dx * dx + dy * dy);
                shape.outerRadius(radius);
                shape.innerRadius(radius * 0.5);
                break;
        }

        // Handle triangle
        if (shape.getAttr('shapeType') === 'triangle') {
            const height = dy;
            const base = height * 1.1547; // Equilateral triangle ratio
            shape.points([
                start.x, start.y,
                start.x - base / 2, start.y + height,
                start.x + base / 2, start.y + height
            ]);
        }
    }

    /**
     * Finish drawing operation
     * @returns {Konva.Shape|null} The created shape or null
     */
    function finishDrawing() {
        if (!isDrawing || !currentShape) {
            return null;
        }

        isDrawing = false;
        startPos = null;

        // Check if shape has minimum size
        if (!MapShapes.hasMinimumSize(currentShape, 5)) {
            console.log('⚠️ Shape too small, canceling');
            currentShape.destroy();
            currentShape = null;

            const layer = MapCore.getLayer();
            if (layer) layer.batchDraw();

            return null;
        }

        // Make shape draggable
        currentShape.draggable(true);

        // Setup boundaries
        if (MapBoundaries) {
            MapBoundaries.setupDragBoundaries(currentShape);
        }

        const finishedShape = currentShape;
        currentShape = null;

        console.log('✓ Drawing finished:', finishedShape.getClassName());
        return finishedShape;
    }

    /**
     * Cancel current drawing operation
     */
    function cancelDrawing() {
        if (currentShape) {
            currentShape.destroy();
            currentShape = null;
        }

        isDrawing = false;
        startPos = null;

        const layer = MapCore.getLayer();
        if (layer) {
            layer.batchDraw();
        }

        console.log('→ Drawing canceled');
    }

    // ==================== POLYGON TOOL ====================

    /**
     * Handle polygon tool click
     * @param {{x: number, y: number}} stagePos
     * @returns {boolean} True if polygon was completed
     */
    function handlePolygonClick(stagePos) {
        if (!MapCore.isPositionInCanvas(stagePos)) {
            console.log('⚠️ Cannot draw polygon outside canvas');
            return false;
        }

        const layerPos = MapCore.constrainToCanvas(stagePos);

        // First click - start polygon
        if (!isDrawingPolygon) {
            startPolygon(layerPos);
            return false;
        }

        // Check if clicking near first point to close (within 10 pixels)
        const firstPoint = polygonPoints[0];
        const distance = Math.sqrt(
            Math.pow(layerPos.x - firstPoint.x, 2) +
            Math.pow(layerPos.y - firstPoint.y, 2)
        );

        if (distance < 10 && polygonPoints.length >= 3) {
            finishPolygon();
            return true;
        }

        // Add point to polygon
        addPolygonPoint(layerPos);
        return false;
    }

    /**
     * Start polygon drawing
     * @private
     */
    function startPolygon(layerPos) {
        isDrawingPolygon = true;
        polygonPoints = [layerPos];

        // Create preview line
        polygonLine = MapShapes.createLine({
            points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y],
            stroke: toolConfig.stroke,
            strokeWidth: toolConfig.strokeWidth,
            dash: [5, 5], // Dashed preview
            closed: false
        });

        const layer = MapCore.getLayer();
        if (layer) {
            layer.add(polygonLine);
            layer.batchDraw();
        }

        console.log('→ Polygon started');
    }

    /**
     * Add point to polygon
     * @private
     */
    function addPolygonPoint(layerPos) {
        polygonPoints.push(layerPos);

        // Update preview line
        const flatPoints = [];
        polygonPoints.forEach(p => {
            flatPoints.push(p.x, p.y);
        });

        if (polygonLine) {
            polygonLine.points(flatPoints);
            const layer = MapCore.getLayer();
            if (layer) layer.batchDraw();
        }

        console.log('→ Polygon point added:', polygonPoints.length);
    }

    /**
     * Update polygon preview
     * @param {{x: number, y: number}} stagePos
     */
    function updatePolygonPreview(stagePos) {
        if (!isDrawingPolygon || !polygonLine || polygonPoints.length === 0) {
            return;
        }

        const layerPos = MapCore.constrainToCanvas(stagePos);

        // Update preview with current mouse position
        const flatPoints = [];
        polygonPoints.forEach(p => {
            flatPoints.push(p.x, p.y);
        });
        flatPoints.push(layerPos.x, layerPos.y);

        polygonLine.points(flatPoints);

        const layer = MapCore.getLayer();
        if (layer) layer.batchDraw();
    }

    /**
     * Finish polygon drawing
     * @returns {Konva.Line|null}
     */
    function finishPolygon() {
        if (polygonPoints.length < 3) {
            console.log('⚠️ Polygon needs at least 3 points');
            cancelPolygon();
            return null;
        }

        // Convert points to flat array
        const flatPoints = [];
        polygonPoints.forEach(p => {
            flatPoints.push(p.x, p.y);
        });

        // Create final polygon
        const polygon = MapShapes.createPolygon(flatPoints, {
            stroke: toolConfig.stroke,
            strokeWidth: toolConfig.strokeWidth,
            fill: toolConfig.fill,
            draggable: true
        });

        // Remove preview line
        if (polygonLine) {
            polygonLine.destroy();
            polygonLine = null;
        }

        // Add to layer
        const layer = MapCore.getLayer();
        if (layer) {
            layer.add(polygon);
            layer.batchDraw();
        }

        // Setup boundaries
        if (MapBoundaries) {
            MapBoundaries.setupDragBoundaries(polygon);
        }

        // Reset state
        isDrawingPolygon = false;
        polygonPoints = [];

        console.log('✓ Polygon finished');
        return polygon;
    }

    /**
     * Cancel polygon drawing
     */
    function cancelPolygon() {
        if (polygonLine) {
            polygonLine.destroy();
            polygonLine = null;
        }

        isDrawingPolygon = false;
        polygonPoints = [];

        const layer = MapCore.getLayer();
        if (layer) layer.batchDraw();

        console.log('→ Polygon canceled');
    }

    // ==================== STATE QUERIES ====================

    /**
     * Check if currently drawing
     * @returns {boolean}
     */
    function isCurrentlyDrawing() {
        return isDrawing;
    }

    /**
     * Check if currently drawing polygon
     * @returns {boolean}
     */
    function isCurrentlyDrawingPolygon() {
        return isDrawingPolygon;
    }

    /**
     * Get current shape being drawn
     * @returns {Konva.Shape|null}
     */
    function getCurrentShape() {
        return currentShape;
    }

    /**
     * Get drawing state
     * @returns {object}
     */
    function getDrawingState() {
        return {
            tool: currentTool,
            isDrawing: isDrawing,
            hasCurrentShape: !!currentShape,
            isDrawingPolygon: isDrawingPolygon,
            polygonPointCount: polygonPoints.length,
            config: { ...toolConfig }
        };
    }

    // ==================== UTILITIES ====================

    /**
     * Get list of all available tools
     * @returns {string[]}
     */
    function getAvailableTools() {
        return Object.values(TOOLS);
    }

    /**
     * Get tool display name
     * @param {string} tool
     * @returns {string}
     */
    function getToolDisplayName(tool) {
        const names = {
            'select': 'Select',
            'rect': 'Rectangle',
            'circle': 'Circle',
            'ellipse': 'Ellipse',
            'line': 'Line',
            'arrow': 'Arrow',
            'triangle': 'Triangle',
            'star': 'Star',
            'polygon': 'Polygon',
            'text': 'Text',
            'image': 'Image'
        };

        return names[tool] || tool;
    }

    /**
     * Reset tool state
     */
    function resetToolState() {
        cancelDrawing();
        cancelPolygon();
        currentTool = TOOLS.SELECT;
        updateCursor();
        console.log('✓ Tool state reset');
    }

    // ==================== PUBLIC API ====================

    return {
        // Tool management
        setTool,
        getCurrentTool,
        isToolActive,

        // Tool configuration
        setStrokeColor,
        setStrokeWidth,
        setFillColor,
        getToolConfig,
        updateToolConfig,

        // Drawing operations
        startDrawing,
        updateDrawing,
        finishDrawing,
        cancelDrawing,

        // Polygon operations
        handlePolygonClick,
        updatePolygonPreview,
        finishPolygon,
        cancelPolygon,

        // State queries
        isCurrentlyDrawing,
        isCurrentlyDrawingPolygon,
        getCurrentShape,
        getDrawingState,

        // Utilities
        getAvailableTools,
        getToolDisplayName,
        resetToolState,

        // Constants
        TOOLS
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapTools = MapTools;
}

console.log('✓ MapTools module loaded');