// ============================================
// MAP CORE MODULE
// Canvas & Stage Management
// ============================================

/**
 * Core canvas and stage management for the map drawing application.
 * Handles initialization, canvas setup, and basic state management.
 */
const MapCore = (function () {
    'use strict';

    // ==================== PRIVATE STATE ====================

    let stage = null;
    let layer = null;
    let transformer = null;
    let canvasBackground = null;

    // Canvas properties
    const state = {
        width: 1200,
        height: 800,
        scale: 1,
        position: { x: 0, y: 0 },
        currentMapId: null
    };

    // Constants
    const CONSTANTS = {
        MIN_CANVAS_WIDTH: 400,
        MIN_CANVAS_HEIGHT: 300,
        MAX_CANVAS_SIZE: 10000,
        DEFAULT_WIDTH: 1200,
        DEFAULT_HEIGHT: 800,
        MIN_ZOOM: 0.1,
        MAX_ZOOM: 5,
        ZOOM_STEP: 1.1
    };

    // ==================== INITIALIZATION ====================

    /**
     * Initialize the canvas and stage
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {boolean} Success status
     */
    function initialize(width, height) {
        try {
            console.log('→ MapCore: Initializing canvas...');

            // Validate dimensions
            width = validateDimension(width, CONSTANTS.DEFAULT_WIDTH);
            height = validateDimension(height, CONSTANTS.DEFAULT_HEIGHT);

            // Update state
            state.width = width;
            state.height = height;

            // Create stage
            createStage();

            // Create layer
            createLayer();

            // Create canvas background
            createCanvasBackground();

            // Create transformer
            createTransformer();

            // Center canvas
            centerCanvas();

            console.log('✓ MapCore: Canvas initialized:', width, 'x', height);
            return true;

        } catch (error) {
            console.error('❌ MapCore: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Validate dimension value
     * @private
     */
    function validateDimension(value, defaultValue) {
        const num = parseInt(value);
        if (isNaN(num) || num < CONSTANTS.MIN_CANVAS_WIDTH) {
            return defaultValue;
        }
        return Math.min(num, CONSTANTS.MAX_CANVAS_SIZE);
    }

    /**
     * Create Konva stage
     * @private
     */
    function createStage() {
        const container = document.getElementById('container');

        if (!container) {
            throw new Error('Container element not found');
        }

        // Destroy existing stage if any
        if (stage) {
            stage.destroy();
        }

        stage = new Konva.Stage({
            container: 'container',
            width: container.offsetWidth,
            height: container.offsetHeight
        });

        console.log('✓ Stage created:', container.offsetWidth, 'x', container.offsetHeight);
    }

    /**
     * Create Konva layer
     * @private
     */
    function createLayer() {
        layer = new Konva.Layer();
        stage.add(layer);
        console.log('✓ Layer created');
    }

    /**
     * Create canvas background rectangle
     * @private
     */
    function createCanvasBackground() {
        canvasBackground = new Konva.Rect({
            x: 0,
            y: 0,
            width: state.width,
            height: state.height,
            fill: 'white',
            stroke: '#e0e0e0',
            strokeWidth: 1,
            listening: true,
            name: 'canvas-background'
        });

        layer.add(canvasBackground);
        console.log('✓ Canvas background created');
    }

    /**
     * Create transformer for shape manipulation
     * @private
     */
    function createTransformer() {
        transformer = new Konva.Transformer({
            rotateEnabled: true,
            keepRatio: false,
            borderStroke: '#0d6efd',
            borderStrokeWidth: 2,
            anchorStroke: '#0d6efd',
            anchorFill: 'white',
            anchorSize: 10,
            padding: 5,
            boundBoxFunc: function (oldBox, newBox) {
                // Prevent too small shapes
                if (newBox.width < 10 || newBox.height < 10) {
                    return oldBox;
                }
                return newBox;
            }
        });

        layer.add(transformer);
        console.log('✓ Transformer created');
    }

    // ==================== CANVAS MANIPULATION ====================

    /**
     * Center the canvas in the viewport
     */
    function centerCanvas() {
        const container = document.getElementById('container');
        if (!container) return;

        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        state.position.x = (containerWidth - state.width * state.scale) / 2;
        state.position.y = (containerHeight - state.height * state.scale) / 2;

        updateCanvasTransform();
        console.log('✓ Canvas centered');
    }

    /**
     * Update canvas transform (position and scale)
     */
    function updateCanvasTransform() {
        if (!stage) return;

        stage.position(state.position);
        stage.scale({ x: state.scale, y: state.scale });

        if (layer) {
            layer.batchDraw();
        }
    }

    /**
     * Resize the canvas
     * @param {number} width - New width
     * @param {number} height - New height
     * @returns {boolean} Success status
     */
    function resizeCanvas(width, height) {
        try {
            // Validate
            width = validateDimension(width, state.width);
            height = validateDimension(height, state.height);

            // Update state
            state.width = width;
            state.height = height;

            // Update background
            if (canvasBackground) {
                canvasBackground.width(width);
                canvasBackground.height(height);
            }

            // Recenter
            centerCanvas();

            console.log('✓ Canvas resized:', width, 'x', height);
            return true;

        } catch (error) {
            console.error('❌ Canvas resize failed:', error);
            return false;
        }
    }

    /**
     * Destroy the canvas and clean up
     */
    function destroy() {
        if (stage) {
            stage.destroy();
            stage = null;
        }

        layer = null;
        transformer = null;
        canvasBackground = null;

        console.log('✓ Canvas destroyed');
    }

    // ==================== ZOOM OPERATIONS ====================

    /**
     * Set zoom level
     * @param {number} newScale - New scale value
     */
    function setZoom(newScale) {
        newScale = Math.max(CONSTANTS.MIN_ZOOM, Math.min(CONSTANTS.MAX_ZOOM, newScale));
        state.scale = newScale;
        centerCanvas();
    }

    /**
     * Zoom in
     */
    function zoomIn() {
        setZoom(state.scale * CONSTANTS.ZOOM_STEP);
    }

    /**
     * Zoom out
     */
    function zoomOut() {
        setZoom(state.scale / CONSTANTS.ZOOM_STEP);
    }

    /**
     * Reset zoom to 100%
     */
    function zoomReset() {
        setZoom(1);
    }

    /**
     * Fit canvas to viewport
     */
    function zoomFit() {
        const container = document.getElementById('container');
        if (!container) return;

        const scaleX = container.offsetWidth / state.width;
        const scaleY = container.offsetHeight / state.height;

        setZoom(Math.min(scaleX, scaleY) * 0.9);
    }

    // ==================== GETTERS ====================

    /**
     * Get the Konva stage
     * @returns {Konva.Stage|null}
     */
    function getStage() {
        return stage;
    }

    /**
     * Get the main layer
     * @returns {Konva.Layer|null}
     */
    function getLayer() {
        return layer;
    }

    /**
     * Get the transformer
     * @returns {Konva.Transformer|null}
     */
    function getTransformer() {
        return transformer;
    }

    /**
     * Get canvas background
     * @returns {Konva.Rect|null}
     */
    function getCanvasBackground() {
        return canvasBackground;
    }

    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number}}
     */
    function getCanvasDimensions() {
        return {
            width: state.width,
            height: state.height
        };
    }

    /**
     * Get canvas scale
     * @returns {number}
     */
    function getScale() {
        return state.scale;
    }

    /**
     * Get canvas position
     * @returns {{x: number, y: number}}
     */
    function getPosition() {
        return { ...state.position };
    }

    /**
     * Get current map ID
     * @returns {number|null}
     */
    function getCurrentMapId() {
        return state.currentMapId;
    }

    /**
     * Set current map ID
     * @param {number} mapId
     */
    function setCurrentMapId(mapId) {
        state.currentMapId = mapId;
        console.log('✓ Current map ID set:', mapId);
    }

    /**
     * Get all state (for debugging)
     * @returns {object}
     */
    function getState() {
        return {
            ...state,
            constants: CONSTANTS,
            hasStage: !!stage,
            hasLayer: !!layer,
            hasTransformer: !!transformer
        };
    }

    // ==================== PAN OPERATIONS ====================

    /**
     * Update pan position
     * @param {number} dx - Delta X
     * @param {number} dy - Delta Y
     */
    function updatePan(dx, dy) {
        state.position.x += dx;
        state.position.y += dy;
        updateCanvasTransform();
    }

    /**
     * Set position directly
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    function setPosition(x, y) {
        state.position.x = x;
        state.position.y = y;
        updateCanvasTransform();
    }

    // ==================== COORDINATE CONVERSION ====================

    /**
     * Convert stage position to layer position
     * @param {{x: number, y: number}} stagePos
     * @returns {{x: number, y: number}}
     */
    function stageToLayer(stagePos) {
        return {
            x: (stagePos.x - state.position.x) / state.scale,
            y: (stagePos.y - state.position.y) / state.scale
        };
    }

    /**
     * Convert layer position to stage position
     * @param {{x: number, y: number}} layerPos
     * @returns {{x: number, y: number}}
     */
    function layerToStage(layerPos) {
        return {
            x: layerPos.x * state.scale + state.position.x,
            y: layerPos.y * state.scale + state.position.y
        };
    }

    /**
     * Check if position is inside canvas
     * @param {{x: number, y: number}} stagePos
     * @returns {boolean}
     */
    function isPositionInCanvas(stagePos) {
        const layerPos = stageToLayer(stagePos);
        return layerPos.x >= 0 &&
            layerPos.x <= state.width &&
            layerPos.y >= 0 &&
            layerPos.y <= state.height;
    }

    /**
     * Constrain position to canvas boundaries
     * @param {{x: number, y: number}} stagePos
     * @returns {{x: number, y: number}}
     */
    function constrainToCanvas(stagePos) {
        const layerPos = stageToLayer(stagePos);

        layerPos.x = Math.max(0, Math.min(state.width, layerPos.x));
        layerPos.y = Math.max(0, Math.min(state.height, layerPos.y));

        return layerPos;
    }

    // ==================== PUBLIC API ====================

    return {
        // Initialization
        initialize,
        destroy,

        // Canvas manipulation
        resizeCanvas,
        centerCanvas,
        updateCanvasTransform,

        // Zoom
        setZoom,
        zoomIn,
        zoomOut,
        zoomReset,
        zoomFit,

        // Pan
        updatePan,
        setPosition,

        // Getters
        getStage,
        getLayer,
        getTransformer,
        getCanvasBackground,
        getCanvasDimensions,
        getScale,
        getPosition,
        getCurrentMapId,
        setCurrentMapId,
        getState,

        // Coordinate conversion
        stageToLayer,
        layerToStage,
        isPositionInCanvas,
        constrainToCanvas,

        // Constants
        CONSTANTS
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapCore = MapCore;
}

console.log('✓ MapCore module loaded');