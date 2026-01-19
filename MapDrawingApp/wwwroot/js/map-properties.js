// ============================================
// MAP PROPERTIES MODULE
// Property Panel Management
// ============================================

/**
 * Manages the property panel and shape property editing.
 * Handles reading and applying properties to selected shapes.
 */
const MapProperties = (function () {
    'use strict';

    // ==================== STATE ====================

    let selectedShape = null;

    // Property element IDs
    const ELEMENTS = {
        // Display
        selectedInfo: '#selectedObjectInfo',

        // Position
        positionX: '#positionX',
        positionY: '#positionY',

        // Size
        objectWidth: '#objectWidth',
        objectHeight: '#objectHeight',
        sizeSection: '#sizeSection',

        // Transform
        rotation: '#rotation',
        rotationValue: '#rotationValue',

        // Colors
        colorPicker: '#colorPicker',
        fillColorPicker: '#fillColorPicker',

        // Stroke
        strokeWidth: '#strokeWidth',
        strokeWidthValue: '#strokeWidthValue',

        // Opacity
        opacity: '#opacity',
        opacityValue: '#opacityValue',

        // Lock
        lockToggleBtn: '#lockToggleBtn',
        lockToggleText: '#lockToggleText',

        // Advanced
        scaleX: '#scaleX',
        scaleY: '#scaleY',
        skewX: '#skewX',
        skewY: '#skewY',
        scaleXValue: '#scaleXValue',
        scaleYValue: '#scaleYValue',
        skewXValue: '#skewXValue',
        skewYValue: '#skewYValue',
        bringToFrontBtn: '#bringToFrontBtn',
        sendToBackBtn: '#sendToBackBtn'
    };

    // ==================== SHAPE SELECTION ====================

    /**
     * Set selected shape and update panel
     * @param {Konva.Shape|null} shape
     */
    function setSelectedShape(shape) {
        selectedShape = shape;
        updatePropertyPanel(shape);
    }

    /**
     * Get currently selected shape
     * @returns {Konva.Shape|null}
     */
    function getSelectedShape() {
        return selectedShape;
    }

    /**
     * Clear selection
     */
    function clearSelection() {
        selectedShape = null;
        updatePropertyPanel(null);
    }

    // ==================== PANEL UPDATE ====================

    /**
     * Update property panel based on selected shape
     * @param {Konva.Shape|null} shape
     */
    function updatePropertyPanel(shape) {
        if (!shape) {
            resetPropertyPanel();
            return;
        }

        updateBasicProperties(shape);
        updatePositionProperties(shape);
        updateSizeProperties(shape);
        updateTransformProperties(shape);
        updateAdvancedProperties(shape);
        updateLockStatus(shape);
        updateInfoDisplay(shape);
    }

    /**
     * Reset property panel to disabled state
     * @private
     */
    function resetPropertyPanel() {
        // Basic properties
        $(ELEMENTS.colorPicker).val('#000000').prop('disabled', true);
        $(ELEMENTS.fillColorPicker).val('#ffffff').prop('disabled', true);
        $(ELEMENTS.strokeWidth).val(2).prop('disabled', true);
        $(ELEMENTS.opacity).val(1).prop('disabled', true);
        $(ELEMENTS.strokeWidthValue).text('2');
        $(ELEMENTS.opacityValue).text('100%');

        // Position
        $(ELEMENTS.positionX).val(0).prop('disabled', true);
        $(ELEMENTS.positionY).val(0).prop('disabled', true);

        // Size
        $(ELEMENTS.objectWidth).val(0).prop('disabled', true);
        $(ELEMENTS.objectHeight).val(0).prop('disabled', true);
        $(ELEMENTS.sizeSection).hide();

        // Rotation
        $(ELEMENTS.rotation).val(0).prop('disabled', true);
        $(ELEMENTS.rotationValue).text('0°');

        // Lock
        $(ELEMENTS.lockToggleBtn).prop('disabled', true);

        // Advanced
        $(ELEMENTS.scaleX).val(1).prop('disabled', true);
        $(ELEMENTS.scaleY).val(1).prop('disabled', true);
        $(ELEMENTS.skewX).val(0).prop('disabled', true);
        $(ELEMENTS.skewY).val(0).prop('disabled', true);
        $(ELEMENTS.scaleXValue).text('1.0');
        $(ELEMENTS.scaleYValue).text('1.0');
        $(ELEMENTS.skewXValue).text('0');
        $(ELEMENTS.skewYValue).text('0');
        $(ELEMENTS.bringToFrontBtn).prop('disabled', true);
        $(ELEMENTS.sendToBackBtn).prop('disabled', true);

        // Info
        $(ELEMENTS.selectedInfo).html('<i class="bi bi-info-circle"></i> Chưa chọn');
    }

    /**
     * Update basic properties (colors, stroke, opacity)
     * @private
     */
    function updateBasicProperties(shape) {
        const stroke = shape.stroke() || '#000000';
        const fill = shape.fill() || 'transparent';
        const strokeWidth = shape.strokeWidth() || 2;
        const opacity = shape.opacity() || 1;

        $(ELEMENTS.colorPicker).val(stroke).prop('disabled', false);
        $(ELEMENTS.fillColorPicker).val(fill === 'transparent' ? '#ffffff' : fill).prop('disabled', false);
        $(ELEMENTS.strokeWidth).val(strokeWidth).prop('disabled', false);
        $(ELEMENTS.opacity).val(opacity).prop('disabled', false);
        $(ELEMENTS.strokeWidthValue).text(strokeWidth);
        $(ELEMENTS.opacityValue).text(Math.round(opacity * 100) + '%');
    }

    /**
     * Update position properties
     * @private
     */
    function updatePositionProperties(shape) {
        const x = Math.round(shape.x());
        const y = Math.round(shape.y());

        $(ELEMENTS.positionX).val(x).prop('disabled', false);
        $(ELEMENTS.positionY).val(y).prop('disabled', false);
    }

    /**
     * Update size properties
     * @private
     */
    function updateSizeProperties(shape) {
        const className = shape.getClassName();

        if (className === 'Rect') {
            const width = Math.round(shape.width() * (shape.scaleX() || 1));
            const height = Math.round(shape.height() * (shape.scaleY() || 1));
            $(ELEMENTS.objectWidth).val(width).prop('disabled', false);
            $(ELEMENTS.objectHeight).val(height).prop('disabled', false);
            $(ELEMENTS.sizeSection).show();
            // Reset labels
            $(ELEMENTS.sizeSection + ' label').first().text('W:');
            $(ELEMENTS.sizeSection + ' .col-6').last().show();
        } else if (className === 'Circle') {
            const radius = Math.round(shape.radius());
            $(ELEMENTS.objectWidth).val(radius).prop('disabled', false);
            $(ELEMENTS.objectHeight).val(radius).prop('disabled', false);
            $(ELEMENTS.sizeSection).show();
            // Change labels for circle
            $(ELEMENTS.sizeSection + ' label').first().text('R:');
            $(ELEMENTS.sizeSection + ' .col-6').last().hide();
        } else if (className === 'Ellipse') {
            const rx = Math.round(shape.radiusX());
            const ry = Math.round(shape.radiusY());
            $(ELEMENTS.objectWidth).val(rx).prop('disabled', false);
            $(ELEMENTS.objectHeight).val(ry).prop('disabled', false);
            $(ELEMENTS.sizeSection).show();
            // Change labels for ellipse
            $(ELEMENTS.sizeSection + ' label').first().text('RX:');
            $(ELEMENTS.sizeSection + ' label').last().text('RY:');
            $(ELEMENTS.sizeSection + ' .col-6').last().show();
        } else {
            // Hide size section for other shapes
            $(ELEMENTS.sizeSection).hide();
        }
    }

    /**
     * Update transform properties (rotation)
     * @private
     */
    function updateTransformProperties(shape) {
        const rotation = Math.round(shape.rotation() || 0);
        $(ELEMENTS.rotation).val(rotation).prop('disabled', false);
        $(ELEMENTS.rotationValue).text(rotation + '°');
    }

    /**
     * Update advanced properties (scale, skew)
     * @private
     */
    function updateAdvancedProperties(shape) {
        const scaleX = shape.scaleX() || 1;
        const scaleY = shape.scaleY() || 1;
        const skewX = shape.skewX() || 0;
        const skewY = shape.skewY() || 0;

        $(ELEMENTS.scaleX).val(scaleX).prop('disabled', false);
        $(ELEMENTS.scaleY).val(scaleY).prop('disabled', false);
        $(ELEMENTS.skewX).val(skewX).prop('disabled', false);
        $(ELEMENTS.skewY).val(skewY).prop('disabled', false);

        $(ELEMENTS.scaleXValue).text(scaleX.toFixed(1));
        $(ELEMENTS.scaleYValue).text(scaleY.toFixed(1));
        $(ELEMENTS.skewXValue).text(skewX.toFixed(1));
        $(ELEMENTS.skewYValue).text(skewY.toFixed(1));

        $(ELEMENTS.bringToFrontBtn).prop('disabled', false);
        $(ELEMENTS.sendToBackBtn).prop('disabled', false);
    }

    /**
     * Update lock status
     * @private
     */
    function updateLockStatus(shape) {
        const isLocked = !shape.draggable();

        $(ELEMENTS.lockToggleBtn).prop('disabled', false);

        if (isLocked) {
            $(ELEMENTS.lockToggleBtn)
                .removeClass('btn-outline-warning')
                .addClass('btn-warning');
            $(ELEMENTS.lockToggleBtn + ' i')
                .removeClass('bi-unlock')
                .addClass('bi-lock');
            $(ELEMENTS.lockToggleText).text('Mở khóa');
        } else {
            $(ELEMENTS.lockToggleBtn)
                .removeClass('btn-warning')
                .addClass('btn-outline-warning');
            $(ELEMENTS.lockToggleBtn + ' i')
                .removeClass('bi-lock')
                .addClass('bi-unlock');
            $(ELEMENTS.lockToggleText).text('Khóa di chuyển');
        }
    }

    /**
     * Update info display
     * @private
     */
    function updateInfoDisplay(shape) {
        const className = shape.getClassName();
        const dbId = shape.getAttr('dbId') || 'new';
        const info = `${className} (ID: ${dbId})`;
        $(ELEMENTS.selectedInfo).html(`<i class="bi bi-check-circle"></i> ${info}`);
    }

    // ==================== PROPERTY SETTERS ====================

    /**
     * Apply color to selected shape
     * @param {string} color
     */
    function applyColor(color) {
        if (!selectedShape) return false;

        selectedShape.stroke(color);
        redrawLayer();
        console.log('✓ Color applied:', color);
        return true;
    }

    /**
     * Apply fill color to selected shape
     * @param {string} color
     */
    function applyFillColor(color) {
        if (!selectedShape) return false;

        selectedShape.fill(color);
        redrawLayer();
        console.log('✓ Fill color applied:', color);
        return true;
    }

    /**
     * Apply stroke width to selected shape
     * @param {number} width
     */
    function applyStrokeWidth(width) {
        if (!selectedShape) return false;

        selectedShape.strokeWidth(width);
        $(ELEMENTS.strokeWidthValue).text(width);
        redrawLayer();
        console.log('✓ Stroke width applied:', width);
        return true;
    }

    /**
     * Apply opacity to selected shape
     * @param {number} opacity
     */
    function applyOpacity(opacity) {
        if (!selectedShape) return false;

        selectedShape.opacity(opacity);
        $(ELEMENTS.opacityValue).text(Math.round(opacity * 100) + '%');
        redrawLayer();
        console.log('✓ Opacity applied:', opacity);
        return true;
    }

    /**
     * Apply position to selected shape
     * @param {number} x
     * @param {number} y
     */
    function applyPosition(x, y) {
        if (!selectedShape) return false;

        // Constrain to canvas
        const canvas = MapCore.getCanvasDimensions();
        x = Math.max(0, Math.min(canvas.width, x));
        y = Math.max(0, Math.min(canvas.height, y));

        selectedShape.position({ x, y });
        redrawLayer();
        console.log('✓ Position applied:', x, y);
        return true;
    }

    /**
     * Apply size to selected shape
     * @param {number} width
     * @param {number} height
     */
    function applySize(width, height) {
        if (!selectedShape) return false;

        const className = selectedShape.getClassName();

        if (className === 'Rect') {
            selectedShape.width(width);
            selectedShape.height(height);
        } else if (className === 'Circle') {
            selectedShape.radius(width);
        } else if (className === 'Ellipse') {
            selectedShape.radiusX(width);
            selectedShape.radiusY(height);
        }

        redrawLayer();
        console.log('✓ Size applied:', width, height);
        return true;
    }

    /**
     * Apply rotation to selected shape
     * @param {number} rotation
     */
    function applyRotation(rotation) {
        if (!selectedShape) return false;

        selectedShape.rotation(rotation);
        $(ELEMENTS.rotationValue).text(rotation + '°');
        redrawLayer();
        console.log('✓ Rotation applied:', rotation);
        return true;
    }

    /**
     * Apply scale to selected shape
     * @param {number} scaleX
     * @param {number} scaleY
     */
    function applyScale(scaleX, scaleY) {
        if (!selectedShape) return false;

        selectedShape.scaleX(scaleX);
        selectedShape.scaleY(scaleY);
        $(ELEMENTS.scaleXValue).text(scaleX.toFixed(1));
        $(ELEMENTS.scaleYValue).text(scaleY.toFixed(1));
        redrawLayer();
        console.log('✓ Scale applied:', scaleX, scaleY);
        return true;
    }

    /**
     * Apply skew to selected shape
     * @param {number} skewX
     * @param {number} skewY
     */
    function applySkew(skewX, skewY) {
        if (!selectedShape) return false;

        selectedShape.skewX(skewX);
        selectedShape.skewY(skewY);
        $(ELEMENTS.skewXValue).text(skewX.toFixed(1));
        $(ELEMENTS.skewYValue).text(skewY.toFixed(1));
        redrawLayer();
        console.log('✓ Skew applied:', skewX, skewY);
        return true;
    }

    /**
     * Toggle lock/unlock for selected shape
     */
    function toggleLock() {
        if (!selectedShape) return false;

        const isLocked = !selectedShape.draggable();
        selectedShape.draggable(isLocked);

        updateLockStatus(selectedShape);

        console.log('✓ Lock toggled:', isLocked ? 'unlocked' : 'locked');
        return true;
    }

    /**
     * Bring selected shape to front
     */
    function bringToFront() {
        if (!selectedShape) return false;

        selectedShape.moveToTop();

        const transformer = MapCore.getTransformer();
        if (transformer) {
            transformer.moveToTop();
        }

        redrawLayer();
        console.log('✓ Brought to front');
        return true;
    }

    /**
     * Send selected shape to back
     */
    function sendToBack() {
        if (!selectedShape) return false;

        selectedShape.moveToBottom();

        // Keep background at bottom
        const background = MapCore.getCanvasBackground();
        if (background) {
            background.moveToBottom();
        }

        redrawLayer();
        console.log('✓ Sent to back');
        return true;
    }

    // ==================== HELPERS ====================

    /**
     * Redraw layer
     * @private
     */
    function redrawLayer() {
        const layer = MapCore.getLayer();
        if (layer) {
            layer.batchDraw();
        }
    }

    // ==================== EVENT SETUP ====================

    /**
     * Setup property panel event handlers
     */
    function setupEventHandlers() {
        // Position
        $(ELEMENTS.positionX).on('change', function () {
            const x = parseInt($(this).val());
            const y = parseInt($(ELEMENTS.positionY).val());
            applyPosition(x, y);
        });

        $(ELEMENTS.positionY).on('change', function () {
            const x = parseInt($(ELEMENTS.positionX).val());
            const y = parseInt($(this).val());
            applyPosition(x, y);
        });

        // Size
        $(ELEMENTS.objectWidth).on('change', function () {
            const w = parseInt($(this).val());
            const h = parseInt($(ELEMENTS.objectHeight).val());
            applySize(w, h);
        });

        $(ELEMENTS.objectHeight).on('change', function () {
            const w = parseInt($(ELEMENTS.objectWidth).val());
            const h = parseInt($(this).val());
            applySize(w, h);
        });

        // Rotation
        $(ELEMENTS.rotation).on('input change', function () {
            const rotation = parseInt($(this).val());
            applyRotation(rotation);
        });

        // Colors
        $(ELEMENTS.colorPicker).on('change input', function () {
            applyColor($(this).val());
        });

        $(ELEMENTS.fillColorPicker).on('change input', function () {
            applyFillColor($(this).val());
        });

        // Stroke width
        $(ELEMENTS.strokeWidth).on('change input', function () {
            applyStrokeWidth(parseInt($(this).val()));
        });

        // Opacity
        $(ELEMENTS.opacity).on('change input', function () {
            applyOpacity(parseFloat($(this).val()));
        });

        // Lock
        $(ELEMENTS.lockToggleBtn).on('click', function () {
            toggleLock();
        });

        // Scale
        $(ELEMENTS.scaleX).on('input change', function () {
            const scaleX = parseFloat($(this).val());
            const scaleY = parseFloat($(ELEMENTS.scaleY).val());
            applyScale(scaleX, scaleY);
        });

        $(ELEMENTS.scaleY).on('input change', function () {
            const scaleX = parseFloat($(ELEMENTS.scaleX).val());
            const scaleY = parseFloat($(this).val());
            applyScale(scaleX, scaleY);
        });

        // Skew
        $(ELEMENTS.skewX).on('input change', function () {
            const skewX = parseFloat($(this).val());
            const skewY = parseFloat($(ELEMENTS.skewY).val());
            applySkew(skewX, skewY);
        });

        $(ELEMENTS.skewY).on('input change', function () {
            const skewX = parseFloat($(ELEMENTS.skewX).val());
            const skewY = parseFloat($(this).val());
            applySkew(skewX, skewY);
        });

        // Z-order
        $(ELEMENTS.bringToFrontBtn).on('click', function () {
            bringToFront();
        });

        $(ELEMENTS.sendToBackBtn).on('click', function () {
            sendToBack();
        });

        console.log('✓ Property panel event handlers setup');
    }

    // ==================== PUBLIC API ====================

    return {
        // Selection
        setSelectedShape,
        getSelectedShape,
        clearSelection,

        // Panel update
        updatePropertyPanel,

        // Property setters
        applyColor,
        applyFillColor,
        applyStrokeWidth,
        applyOpacity,
        applyPosition,
        applySize,
        applyRotation,
        applyScale,
        applySkew,
        toggleLock,
        bringToFront,
        sendToBack,

        // Setup
        setupEventHandlers
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapProperties = MapProperties;
}

console.log('✓ MapProperties module loaded');