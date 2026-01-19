// ============================================
// MAP EVENTS MODULE
// Event Handlers Setup
// ============================================

/**
 * Manages all event handlers for the map application.
 * Centralizes event setup for stage, keyboard, mouse, and UI.
 */
const MapEvents = (function () {
    'use strict';

    // ==================== STATE ====================

    let isPanning = false;
    let lastPointerPosition = null;
    let spacePressed = false;

    // ==================== STAGE EVENTS ====================

    /**
     * Setup stage event handlers
     */
    function setupStageEvents() {
        const stage = MapCore.getStage();
        if (!stage) {
            console.error('❌ Stage not available');
            return;
        }

        // Click/Tap events
        stage.on('click tap', handleStageClick);

        // Mouse events
        stage.on('mousedown', handleMouseDown);
        stage.on('mousemove', handleMouseMove);
        stage.on('mouseup', handleMouseUp);

        // Prevent context menu on middle mouse
        stage.container().addEventListener('contextmenu', function (e) {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        console.log('✓ Stage events setup');
    }

    /**
     * Handle stage click
     * @private
     */
    function handleStageClick(e) {
        const currentTool = MapTools.getCurrentTool();

        // Select mode
        if (currentTool === 'select') {
            const background = MapCore.getCanvasBackground();

            // Click on background or stage - deselect
            if (e.target === MapCore.getStage() || e.target === background) {
                deselectAll();
                return;
            }

            // Click on shape - select
            const transformer = MapCore.getTransformer();
            if (e.target !== MapCore.getLayer() && e.target !== transformer) {
                selectShape(e.target);
            }
        }
    }

    /**
     * Handle mouse down
     * @private
     */
    function handleMouseDown(e) {
        const pos = MapCore.getStage().getPointerPosition();
        const currentTool = MapTools.getCurrentTool();

        // Middle mouse button = pan (PRIORITY 1)
        if (e.evt.button === 1) {
            e.evt.preventDefault();
            startPan(pos);
            return;
        }

        // Space + left mouse = pan (PRIORITY 2)
        if (spacePressed && e.evt.button === 0) {
            e.evt.preventDefault();
            startPan(pos);
            return;
        }

        // Select mode - don't interfere with shape dragging
        if (currentTool === 'select') {
            return;
        }

        // Polygon tool
        if (currentTool === 'polygon') {
            MapTools.handlePolygonClick(pos);
            return;
        }

        // Drawing tools - check if inside canvas
        if (!MapCore.isPositionInCanvas(pos)) {
            console.log('⚠️ Cannot draw outside canvas');
            if (window.MapUI) {
                MapUI.updateStatus('Không thể vẽ bên ngoài canvas', 'warning');
            }
            return;
        }

        // Only start drawing on background or stage
        const background = MapCore.getCanvasBackground();
        if (e.target !== MapCore.getStage() && e.target !== background) {
            return;
        }

        // Start drawing
        MapTools.startDrawing(pos);
    }

    /**
     * Handle mouse move
     * @private
     */
    function handleMouseMove(e) {
        const pos = MapCore.getStage().getPointerPosition();

        // Handle panning first (priority)
        if (isPanning) {
            updatePan(pos);
            return;
        }

        // Update polygon preview
        if (MapTools.isCurrentlyDrawingPolygon()) {
            MapTools.updatePolygonPreview(pos);
            return;
        }

        // Update drawing
        if (MapTools.isCurrentlyDrawing()) {
            MapTools.updateDrawing(pos);
        }
    }

    /**
     * Handle mouse up
     * @private
     */
    function handleMouseUp(e) {
        // End panning
        if (isPanning) {
            endPan();
            return;
        }

        // Finish drawing
        if (MapTools.isCurrentlyDrawing()) {
            const shape = MapTools.finishDrawing();

            if (shape) {
                // Setup shape events
                setupShapeEvents(shape);

                // Save to database
                if (window.MapDatabase) {
                    saveShapeToDatabase(shape);
                }

                if (window.MapUI) {
                    MapUI.updateStatus('Đã tạo đối tượng');
                }
            }
        }
    }

    // ==================== PAN FUNCTIONS ====================

    /**
     * Start panning
     * @private
     */
    function startPan(pos) {
        isPanning = true;
        lastPointerPosition = pos;

        const stage = MapCore.getStage();
        if (stage) {
            stage.container().style.cursor = 'grabbing';
        }

        console.log('→ Pan started');
    }

    /**
     * Update panning
     * @private
     */
    function updatePan(pos) {
        if (!lastPointerPosition) {
            lastPointerPosition = pos;
            return;
        }

        const dx = pos.x - lastPointerPosition.x;
        const dy = pos.y - lastPointerPosition.y;

        MapCore.updatePan(dx, dy);
        lastPointerPosition = pos;
    }

    /**
     * End panning
     * @private
     */
    function endPan() {
        isPanning = false;
        lastPointerPosition = null;
        updateCursor();
        console.log('→ Pan ended');
    }

    // ==================== SHAPE EVENTS ====================

    /**
     * Setup events for a shape
     * @param {Konva.Shape} shape
     */
    function setupShapeEvents(shape) {
        // Drag start
        shape.on('dragstart', function () {
            if (MapTools.getCurrentTool() === 'select') {
                selectShape(this);
            }
        });

        // Drag end
        shape.on('dragend', function () {
            if (MapTools.getCurrentTool() === 'select') {
                const transformer = MapCore.getTransformer();
                if (transformer) {
                    transformer.nodes([this]);
                }
                const layer = MapCore.getLayer();
                if (layer) layer.batchDraw();
            }

            // Update in database
            if (window.MapDatabase) {
                updateShapeInDatabase(this);
            }
        });

        // Transform end
        shape.on('transformend', function () {
            // Constrain to boundaries
            if (MapBoundaries) {
                MapBoundaries.constrainAfterTransform(this);
            }

            // Update in database
            if (window.MapDatabase) {
                updateShapeInDatabase(this);
            }
        });

        // Double click (for text editing)
        shape.on('dblclick dbltap', function (e) {
            e.cancelBubble = true;

            if (this.getClassName() === 'Text') {
                // Trigger text editor if available
                if (window.showTextEditor) {
                    showTextEditor(this);
                }
            }
        });

        console.log('✓ Shape events setup:', shape.getClassName());
    }

    /**
     * Setup events for all existing shapes
     */
    function setupAllShapeEvents() {
        const shapes = MapShapes.getAllShapes();

        shapes.forEach(shape => {
            setupShapeEvents(shape);
        });

        console.log('✓ Events setup for', shapes.length, 'shapes');
    }

    // ==================== SELECTION FUNCTIONS ====================

    /**
     * Select a shape
     * @param {Konva.Shape} shape
     */
    function selectShape(shape) {
        const transformer = MapCore.getTransformer();
        if (!transformer) return;

        transformer.nodes([shape]);

        const layer = MapCore.getLayer();
        if (layer) layer.batchDraw();

        // Update property panel
        if (MapProperties) {
            MapProperties.setSelectedShape(shape);
        }

        if (window.MapUI) {
            MapUI.updateStatus('Đã chọn: ' + shape.getClassName());
        }

        console.log('✓ Shape selected:', shape.getClassName());
    }

    /**
     * Deselect all shapes
     */
    function deselectAll() {
        const transformer = MapCore.getTransformer();
        if (transformer) {
            transformer.nodes([]);
        }

        const layer = MapCore.getLayer();
        if (layer) layer.batchDraw();

        // Clear property panel
        if (MapProperties) {
            MapProperties.clearSelection();
        }

        console.log('→ Deselected all');
    }

    // ==================== KEYBOARD EVENTS ====================

    /**
     * Setup keyboard event handlers
     */
    function setupKeyboardEvents() {
        $(document).on('keydown', handleKeyDown);
        $(document).on('keyup', handleKeyUp);

        console.log('✓ Keyboard events setup');
    }

    /**
     * Handle key down
     * @private
     */
    function handleKeyDown(e) {
        // Space key - enable pan mode
        if (e.code === 'Space' && !spacePressed) {
            spacePressed = true;
            updateCursor();
        }

        // Delete key - delete selected shape
        if (e.key === 'Delete') {
            const selectedShape = MapProperties ? MapProperties.getSelectedShape() : null;
            if (selectedShape) {
                deleteShape(selectedShape);
            }
        }

        // Escape key - cancel operations
        if (e.key === 'Escape') {
            // Cancel polygon
            if (MapTools.isCurrentlyDrawingPolygon()) {
                MapTools.cancelPolygon();
            } else {
                deselectAll();
            }
        }

        // Ctrl+S - Save (prevent default)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (window.MapUI) {
                MapUI.updateStatus('Đã lưu tự động');
            }
        }

        // Ctrl+Z - Undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            // Undo functionality (if implemented)
        }

        // Ctrl+Y or Ctrl+Shift+Z - Redo
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            // Redo functionality (if implemented)
        }
    }

    /**
     * Handle key up
     * @private
     */
    function handleKeyUp(e) {
        // Space key - disable pan mode
        if (e.code === 'Space') {
            spacePressed = false;
            updateCursor();
        }
    }

    // ==================== UI EVENTS ====================

    /**
     * Setup UI button event handlers
     */
    function setupUIEvents() {
        // Tool buttons
        $('#selectBtn').on('click', () => MapTools.setTool('select'));

        // Shape tools (from dropdown)
        $('#rectDropdown').on('click', () => MapTools.setTool('rect'));
        $('#circleDropdown').on('click', () => MapTools.setTool('circle'));
        $('#ellipseDropdown').on('click', () => MapTools.setTool('ellipse'));
        $('#triangleDropdown').on('click', () => MapTools.setTool('triangle'));
        $('#starDropdown').on('click', () => MapTools.setTool('star'));
        $('#polygonDropdown').on('click', () => MapTools.setTool('polygon'));
        $('#lineDropdown').on('click', () => MapTools.setTool('line'));
        $('#arrowDropdown').on('click', () => MapTools.setTool('arrow'));

        // Text button
        $('#textBtn').on('click', handleTextButtonClick);

        // Image button
        $('#imageBtn').on('click', handleImageButtonClick);

        // Image input
        $('#imageInput').on('change', handleImageInputChange);

        // Delete button
        $('#deleteBtn').on('click', handleDeleteButtonClick);

        // Clear button
        $('#clearBtn').on('click', handleClearButtonClick);

        // Save button
        $('#saveBtn').on('click', () => {
            if (window.MapUI) {
                MapUI.updateStatus('Đã lưu tự động');
            }
        });

        console.log('✓ UI events setup');
    }

    /**
     * Handle text button click
     * @private
     */
    function handleTextButtonClick() {
        const text = prompt('Nhập văn bản:', 'Text');
        if (text) {
            addTextShape(text);
        }
    }

    /**
     * Handle image button click
     * @private
     */
    function handleImageButtonClick() {
        const choice = confirm(
            '📁 Chọn nguồn hình ảnh:\n\n' +
            '• OK = Thư viện hình ảnh\n' +
            '• Cancel = Tải lên từ máy tính'
        );

        if (choice) {
            // Open image library (if implemented)
            if (window.openImageLibrary) {
                openImageLibrary();
            }
        } else {
            $('#imageInput').click();
        }
    }

    /**
     * Handle image input change
     * @private
     */
    function handleImageInputChange(e) {
        const file = e.target.files[0];
        if (file && window.MapDatabase) {
            uploadAndAddImage(file);
        }
        e.target.value = ''; // Reset input
    }

    /**
     * Handle delete button click
     * @private
     */
    function handleDeleteButtonClick() {
        const selectedShape = MapProperties ? MapProperties.getSelectedShape() : null;

        if (selectedShape) {
            deleteShape(selectedShape);
        } else {
            if (window.MapUI) {
                MapUI.updateStatus('Chưa chọn đối tượng', 'warning');
            }
        }
    }

    /**
     * Handle clear button click
     * @private
     */
    function handleClearButtonClick() {
        if (confirm('Xóa tất cả đối tượng?')) {
            MapShapes.clearAllShapes(false);

            if (window.MapUI) {
                MapUI.updateStatus('Đã xóa tất cả');
            }
        }
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Add text shape
     * @private
     */
    function addTextShape(text) {
        const canvas = MapCore.getCanvasDimensions();
        const shape = MapShapes.createText(text, {
            x: canvas.width / 2,
            y: canvas.height / 2,
            fill: MapTools.getToolConfig().stroke
        });

        const layer = MapCore.getLayer();
        if (layer) {
            layer.add(shape);
            layer.batchDraw();
        }

        setupShapeEvents(shape);

        if (window.MapDatabase) {
            saveShapeToDatabase(shape);
        }

        if (window.MapUI) {
            MapUI.updateStatus('Đã thêm văn bản');
        }
    }

    /**
     * Upload and add image
     * @private
     */
    async function uploadAndAddImage(file) {
        try {
            const imageUrl = await MapDatabase.uploadImage(file);

            const imageObj = new Image();
            imageObj.onload = function () {
                const canvas = MapCore.getCanvasDimensions();

                let width = Math.min(imageObj.width, 400);
                let height = Math.min(imageObj.height, 400);

                const shape = MapShapes.createImage(imageObj, {
                    x: canvas.width / 2 - width / 2,
                    y: canvas.height / 2 - height / 2,
                    width: width,
                    height: height
                });

                shape.setAttr('uploadedUrl', imageUrl);

                const layer = MapCore.getLayer();
                if (layer) {
                    layer.add(shape);
                    layer.batchDraw();
                }

                setupShapeEvents(shape);
                saveShapeToDatabase(shape);

                if (window.MapUI) {
                    MapUI.updateStatus('Đã thêm hình ảnh');
                }
            };
            imageObj.src = imageUrl;

        } catch (error) {
            console.error('❌ Failed to upload image:', error);
            alert('Lỗi khi tải ảnh: ' + error.message);
        }
    }

    /**
     * Delete shape
     * @private
     */
    function deleteShape(shape) {
        const dbId = shape.getAttr('dbId');

        // Remove from transformer
        const transformer = MapCore.getTransformer();
        if (transformer) {
            transformer.nodes([]);
        }

        // Destroy shape
        shape.destroy();

        // Redraw
        const layer = MapCore.getLayer();
        if (layer) layer.batchDraw();

        // Clear property panel
        if (MapProperties) {
            MapProperties.clearSelection();
        }

        // Delete from database
        if (dbId && window.MapDatabase) {
            MapDatabase.deleteObject(dbId);
        }

        if (window.MapUI) {
            MapUI.updateStatus('Đã xóa');
        }

        console.log('✓ Shape deleted');
    }

    /**
     * Save shape to database
     * @private
     */
    async function saveShapeToDatabase(shape) {
        const currentMapId = MapCore.getCurrentMapId();
        if (!currentMapId || !window.MapDatabase) return;

        try {
            const type = shape.getClassName().toLowerCase();
            const data = MapShapes.serializeShape(shape);

            let imageUrl = null;
            if (type === 'image') {
                imageUrl = shape.getAttr('uploadedUrl') ||
                    shape.getAttr('librarySource') ||
                    (shape.image() ? shape.image().src : null);
            }

            const id = await MapDatabase.createObject(currentMapId, type, data, imageUrl);
            shape.setAttr('dbId', id);

            console.log('✓ Shape saved to database:', id);

        } catch (error) {
            console.error('❌ Failed to save shape:', error);
        }
    }

    /**
     * Update shape in database
     * @private
     */
    async function updateShapeInDatabase(shape) {
        const dbId = shape.getAttr('dbId');
        if (!dbId || !window.MapDatabase) return;

        try {
            const type = shape.getClassName().toLowerCase();
            const data = MapShapes.serializeShape(shape);

            let imageUrl = null;
            if (type === 'image') {
                imageUrl = shape.getAttr('uploadedUrl') ||
                    shape.getAttr('librarySource') ||
                    (shape.image() ? shape.image().src : null);
            }

            await MapDatabase.updateObject(dbId, type, data, imageUrl);
            console.log('✓ Shape updated in database:', dbId);

        } catch (error) {
            console.error('❌ Failed to update shape:', error);
        }
    }

    /**
     * Update cursor based on state
     * @private
     */
    function updateCursor() {
        const stage = MapCore.getStage();
        if (!stage) return;

        const container = stage.container();

        if (isPanning) {
            container.style.cursor = 'grabbing';
        } else if (spacePressed) {
            container.style.cursor = 'grab';
        } else if (MapTools.getCurrentTool() === 'select') {
            container.style.cursor = 'default';
        } else {
            container.style.cursor = 'crosshair';
        }
    }

    // ==================== INITIALIZATION ====================

    /**
     * Setup all event handlers
     */
    function setupAllEvents() {
        setupStageEvents();
        setupKeyboardEvents();
        setupUIEvents();

        console.log('✓ All events setup complete');
    }

    // ==================== PUBLIC API ====================

    return {
        // Setup
        setupAllEvents,
        setupStageEvents,
        setupKeyboardEvents,
        setupUIEvents,
        setupShapeEvents,
        setupAllShapeEvents,

        // Selection
        selectShape,
        deselectAll,

        // Pan state
        isPanning: () => isPanning,
        isSpacePressed: () => spacePressed
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapEvents = MapEvents;
}

console.log('✓ MapEvents module loaded');