// ============================================
// MAP BOUNDARIES MODULE
// Canvas Boundary Constraints
// ============================================

/**
 * Manages boundary constraints for shapes and drag operations.
 * Ensures all shapes stay within the canvas boundaries.
 */
const MapBoundaries = (function () {
    'use strict';

    // ==================== PRIVATE HELPERS ====================

    /**
     * Get canvas dimensions from MapCore
     * @private
     * @returns {{width: number, height: number}}
     */
    function getCanvasDimensions() {
        if (!window.MapCore) {
            console.error('❌ MapCore not available');
            return { width: 1200, height: 800 };
        }
        return MapCore.getCanvasDimensions();
    }

    /**
     * Get shape bounding box relative to layer
     * @private
     * @param {Konva.Shape} shape
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    function getShapeBounds(shape) {
        const layer = MapCore.getLayer();
        if (!layer) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        return shape.getClientRect({ relativeTo: layer });
    }

    /**
     * Check if shape is completely inside canvas
     * @private
     * @param {object} bounds - Shape bounds {x, y, width, height}
     * @returns {boolean}
     */
    function isShapeInsideCanvas(bounds) {
        const canvas = getCanvasDimensions();

        return bounds.x >= 0 &&
            bounds.y >= 0 &&
            bounds.x + bounds.width <= canvas.width &&
            bounds.y + bounds.height <= canvas.height;
    }

    // ==================== POSITION CONSTRAINTS ====================

    /**
     * Constrain shape position to canvas boundaries
     * @param {Konva.Shape} shape
     * @returns {{x: number, y: number}} - Constrained position
     */
    function constrainShapePosition(shape) {
        const canvas = getCanvasDimensions();
        const bounds = getShapeBounds(shape);

        let newX = shape.x();
        let newY = shape.y();

        // Left boundary
        if (bounds.x < 0) {
            newX = newX - bounds.x;
        }

        // Right boundary
        if (bounds.x + bounds.width > canvas.width) {
            newX = newX - (bounds.x + bounds.width - canvas.width);
        }

        // Top boundary
        if (bounds.y < 0) {
            newY = newY - bounds.y;
        }

        // Bottom boundary
        if (bounds.y + bounds.height > canvas.height) {
            newY = newY - (bounds.y + bounds.height - canvas.height);
        }

        return { x: newX, y: newY };
    }

    /**
     * Apply constrained position to shape
     * @param {Konva.Shape} shape
     * @returns {boolean} - True if position was adjusted
     */
    function applyConstrainedPosition(shape) {
        const originalPos = { x: shape.x(), y: shape.y() };
        const constrainedPos = constrainShapePosition(shape);

        const wasAdjusted = originalPos.x !== constrainedPos.x ||
            originalPos.y !== constrainedPos.y;

        if (wasAdjusted) {
            shape.position(constrainedPos);
            console.log('→ Position constrained:', originalPos, '→', constrainedPos);
        }

        return wasAdjusted;
    }

    // ==================== DRAG BOUNDARIES ====================

    /**
     * Create drag boundary function for a shape
     * @param {Konva.Shape} shape
     * @returns {Function} - Drag boundary function
     */
    function createDragBoundFunc(shape) {
        return function (pos) {
            const canvas = getCanvasDimensions();
            const bounds = getShapeBounds(shape);

            let newX = pos.x;
            let newY = pos.y;

            // Calculate shape offset from position
            const offsetX = bounds.x - shape.x();
            const offsetY = bounds.y - shape.y();

            // Left boundary
            if (pos.x + offsetX < 0) {
                newX = -offsetX;
            }

            // Right boundary
            if (pos.x + offsetX + bounds.width > canvas.width) {
                newX = canvas.width - bounds.width - offsetX;
            }

            // Top boundary
            if (pos.y + offsetY < 0) {
                newY = -offsetY;
            }

            // Bottom boundary
            if (pos.y + offsetY + bounds.height > canvas.height) {
                newY = canvas.height - bounds.height - offsetY;
            }

            return { x: newX, y: newY };
        };
    }

    /**
     * Setup drag boundaries for a shape
     * @param {Konva.Shape} shape
     */
    function setupDragBoundaries(shape) {
        if (!shape || !shape.draggable) {
            console.warn('⚠️ Shape is not draggable');
            return;
        }

        shape.dragBoundFunc(createDragBoundFunc(shape));
        console.log('✓ Drag boundaries set for:', shape.getClassName());
    }

    /**
     * Setup drag boundaries for multiple shapes
     * @param {Konva.Shape[]} shapes
     */
    function setupMultipleDragBoundaries(shapes) {
        if (!Array.isArray(shapes)) {
            console.error('❌ shapes must be an array');
            return;
        }

        shapes.forEach(shape => {
            if (shape && shape.draggable) {
                setupDragBoundaries(shape);
            }
        });

        console.log('✓ Drag boundaries set for', shapes.length, 'shapes');
    }

    // ==================== DRAWING BOUNDARIES ====================

    /**
     * Check if a stage position is valid for drawing
     * @param {{x: number, y: number}} stagePos - Stage coordinates
     * @returns {boolean}
     */
    function isValidDrawPosition(stagePos) {
        if (!MapCore.isPositionInCanvas) {
            console.error('❌ MapCore.isPositionInCanvas not available');
            return true; // Fail safe
        }

        return MapCore.isPositionInCanvas(stagePos);
    }

    /**
     * Constrain drawing position to canvas
     * @param {{x: number, y: number}} stagePos - Stage coordinates
     * @returns {{x: number, y: number}} - Layer coordinates (constrained)
     */
    function constrainDrawPosition(stagePos) {
        if (!MapCore.constrainToCanvas) {
            console.error('❌ MapCore.constrainToCanvas not available');
            return { x: 0, y: 0 };
        }

        return MapCore.constrainToCanvas(stagePos);
    }

    /**
     * Get constrained drawing bounds
     * @param {{x: number, y: number}} startPos - Start position (layer coords)
     * @param {{x: number, y: number}} currentPos - Current position (layer coords)
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    function getConstrainedDrawBounds(startPos, currentPos) {
        const canvas = getCanvasDimensions();

        // Constrain current position
        const constrainedCurrent = {
            x: Math.max(0, Math.min(canvas.width, currentPos.x)),
            y: Math.max(0, Math.min(canvas.height, currentPos.y))
        };

        // Calculate bounds
        const x = Math.min(startPos.x, constrainedCurrent.x);
        const y = Math.min(startPos.y, constrainedCurrent.y);
        const width = Math.abs(constrainedCurrent.x - startPos.x);
        const height = Math.abs(constrainedCurrent.y - startPos.y);

        return { x, y, width, height };
    }

    // ==================== TRANSFORM BOUNDARIES ====================

    /**
     * Constrain shape after transform (scale, rotate, etc)
     * @param {Konva.Shape} shape
     * @returns {boolean} - True if position was adjusted
     */
    function constrainAfterTransform(shape) {
        return applyConstrainedPosition(shape);
    }

    /**
     * Setup transform end handler with boundary constraints
     * @param {Konva.Shape} shape
     * @param {Function} callback - Optional callback after constraint
     */
    function setupTransformBoundaries(shape, callback) {
        shape.on('transformend', function () {
            const wasAdjusted = constrainAfterTransform(this);

            if (wasAdjusted) {
                const layer = MapCore.getLayer();
                if (layer) layer.batchDraw();
            }

            if (typeof callback === 'function') {
                callback(this, wasAdjusted);
            }
        });

        console.log('✓ Transform boundaries set for:', shape.getClassName());
    }

    // ==================== VALIDATION ====================

    /**
     * Validate if shape fits in canvas at given position
     * @param {Konva.Shape} shape
     * @param {{x: number, y: number}} position
     * @returns {boolean}
     */
    function canShapeFitAt(shape, position) {
        const canvas = getCanvasDimensions();
        const tempPos = shape.position();

        // Temporarily set position
        shape.position(position);
        const bounds = getShapeBounds(shape);

        // Restore original position
        shape.position(tempPos);

        return isShapeInsideCanvas(bounds);
    }

    /**
     * Get valid placement position for shape
     * @param {Konva.Shape} shape
     * @param {{x: number, y: number}} desiredPos - Desired position
     * @returns {{x: number, y: number}} - Valid position
     */
    function getValidPlacementPosition(shape, desiredPos) {
        // Try desired position first
        if (canShapeFitAt(shape, desiredPos)) {
            return desiredPos;
        }

        // Temporarily set to desired position to get bounds
        const tempPos = shape.position();
        shape.position(desiredPos);
        const constrainedPos = constrainShapePosition(shape);
        shape.position(tempPos);

        return constrainedPos;
    }

    // ==================== RESIZE BOUNDARIES ====================

    /**
     * Constrain shape size to fit within canvas
     * @param {Konva.Shape} shape
     * @param {{width: number, height: number}} desiredSize
     * @returns {{width: number, height: number}} - Constrained size
     */
    function constrainShapeSize(shape, desiredSize) {
        const canvas = getCanvasDimensions();
        const pos = shape.position();
        const bounds = getShapeBounds(shape);

        // Calculate offset from position to bounds
        const offsetX = bounds.x - pos.x;
        const offsetY = bounds.y - pos.y;

        let maxWidth = canvas.width - pos.x - offsetX;
        let maxHeight = canvas.height - pos.y - offsetY;

        // Also consider left/top boundaries
        if (pos.x + offsetX < 0) {
            maxWidth += (pos.x + offsetX);
        }
        if (pos.y + offsetY < 0) {
            maxHeight += (pos.y + offsetY);
        }

        return {
            width: Math.min(desiredSize.width, Math.max(10, maxWidth)),
            height: Math.min(desiredSize.height, Math.max(10, maxHeight))
        };
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Constrain all shapes in layer to canvas
     * @param {boolean} redraw - Whether to redraw layer after
     * @returns {number} - Number of shapes adjusted
     */
    function constrainAllShapes(redraw = true) {
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();
        const background = MapCore.getCanvasBackground();

        if (!layer) {
            console.error('❌ Layer not available');
            return 0;
        }

        let adjustedCount = 0;

        layer.children.forEach(child => {
            // Skip transformer and background
            if (child === transformer || child === background) {
                return;
            }

            const wasAdjusted = applyConstrainedPosition(child);
            if (wasAdjusted) {
                adjustedCount++;
            }
        });

        if (redraw && adjustedCount > 0) {
            layer.batchDraw();
        }

        console.log('✓ Constrained', adjustedCount, 'shapes');
        return adjustedCount;
    }

    /**
     * Setup boundaries for all shapes in layer
     */
    function setupAllBoundaries() {
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();
        const background = MapCore.getCanvasBackground();

        if (!layer) {
            console.error('❌ Layer not available');
            return;
        }

        let count = 0;

        layer.children.forEach(child => {
            // Skip transformer and background
            if (child === transformer || child === background) {
                return;
            }

            if (child.draggable && child.draggable()) {
                setupDragBoundaries(child);
                count++;
            }
        });

        console.log('✓ Setup boundaries for', count, 'shapes');
    }

    // ==================== UTILITIES ====================

    /**
     * Get boundary status for a shape
     * @param {Konva.Shape} shape
     * @returns {object} - Status information
     */
    function getBoundaryStatus(shape) {
        const canvas = getCanvasDimensions();
        const bounds = getShapeBounds(shape);

        return {
            isInside: isShapeInsideCanvas(bounds),
            bounds: bounds,
            violations: {
                left: bounds.x < 0,
                right: bounds.x + bounds.width > canvas.width,
                top: bounds.y < 0,
                bottom: bounds.y + bounds.height > canvas.height
            },
            distance: {
                toLeft: bounds.x,
                toRight: canvas.width - (bounds.x + bounds.width),
                toTop: bounds.y,
                toBottom: canvas.height - (bounds.y + bounds.height)
            }
        };
    }

    /**
     * Log boundary status (for debugging)
     * @param {Konva.Shape} shape
     */
    function logBoundaryStatus(shape) {
        const status = getBoundaryStatus(shape);
        console.log('=== Boundary Status ===');
        console.log('Shape:', shape.getClassName());
        console.log('Is Inside:', status.isInside);
        console.log('Bounds:', status.bounds);
        console.log('Violations:', status.violations);
        console.log('Distance to edges:', status.distance);
    }

    // ==================== PUBLIC API ====================

    return {
        // Position constraints
        constrainShapePosition,
        applyConstrainedPosition,

        // Drag boundaries
        setupDragBoundaries,
        setupMultipleDragBoundaries,
        createDragBoundFunc,

        // Drawing boundaries
        isValidDrawPosition,
        constrainDrawPosition,
        getConstrainedDrawBounds,

        // Transform boundaries
        constrainAfterTransform,
        setupTransformBoundaries,

        // Validation
        canShapeFitAt,
        getValidPlacementPosition,

        // Resize boundaries
        constrainShapeSize,

        // Batch operations
        constrainAllShapes,
        setupAllBoundaries,

        // Utilities
        getBoundaryStatus,
        logBoundaryStatus,
        isShapeInsideCanvas,
        getShapeBounds
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapBoundaries = MapBoundaries;
}

console.log('✓ MapBoundaries module loaded');