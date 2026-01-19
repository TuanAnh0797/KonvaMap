// Map Drawing Application - v5
// Added: Canvas boundary restrictions - cannot draw or drag outside canvas

let stage, layer, transformer;
let currentTool = 'select';

let canvasWidth = 1200;
let canvasHeight = 800;
let canvasScale = 1;
let canvasPosition = { x: 0, y: 0 };
let isPanning = false;
let lastPointerPosition = null;

let isDrawing = false;
let startPos = null;
let currentShape = null;
let selectedShape = null;

let currentMapId = null;
let spacePressed = false;

// Polygon drawing state
let polygonPoints = [];
let polygonLine = null;
let isDrawingPolygon = false;

// Canvas background rect reference
let canvasBackground = null;

$(document).ready(function () {
    console.log('=== MAP.JS v5 WITH CANVAS BOUNDARIES ===');

    if (typeof Konva === 'undefined') {
        console.error('❌ Konva not loaded!');
        alert('Lỗi: Konva.js chưa được tải. Vui lòng tải lại trang.');
        return;
    }

    console.log('✓ Konva loaded:', Konva.version);

    initializeMapSystem();
    setupEventHandlers();
    setupAdvancedPropertyHandlers();
    setupKeyboardControls();

    updateStatus('Sẵn sàng - Không thể vẽ/kéo ra ngoài canvas');
    $('#connectionStatus').removeClass('bg-secondary bg-warning').addClass('bg-success').text('Ready');





    console.log('=== MAP.JS READY ===');
});

// ============= CANVAS INITIALIZATION =============

function initializeCanvas(width, height) {
    const container = document.getElementById('container');

    if (!container) {
        console.error('❌ Container not found!');
        return;
    }

    canvasWidth = width || 1200;
    canvasHeight = height || 800;

    console.log('→ Creating canvas:', canvasWidth, 'x', canvasHeight);

    if (stage) {
        stage.destroy();
    }

    stage = new Konva.Stage({
        container: 'container',
        width: container.offsetWidth,
        height: container.offsetHeight
    });

    layer = new Konva.Layer();

    // Create canvas background
    canvasBackground = new Konva.Rect({
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: 'white',
        stroke: '#e0e0e0',
        strokeWidth: 1,
        listening: true,  // ✅ Enable listening for click events
        name: 'canvas-background'
    });
    layer.add(canvasBackground);

    stage.add(layer);

    transformer = new Konva.Transformer({
        rotateEnabled: true,
        keepRatio: false,
        borderStroke: '#0d6efd',
        borderStrokeWidth: 2,
        anchorStroke: '#0d6efd',
        anchorFill: 'white',
        anchorSize: 10,
        padding: 5,
        // ✅ Keep transformer inside canvas
        boundBoxFunc: function (oldBox, newBox) {
            // Limit transformer to canvas bounds
            if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
            }
            return newBox;
        }
    });
    layer.add(transformer);

    setupStageEvents();
    enableZoom();

    centerCanvas();
    updateZoomDisplay();

    console.log('✓ Canvas initialized with boundaries');
}

// ============= BOUNDARY CHECK FUNCTIONS =============

function isPositionInCanvas(pos) {
    // Convert stage position to layer position
    const layerPos = {
        x: (pos.x - canvasPosition.x) / canvasScale,
        y: (pos.y - canvasPosition.y) / canvasScale
    };

    // Check if position is inside canvas
    return layerPos.x >= 0 &&
        layerPos.x <= canvasWidth &&
        layerPos.y >= 0 &&
        layerPos.y <= canvasHeight;
}

function constrainPositionToCanvas(pos) {
    // Convert to layer position
    const layerPos = {
        x: (pos.x - canvasPosition.x) / canvasScale,
        y: (pos.y - canvasPosition.y) / canvasScale
    };

    // Constrain to canvas bounds
    layerPos.x = Math.max(0, Math.min(canvasWidth, layerPos.x));
    layerPos.y = Math.max(0, Math.min(canvasHeight, layerPos.y));

    return layerPos;
}

function setupDragBoundaries(shape) {
    shape.dragBoundFunc(function (pos) {
        // Get shape bounds
        const box = this.getClientRect({ relativeTo: layer });

        // Calculate constrained position
        let newX = pos.x;
        let newY = pos.y;

        // Left boundary
        if (pos.x < 0) {
            newX = 0;
        }
        // Right boundary
        if (pos.x + box.width > canvasWidth) {
            newX = canvasWidth - box.width;
        }
        // Top boundary
        if (pos.y < 0) {
            newY = 0;
        }
        // Bottom boundary
        if (pos.y + box.height > canvasHeight) {
            newY = canvasHeight - box.height;
        }

        return {
            x: newX,
            y: newY
        };
    });
}

// ============= STAGE EVENTS =============

function setupStageEvents() {
    stage.on('click tap', function (e) {
        if (currentTool !== 'select') return;

        // Check if clicked on canvas background or outside
        if (e.target === stage || e.target === canvasBackground) {
            deselectAll();
            return;
        }

        if (e.target !== layer && e.target !== transformer) {
            selectShape(e.target);
        }
    });

    stage.on('mousedown', function (e) {
        const pos = stage.getPointerPosition();

        // ✅ FIX: Middle mouse = pan (PRIORITY 1)
        if (e.evt.button === 1) {
            e.evt.preventDefault();
            isPanning = true;
            lastPointerPosition = pos;
            stage.container().style.cursor = 'grabbing';
            console.log('→ Pan started (middle mouse)');
            return;
        }

        // ✅ FIX: Space + left mouse = pan (PRIORITY 2)
        if (spacePressed && e.evt.button === 0) {
            e.evt.preventDefault();
            isPanning = true;
            lastPointerPosition = pos;
            stage.container().style.cursor = 'grabbing';
            console.log('→ Pan started (space + click)');
            return;
        }

        // Select mode - allow clicking on shapes
        if (currentTool === 'select') {
            return;
        }

        // ✅ POLYGON: Handle polygon clicks
        if (currentTool === 'polygon') {
            handlePolygonClick(pos);
            return;
        }

        // ✅ CHECK: Only start drawing if inside canvas
        if (!isPositionInCanvas(pos)) {
            console.log('⚠️ Cannot draw outside canvas');
            updateStatus('Không thể vẽ bên ngoài canvas', 'warning');
            return;
        }

        // Draw mode - only on canvas background or stage
        if (e.target !== stage && e.target !== canvasBackground) {
            return;
        }

        console.log('→ Mouse down at:', pos, 'tool:', currentTool);
        startDrawing(pos);
    });

    stage.on('mousemove', function (e) {
        const pos = stage.getPointerPosition();

        // ✅ FIX: Handle panning first (priority)
        if (isPanning) {
            if (!lastPointerPosition) {
                lastPointerPosition = pos;
                return;
            }

            const dx = pos.x - lastPointerPosition.x;
            const dy = pos.y - lastPointerPosition.y;

            canvasPosition.x += dx;
            canvasPosition.y += dy;

            updateCanvasTransform();
            lastPointerPosition = pos;

            // Important: Don't process drawing while panning
            return;
        }

        // ✅ POLYGON: Update preview line
        if (currentTool === 'polygon' && isDrawingPolygon && polygonLine) {
            updatePolygonPreview(pos);
            return;
        }

        // Handle drawing
        if (!isDrawing) return;

        // ✅ CONSTRAIN: Keep drawing inside canvas
        if (!isPositionInCanvas(pos)) {
            // Constrain to canvas edge
            const constrainedPos = {
                x: canvasPosition.x + Math.max(0, Math.min(canvasWidth, (pos.x - canvasPosition.x) / canvasScale)) * canvasScale,
                y: canvasPosition.y + Math.max(0, Math.min(canvasHeight, (pos.y - canvasPosition.y) / canvasScale)) * canvasScale
            };
            updateDrawing(constrainedPos);
        } else {
            updateDrawing(pos);
        }
    });

    stage.on('mouseup', function (e) {
        // ✅ FIX: Reset panning state
        if (isPanning) {
            isPanning = false;
            lastPointerPosition = null;
            updateCursor();
            console.log('→ Pan ended');
            return;
        }

        // Finish drawing
        if (!isDrawing) return;

        console.log('→ Mouse up, finishing drawing');
        finishDrawing();
    });

    stage.container().addEventListener('contextmenu', function (e) {
        if (e.button === 1) {
            e.preventDefault();
        }
    });
}

// ============= KEYBOARD CONTROLS =============

function setupKeyboardControls() {
    $(document).on('keydown', function (e) {
        if (e.code === 'Space' && !spacePressed) {
            spacePressed = true;
            if (!isDrawing && stage) {
                stage.container().style.cursor = 'grab';
            }
        }

        if (e.key === 'Delete' && selectedShape) {
            deleteSelectedShape();
        }

        if (e.key === 'Escape') {
            // Cancel polygon if drawing
            if (isDrawingPolygon) {
                cancelPolygon();
            } else {
                deselectAll();
            }
        }
    });

    $(document).on('keyup', function (e) {
        if (e.code === 'Space') {
            spacePressed = false;
            if (!isDrawing && !isPanning) {
                updateCursor();
            }
        }
    });

    console.log('✓ Keyboard controls enabled');
}

function updateCursor() {
    if (!stage) return;

    if (isPanning) {
        stage.container().style.cursor = 'grabbing';
    } else if (spacePressed) {
        stage.container().style.cursor = 'grab';
    } else if (currentTool === 'select') {
        stage.container().style.cursor = 'default';
    } else {
        stage.container().style.cursor = 'crosshair';
    }
}

// ============= EVENT HANDLERS SETUP =============

function setupEventHandlers() {
    console.log('→ Setting up event handlers');

    $('.tool-buttons button').off('click.bs.button');
    $('.tool-buttons button').removeAttr('data-bs-toggle');

    $('#selectBtn').on('click', function () { setTool('select'); });
    $('#rectBtn').on('click', function () { setTool('rect'); });
    $('#circleBtn').on('click', function () { setTool('circle'); });
    $('#ellipseBtn').on('click', function () { setTool('ellipse'); });
    $('#lineBtn').on('click', function () { setTool('line'); });
    $('#triangleBtn').on('click', function () { setTool('triangle'); });
    $('#starBtn').on('click', function () { setTool('star'); });
    $('#arrowBtn').on('click', function () { setTool('arrow'); });
    $('#polygonBtn').on('click', function () { setTool('polygon'); });

    $('#textBtn').on('click', function () {
        const text = prompt('Nhập văn bản:', 'Text');
        if (text) {
            addText(text);
        }
    });

    $('#imageBtn').on('click', function () {
        const choice = confirm(
            '📁 Chọn nguồn hình ảnh:\n\n' +
            '• OK = Thư viện hình ảnh (wwwroot/library/)\n' +
            '• Cancel = Tải lên từ máy tính'
        );

        if (choice) {
            openImageLibrary();
        } else {
            $('#imageInput').click();
        }
    });

    $('#imageInput').on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            uploadImage(file);
        }
        this.value = '';
    });

    $('#deleteBtn').on('click', function () {
        if (selectedShape) {
            deleteSelectedShape();
        } else {
            updateStatus('Chưa chọn đối tượng', 'warning');
        }
    });

    $('#clearBtn').on('click', function () {
        if (confirm('Xóa tất cả đối tượng?')) {
            clearAll();
        }
    });

    $('#saveBtn').on('click', function () {
        updateStatus('Đã lưu tự động');
    });

    $('#loadBtn').on('click', function () {
        loadAllObjects();
    });

    $('#colorPicker').on('change input', function () {
        if (selectedShape && currentTool === 'select') {
            applyColorToSelected($(this).val());
        }
    });

    $('#fillColorPicker').on('change input', function () {
        if (selectedShape && currentTool === 'select') {
            applyFillColorToSelected($(this).val());
        }
    });

    $('#strokeWidth').on('change input', function () {
        if (selectedShape && currentTool === 'select') {
            applyStrokeWidthToSelected(parseInt($(this).val()));
        }
        $('#strokeWidthValue').text($(this).val());
    });

    $('#opacity').on('change input', function () {
        if (selectedShape && currentTool === 'select') {
            applyOpacityToSelected(parseFloat($(this).val()));
        }
        $('#opacityValue').text(Math.round($(this).val() * 100) + '%');
    });

    $('#canvasSizeWidth, #canvasSizeHeight').on('input', function () {
        updateCanvasSizePreview();

        // ✅ Update highlights when user manually changes values
        const currentWidth = parseInt($('#canvasSizeWidth').val());
        const currentHeight = parseInt($('#canvasSizeHeight').val());

        // Temporarily update canvasWidth/Height for highlight check
        const savedW = canvasWidth;
        const savedH = canvasHeight;
        canvasWidth = currentWidth;
        canvasHeight = currentHeight;

        highlightMatchingPreset();

        // Restore original values (will be updated when user clicks Apply)
        canvasWidth = savedW;
        canvasHeight = savedH;
    });

    console.log('✓ Event handlers set up');
}

// ============= POLYGON DRAWING FUNCTIONS =============

function handlePolygonClick(pos) {
    // Check if inside canvas
    if (!isPositionInCanvas(pos)) {
        console.log('⚠️ Cannot draw polygon outside canvas');
        updateStatus('Không thể vẽ đa giác bên ngoài canvas', 'warning');
        return;
    }

    const layerPos = constrainPositionToCanvas(pos);

    // First click - start polygon
    if (!isDrawingPolygon) {
        startPolygon(layerPos);
        return;
    }

    // Check if clicking near first point to close polygon (within 10 pixels)
    const firstPoint = polygonPoints[0];
    const distance = Math.sqrt(
        Math.pow(layerPos.x - firstPoint.x, 2) +
        Math.pow(layerPos.y - firstPoint.y, 2)
    );

    if (distance < 10 && polygonPoints.length >= 3) {
        // Close polygon
        finishPolygon();
        return;
    }

    // Add point to polygon
    addPolygonPoint(layerPos);
}

function startPolygon(layerPos) {
    console.log('→ Starting polygon at:', layerPos);

    isDrawingPolygon = true;
    polygonPoints = [layerPos];

    const color = $('#colorPicker').val();
    const strokeWidth = parseInt($('#strokeWidth').val());

    // Create preview line
    polygonLine = new Konva.Line({
        points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y],
        stroke: color,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        dash: [5, 5],  // Dashed preview
        closed: false
    });

    layer.add(polygonLine);
    layer.batchDraw();

    updateStatus('Click để thêm điểm, click điểm đầu để đóng đa giác (tối thiểu 3 điểm)');
}

function addPolygonPoint(layerPos) {
    console.log('→ Adding polygon point:', layerPos);

    polygonPoints.push(layerPos);

    // Update preview line
    const flatPoints = [];
    polygonPoints.forEach(p => {
        flatPoints.push(p.x, p.y);
    });

    polygonLine.points(flatPoints);
    layer.batchDraw();

    updateStatus(`Đa giác: ${polygonPoints.length} điểm - Click điểm đầu để hoàn thành`);
}

function updatePolygonPreview(pos) {
    if (!polygonLine || polygonPoints.length === 0) return;

    const layerPos = constrainPositionToCanvas(pos);

    // Update preview with current mouse position
    const flatPoints = [];
    polygonPoints.forEach(p => {
        flatPoints.push(p.x, p.y);
    });

    // Add current mouse position as preview
    flatPoints.push(layerPos.x, layerPos.y);

    polygonLine.points(flatPoints);
    layer.batchDraw();
}

function finishPolygon() {
    if (polygonPoints.length < 3) {
        updateStatus('Đa giác cần ít nhất 3 điểm', 'warning');
        return;
    }

    console.log('→ Finishing polygon with', polygonPoints.length, 'points');

    const color = $('#colorPicker').val();
    const strokeWidth = parseInt($('#strokeWidth').val());

    // Convert points to flat array
    const flatPoints = [];
    polygonPoints.forEach(p => {
        flatPoints.push(p.x, p.y);
    });

    // Create final polygon
    const polygon = new Konva.Line({
        points: flatPoints,
        stroke: color,
        strokeWidth: strokeWidth,
        fill: 'transparent',
        closed: true,
        lineCap: 'round',
        lineJoin: 'round',
        draggable: true
    });

    // Remove preview line
    if (polygonLine) {
        polygonLine.destroy();
        polygonLine = null;
    }

    // Setup events and save
    setupDragBoundaries(polygon);
    setupShapeEvents(polygon);
    layer.add(polygon);
    layer.batchDraw();
    saveObject(polygon, 'line');  // Save as 'line' type since it's a Konva.Line

    // Reset polygon state
    isDrawingPolygon = false;
    polygonPoints = [];

    updateStatus('Đã tạo đa giác');
    console.log('✓ Polygon created');
}

function cancelPolygon() {
    console.log('→ Canceling polygon');

    if (polygonLine) {
        polygonLine.destroy();
        polygonLine = null;
    }

    isDrawingPolygon = false;
    polygonPoints = [];
    layer.batchDraw();

    updateStatus('Đã hủy vẽ đa giác');
}

// ============= IMAGE LIBRARY =============

function openImageLibrary() {
    const modal = new bootstrap.Modal(document.getElementById('imageLibraryModal'));
    modal.show();
    loadImageLibrary();
}

function loadImageLibrary() {
    $('#imageLibraryGrid').html(`
        <div class="text-center p-4">
            <div class="spinner-border"></div>
            <p class="mt-2">Đang tải thư viện...</p>
        </div>
    `);

    $.ajax({
        url: '/ImageLibrary/GetLibraryImages',
        type: 'GET',
        success: function (response) {
            if (response.success && response.images && response.images.length > 0) {
                displayImageLibrary(response.images);
            } else {
                $('#imageLibraryGrid').html(`
                    <div class="no-images-message">
                        <i class="bi bi-images"></i>
                        <h5>Chưa có hình ảnh</h5>
                        <p>Đặt ảnh vào <code>wwwroot/library/</code></p>
                    </div>
                `);
            }
        }
    });
}

function displayImageLibrary(images) {
    let html = '';
    images.forEach(img => {
        const sizeKB = Math.round(img.size / 1024);
        html += `
            <div class="library-image-item" onclick="selectLibraryImage('${img.url}', '${img.name}')">
                <img src="${img.url}" alt="${img.name}" loading="lazy">
                <div class="library-image-name">${img.name}</div>
                <div class="library-image-size">${sizeKB} KB</div>
            </div>
        `;
    });
    $('#imageLibraryGrid').html(html);

    $('#imageSearchBox').off('input').on('input', function () {
        const searchTerm = $(this).val().toLowerCase();
        $('.library-image-item').each(function () {
            const imageName = $(this).find('.library-image-name').text().toLowerCase();
            $(this).toggle(imageName.includes(searchTerm));
        });
    });
}

function selectLibraryImage(imageUrl, imageName) {
    $('#imageLibraryModal').modal('hide');

    const imageObj = new Image();
    imageObj.onload = function () {
        // Default position - center of canvas
        let x = canvasWidth / 2;
        let y = canvasHeight / 2;

        // Try to use mouse position if available
        const pos = stage.getPointerPosition();
        if (pos && isPositionInCanvas(pos)) {
            const layerPos = constrainPositionToCanvas(pos);
            x = layerPos.x;
            y = layerPos.y;
        }

        let width = imageObj.width;
        let height = imageObj.height;
        const maxSize = 400;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = width * ratio;
            height = height * ratio;
        }

        // ✅ ENSURE: Image is fully inside canvas
        if (x + width > canvasWidth) x = canvasWidth - width;
        if (y + height > canvasHeight) y = canvasHeight - height;
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        const img = new Konva.Image({
            x: x,
            y: y,
            image: imageObj,
            width: width,
            height: height,
            draggable: true
        });

        img.setAttr('librarySource', imageUrl);
        img.setAttr('libraryName', imageName);

        // ✅ ADD: Drag boundaries
        setupDragBoundaries(img);
        setupShapeEvents(img);

        layer.add(img);
        layer.batchDraw();
        saveObject(img, 'image');

        updateStatus('Đã thêm: ' + imageName);
    };
    imageObj.src = imageUrl;
}

// ============= TOOL MANAGEMENT =============

function setTool(tool) {
    // Cancel polygon if switching tools
    if (isDrawingPolygon && tool !== 'polygon') {
        cancelPolygon();
    }

    currentTool = tool;
    updateToolButtons();
    deselectAll();
    updateCursor();

    if (tool === 'select') {
        updateStatus('Chọn đối tượng - Không thể kéo ra ngoài canvas');
    } else if (tool === 'polygon') {
        updateStatus('Vẽ đa giác - Click để thêm điểm, Escape để hủy');
    } else {
        updateStatus('Vẽ ' + tool + ' - Chỉ trong canvas');
    }
}

function updateToolButtons() {
    $('.tool-buttons button, .accordion-body .btn').removeClass('active btn-primary').addClass('btn-outline-primary');

    const buttons = {
        'select': '#selectBtn', 'rect': '#rectBtn', 'circle': '#circleBtn',
        'ellipse': '#ellipseBtn', 'line': '#lineBtn', 'triangle': '#triangleBtn',
        'star': '#starBtn', 'arrow': '#arrowBtn', 'polygon': '#polygonBtn',
        'text': '#textBtn', 'image': '#imageBtn'
    };

    if (buttons[currentTool]) {
        $(buttons[currentTool]).removeClass('btn-outline-primary').addClass('btn-primary active');
    }
}

// ============= DRAWING FUNCTIONS =============

function startDrawing(pos) {
    isDrawing = true;
    startPos = pos;

    const color = $('#colorPicker').val();
    const strokeWidth = parseInt($('#strokeWidth').val());

    const layerPos = constrainPositionToCanvas(pos);

    if (currentTool === 'rect') {
        currentShape = new Konva.Rect({
            x: layerPos.x, y: layerPos.y, width: 0, height: 0,
            stroke: color, strokeWidth: strokeWidth, fill: 'transparent', draggable: false
        });
    } else if (currentTool === 'circle') {
        currentShape = new Konva.Circle({
            x: layerPos.x, y: layerPos.y, radius: 0,
            stroke: color, strokeWidth: strokeWidth, fill: 'transparent', draggable: false
        });
    } else if (currentTool === 'ellipse') {
        currentShape = new Konva.Ellipse({
            x: layerPos.x, y: layerPos.y, radiusX: 0, radiusY: 0,
            stroke: color, strokeWidth: strokeWidth, fill: 'transparent', draggable: false
        });
    } else if (currentTool === 'line') {
        currentShape = new Konva.Line({
            points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y],
            stroke: color, strokeWidth: strokeWidth, lineCap: 'round', draggable: false
        });
    } else if (currentTool === 'arrow') {
        currentShape = new Konva.Arrow({
            points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y],
            stroke: color, strokeWidth: strokeWidth, fill: color,
            pointerLength: 10, pointerWidth: 10, draggable: false
        });
    } else if (currentTool === 'triangle') {
        currentShape = new Konva.Line({
            points: [layerPos.x, layerPos.y, layerPos.x, layerPos.y, layerPos.x, layerPos.y],
            stroke: color, strokeWidth: strokeWidth, fill: 'transparent',
            closed: true, draggable: false
        });
        currentShape.setAttr('shapeType', 'triangle');
    } else if (currentTool === 'star') {
        currentShape = new Konva.Star({
            x: layerPos.x, y: layerPos.y, numPoints: 5,
            innerRadius: 0, outerRadius: 0,
            stroke: color, strokeWidth: strokeWidth, fill: 'transparent', draggable: false
        });
    }

    if (currentShape) {
        layer.add(currentShape);
        layer.batchDraw();
    }
}

function updateDrawing(pos) {
    if (!currentShape || !startPos) return;

    const layerPos = constrainPositionToCanvas(pos);
    const startLayerPos = constrainPositionToCanvas(startPos);

    const dx = layerPos.x - startLayerPos.x;
    const dy = layerPos.y - startLayerPos.y;

    if (currentTool === 'rect') {
        currentShape.width(dx);
        currentShape.height(dy);
    } else if (currentTool === 'circle') {
        currentShape.radius(Math.sqrt(dx * dx + dy * dy));
    } else if (currentTool === 'ellipse') {
        currentShape.radiusX(Math.abs(dx));
        currentShape.radiusY(Math.abs(dy));
    } else if (currentTool === 'line' || currentTool === 'arrow') {
        currentShape.points([startLayerPos.x, startLayerPos.y, layerPos.x, layerPos.y]);
    } else if (currentTool === 'triangle') {
        const height = dy;
        const base = height * 1.1547;
        currentShape.points([
            startLayerPos.x, startLayerPos.y,
            startLayerPos.x - base / 2, startLayerPos.y + height,
            startLayerPos.x + base / 2, startLayerPos.y + height
        ]);
    } else if (currentTool === 'star') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        currentShape.outerRadius(radius);
        currentShape.innerRadius(radius * 0.5);
    }

    layer.batchDraw();
}

function finishDrawing() {
    isDrawing = false;
    startPos = null;

    if (currentShape) {
        let hasSize = false;

        if (currentTool === 'rect') {
            hasSize = Math.abs(currentShape.width()) > 5 && Math.abs(currentShape.height()) > 5;
        } else if (currentTool === 'circle') {
            hasSize = currentShape.radius() > 5;
        } else if (currentTool === 'ellipse') {
            hasSize = currentShape.radiusX() > 5 || currentShape.radiusY() > 5;
        } else if (currentTool === 'line' || currentTool === 'arrow') {
            const points = currentShape.points();
            const dx = points[2] - points[0];
            const dy = points[3] - points[1];
            hasSize = Math.sqrt(dx * dx + dy * dy) > 5;
        } else {
            hasSize = true;
        }

        if (!hasSize) {
            currentShape.destroy();
            currentShape = null;
            layer.batchDraw();
            updateStatus('Hình quá nhỏ');
            return;
        }

        currentShape.draggable(true);

        // ✅ ADD: Drag boundaries
        setupDragBoundaries(currentShape);
        setupShapeEvents(currentShape);

        saveObject(currentShape, currentShape.getClassName().toLowerCase());
        currentShape = null;
        layer.batchDraw();
        updateStatus('Đã tạo đối tượng');
    }
}

// ============= SHAPE MANAGEMENT =============

function setupShapeEvents(shape) {
    shape.on('dragstart', function () {
        if (currentTool === 'select') selectedShape = shape;
    });

    shape.on('dragend', function () {
        if (currentTool === 'select') {
            transformer.nodes([shape]);
            layer.batchDraw();
        }
        updateObject(shape);
    });

    shape.on('transformend', function () {
        // ✅ ENSURE: After transform, shape stays in canvas
        const box = shape.getClientRect({ relativeTo: layer });

        let newX = shape.x();
        let newY = shape.y();

        if (box.x < 0) newX = newX - box.x;
        if (box.y < 0) newY = newY - box.y;
        if (box.x + box.width > canvasWidth) newX = newX - (box.x + box.width - canvasWidth);
        if (box.y + box.height > canvasHeight) newY = newY - (box.y + box.height - canvasHeight);

        shape.position({ x: newX, y: newY });

        updateObject(shape);
        layer.batchDraw();
    });

    shape.on('dblclick dbltap', function (e) {
        e.cancelBubble = true;
        if (shape.getClassName() === 'Text' && typeof showTextEditor !== 'undefined') {
            showTextEditor(shape);
        }
    });
}

function selectShape(shape) {
    selectedShape = shape;
    transformer.nodes([shape]);
    layer.batchDraw();
    updatePropertyPanel(shape);
    updateStatus('Đã chọn: ' + shape.getClassName());
}

function deselectAll() {
    transformer.nodes([]);
    selectedShape = null;
    layer.batchDraw();
    updatePropertyPanel(null);
}

function deleteSelectedShape() {
    if (!selectedShape) return;

    const shapeId = selectedShape.getAttr('dbId');
    transformer.nodes([]);
    selectedShape.destroy();
    selectedShape = null;
    layer.batchDraw();
    updatePropertyPanel(null);

    if (shapeId) deleteObject(shapeId);
    updateStatus('Đã xóa');
}

function clearAll() {
    transformer.nodes([]);
    selectedShape = null;

    const shapes = layer.children.filter(child =>
        child !== transformer &&
        child !== canvasBackground
    );

    shapes.forEach(shape => shape.destroy());
    layer.batchDraw();
    updatePropertyPanel(null);
    updateStatus('Đã xóa tất cả');
}

// ============= PROPERTY MANAGEMENT =============

function updatePropertyPanel(shape) {
    if (!shape) {
        // Reset all fields
        $('#colorPicker').val('#000000').prop('disabled', true);
        $('#fillColorPicker').val('#ffffff').prop('disabled', true);
        $('#strokeWidth').val(2).prop('disabled', true);
        $('#opacity').val(1).prop('disabled', true);
        $('#strokeWidthValue').text('2');
        $('#opacityValue').text('100%');
        $('#selectedObjectInfo').html('<i class="bi bi-info-circle"></i> Chưa chọn');

        // ✅ NEW: Reset position, size, rotation
        $('#positionX').val(0).prop('disabled', true);
        $('#positionY').val(0).prop('disabled', true);
        $('#objectWidth').val(0).prop('disabled', true);
        $('#objectHeight').val(0).prop('disabled', true);
        $('#rotation').val(0).prop('disabled', true);
        $('#rotationValue').text('0°');

        // ✅ NEW: Reset lock button
        $('#lockToggleBtn').prop('disabled', true);

        // ✅ NEW: Reset advanced properties
        $('#scaleX').val(1).prop('disabled', true);
        $('#scaleY').val(1).prop('disabled', true);
        $('#skewX').val(0).prop('disabled', true);
        $('#skewY').val(0).prop('disabled', true);
        $('#scaleXValue').text('1.0');
        $('#scaleYValue').text('1.0');
        $('#skewXValue').text('0');
        $('#skewYValue').text('0');
        $('#bringToFrontBtn').prop('disabled', true);
        $('#sendToBackBtn').prop('disabled', true);

        return;
    }

    // Basic properties
    const stroke = shape.stroke() || '#000000';
    const fill = shape.fill() || 'transparent';
    const strokeWidth = shape.strokeWidth() || 2;
    const opacity = shape.opacity() || 1;

    $('#colorPicker').val(stroke).prop('disabled', false);
    $('#fillColorPicker').val(fill === 'transparent' ? '#ffffff' : fill).prop('disabled', false);
    $('#strokeWidth').val(strokeWidth).prop('disabled', false);
    $('#opacity').val(opacity).prop('disabled', false);
    $('#strokeWidthValue').text(strokeWidth);
    $('#opacityValue').text(Math.round(opacity * 100) + '%');

    const info = `${shape.getClassName()} (ID: ${shape.getAttr('dbId') || 'new'})`;
    $('#selectedObjectInfo').html(`<i class="bi bi-check-circle"></i> ${info}`);

    // ✅ NEW: Position (X, Y)
    const x = Math.round(shape.x());
    const y = Math.round(shape.y());
    $('#positionX').val(x).prop('disabled', false);
    $('#positionY').val(y).prop('disabled', false);

    // ✅ NEW: Size (Width, Height) - depends on shape type
    const className = shape.getClassName();
    if (className === 'Rect') {
        const width = Math.round(shape.width() * (shape.scaleX() || 1));
        const height = Math.round(shape.height() * (shape.scaleY() || 1));
        $('#objectWidth').val(width).prop('disabled', false);
        $('#objectHeight').val(height).prop('disabled', false);
        $('#sizeSection').show();
    } else if (className === 'Circle') {
        const radius = Math.round(shape.radius());
        $('#objectWidth').val(radius).prop('disabled', false);
        $('#objectHeight').val(radius).prop('disabled', false);
        $('#sizeSection').show();
        // Change labels for circle
        $('#sizeSection label').first().text('R:');
        $('#sizeSection .col-6').last().hide();
    } else if (className === 'Ellipse') {
        const rx = Math.round(shape.radiusX());
        const ry = Math.round(shape.radiusY());
        $('#objectWidth').val(rx).prop('disabled', false);
        $('#objectHeight').val(ry).prop('disabled', false);
        $('#sizeSection').show();
        // Change labels for ellipse
        $('#sizeSection label').first().text('RX:');
        $('#sizeSection label').last().text('RY:');
    } else {
        // For Line, Arrow, Text, etc - hide size section
        $('#sizeSection').hide();
    }

    // ✅ NEW: Rotation
    const rotation = Math.round(shape.rotation() || 0);
    $('#rotation').val(rotation).prop('disabled', false);
    $('#rotationValue').text(rotation + '°');

    // ✅ NEW: Lock/Unlock status
    const isLocked = !shape.draggable();
    $('#lockToggleBtn').prop('disabled', false);
    if (isLocked) {
        $('#lockToggleBtn')
            .removeClass('btn-outline-warning')
            .addClass('btn-warning');
        $('#lockToggleBtn i').removeClass('bi-unlock').addClass('bi-lock');
        $('#lockToggleText').text('Mở khóa');
    } else {
        $('#lockToggleBtn')
            .removeClass('btn-warning')
            .addClass('btn-outline-warning');
        $('#lockToggleBtn i').removeClass('bi-lock').addClass('bi-unlock');
        $('#lockToggleText').text('Khóa di chuyển');
    }

    // ✅ NEW: Advanced properties
    const scaleX = shape.scaleX() || 1;
    const scaleY = shape.scaleY() || 1;
    const skewX = shape.skewX() || 0;
    const skewY = shape.skewY() || 0;

    $('#scaleX').val(scaleX).prop('disabled', false);
    $('#scaleY').val(scaleY).prop('disabled', false);
    $('#skewX').val(skewX).prop('disabled', false);
    $('#skewY').val(skewY).prop('disabled', false);

    $('#scaleXValue').text(scaleX.toFixed(1));
    $('#scaleYValue').text(scaleY.toFixed(1));
    $('#skewXValue').text(skewX.toFixed(1));
    $('#skewYValue').text(skewY.toFixed(1));

    $('#bringToFrontBtn').prop('disabled', false);
    $('#sendToBackBtn').prop('disabled', false);
}

function applyColorToSelected(color) {
    if (!selectedShape) return;
    selectedShape.stroke(color);
    layer.batchDraw();
    updateObject(selectedShape);
}

function applyFillColorToSelected(color) {
    if (!selectedShape) return;
    selectedShape.fill(color);
    layer.batchDraw();
    updateObject(selectedShape);
}

function applyStrokeWidthToSelected(width) {
    if (!selectedShape) return;
    selectedShape.strokeWidth(width);
    layer.batchDraw();
    updateObject(selectedShape);
}

function applyOpacityToSelected(opacity) {
    if (!selectedShape) return;
    selectedShape.opacity(opacity);
    layer.batchDraw();
    updateObject(selectedShape);
}

// ============= TEXT & IMAGE =============

function addText(initialText) {
    // Center position or constrained mouse position
    let x = canvasWidth / 2;
    let y = canvasHeight / 2;

    const pos = stage.getPointerPosition();
    if (pos && isPositionInCanvas(pos)) {
        const layerPos = constrainPositionToCanvas(pos);
        x = layerPos.x;
        y = layerPos.y;
    }

    const textNode = new Konva.Text({
        x: x, y: y,
        text: initialText || 'Text',
        fontSize: 24, fontFamily: 'Arial',
        fill: $('#colorPicker').val(),
        draggable: true, align: 'left'
    });

    // ✅ ADD: Drag boundaries
    setupDragBoundaries(textNode);
    setupShapeEvents(textNode);

    layer.add(textNode);
    layer.batchDraw();
    saveObject(textNode, 'text');
    updateStatus('Đã thêm văn bản');
}

function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    $.ajax({
        url: '/Map/UploadImage',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            if (response.success) {
                const imageObj = new Image();
                imageObj.onload = function () {
                    // Center position
                    let x = canvasWidth / 2;
                    let y = canvasHeight / 2;

                    const pos = stage.getPointerPosition();
                    if (pos && isPositionInCanvas(pos)) {
                        const layerPos = constrainPositionToCanvas(pos);
                        x = layerPos.x;
                        y = layerPos.y;
                    }

                    let width = Math.min(imageObj.width, 400);
                    let height = Math.min(imageObj.height, 400);

                    // ✅ ENSURE: Image fits in canvas
                    if (x + width > canvasWidth) x = canvasWidth - width;
                    if (y + height > canvasHeight) y = canvasHeight - height;
                    if (x < 0) x = 0;
                    if (y < 0) y = 0;

                    const img = new Konva.Image({
                        x: x, y: y,
                        image: imageObj,
                        width: width,
                        height: height,
                        draggable: true
                    });

                    img.setAttr('uploadedUrl', response.imageUrl);

                    // ✅ ADD: Drag boundaries
                    setupDragBoundaries(img);
                    setupShapeEvents(img);

                    layer.add(img);
                    layer.batchDraw();
                    saveObject(img, 'image');
                    updateStatus('Đã thêm hình ảnh');
                };
                imageObj.src = response.imageUrl;
            }
        }
    });
}

// ============= DATABASE =============

function saveObject(shape, type) {
    if (!currentMapId) {
        console.error('❌ No current map!');
        return;
    }

    const data = JSON.stringify(shape.toObject());
    let imageUrl = null;

    if (type === 'image') {
        imageUrl = shape.getAttr('librarySource') ||
            shape.getAttr('uploadedUrl') ||
            (shape.image() ? shape.image().src : null);
    }

    $.ajax({
        url: '/Map/CreateObject',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            MapId: currentMapId,
            Type: type,
            Data: data,
            ImageUrl: imageUrl
        }),
        success: function (response) {
            if (response.success) {
                shape.setAttr('dbId', response.id);
                console.log('✓ Saved ID:', response.id);
            }
        }
    });
}

function updateObject(shape) {
    const dbId = shape.getAttr('dbId');
    if (!dbId) return;

    const data = JSON.stringify(shape.toObject());
    const type = shape.getClassName().toLowerCase();

    let imageUrl = null;
    if (type === 'image') {
        imageUrl = shape.getAttr('librarySource') ||
            shape.getAttr('uploadedUrl') ||
            (shape.image() ? shape.image().src : null);
    }

    $.ajax({
        url: '/Map/UpdateObject',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            Id: dbId,
            Type: type,
            Data: data,
            ImageUrl: imageUrl
        })
    });
}

function deleteObject(id) {
    $.post('/Map/DeleteObject', { id: id });
}

function loadAllObjects() {
    if (!currentMapId) return;

    $.ajax({
        url: '/Map/GetMapObjects',
        type: 'GET',
        data: { mapId: currentMapId },
        success: function (data) {
            if (!Array.isArray(data)) return;

            if (transformer) transformer.nodes([]);
            selectedShape = null;

            const shapes = layer.children.filter(child =>
                child !== transformer &&
                child !== canvasBackground
            );
            shapes.forEach(shape => shape.destroy());

            data.forEach(obj => loadShape(obj));
            layer.batchDraw();
            updateStatus('Đã tải ' + data.length + ' đối tượng');
        }
    });
}

function loadShape(obj) {
    try {
        if (!obj.data) return false;

        const shapeData = JSON.parse(obj.data);
        let shape;

        if (obj.type === 'rect') shape = new Konva.Rect(shapeData);
        else if (obj.type === 'circle') shape = new Konva.Circle(shapeData);
        else if (obj.type === 'ellipse') shape = new Konva.Ellipse(shapeData);
        else if (obj.type === 'line') shape = new Konva.Line(shapeData);
        else if (obj.type === 'arrow') shape = new Konva.Arrow(shapeData);
        else if (obj.type === 'star') shape = new Konva.Star(shapeData);
        else if (obj.type === 'text') shape = new Konva.Text(shapeData);
        else if (obj.type === 'image') {
            if (!obj.imageUrl) return false;

            const imageObj = new Image();
            imageObj.onload = function () {
                const img = new Konva.Image({ ...shapeData, image: imageObj });
                img.setAttr('dbId', obj.id);

                if (obj.imageUrl.startsWith('/library/')) {
                    img.setAttr('librarySource', obj.imageUrl);
                } else {
                    img.setAttr('uploadedUrl', obj.imageUrl);
                }

                // ✅ ADD: Drag boundaries
                setupDragBoundaries(img);
                setupShapeEvents(img);

                layer.add(img);
                layer.batchDraw();
            };
            imageObj.src = obj.imageUrl;
            return true;
        } else {
            return false;
        }

        if (shape) {
            shape.setAttr('dbId', obj.id);
            shape.draggable(true);

            // ✅ ADD: Drag boundaries
            setupDragBoundaries(shape);
            setupShapeEvents(shape);

            layer.add(shape);
            return true;
        }

        return false;
    } catch (e) {
        console.error('❌ Load error:', obj.id, e);
        return false;
    }
}

// ============= MAP SYSTEM =============

function initializeMapSystem() {
    const savedMapId = localStorage.getItem('currentMapId');

    if (savedMapId && savedMapId !== 'null') {
        currentMapId = parseInt(savedMapId);
        console.log('→ Restored map ID:', currentMapId);
        loadMapCanvasSize();
    } else {
        console.log('→ Creating default map');
        createDefaultMap();
    }
}

function loadMapCanvasSize() {
    $.ajax({
        url: '/Map/GetCanvasSize',
        type: 'GET',
        data: { mapId: currentMapId },
        success: function (response) {
            if (response.success) {
                const width = response.width || 1200;
                const height = response.height || 800;

                initializeCanvas(width, height);

                setTimeout(() => {
                    loadAllObjects();
                }, 100);

                updateCurrentMapDisplay();
            } else {
                initializeCanvas(1200, 800);
                loadAllObjects();
                updateCurrentMapDisplay();
            }
        },
        error: function () {
            initializeCanvas(1200, 800);
            loadAllObjects();
            updateCurrentMapDisplay();
        }
    });
}

function saveCanvasSize() {
    if (!currentMapId) return;

    $.ajax({
        url: '/Map/UpdateCanvasSize',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            MapId: currentMapId,
            Width: canvasWidth,
            Height: canvasHeight
        }),
        success: function (response) {
            if (response.success) {
                console.log('✓ Canvas size saved');
                updateStatus('Đã lưu kích thước: ' + canvasWidth + 'x' + canvasHeight);
            }
        }
    });
}

function createDefaultMap() {
    $.ajax({
        url: '/Map/CreateMap',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            Name: 'Bản đồ mặc định',
            Description: 'Map được tạo tự động'
        }),
        success: function (response) {
            if (response.success) {
                currentMapId = response.id;
                localStorage.setItem('currentMapId', currentMapId);

                initializeCanvas(1200, 800);
                saveCanvasSize();
                updateCurrentMapDisplay();
            }
        }
    });
}

function updateCurrentMapDisplay() {
    if (!currentMapId) {
        $('#currentMapName').text('Chưa chọn');
        $('#sidebarCurrentMapName').text('Chưa chọn');
        return;
    }

    $.get('/Map/GetAllMaps', function (data) {
        if (data.success) {
            const currentMap = data.maps.find(m => m.id === currentMapId);
            if (currentMap) {
                $('#currentMapName').text(currentMap.name);
                $('#sidebarCurrentMapName').text(currentMap.name);
            }
        }
    });
}

function openMapManager() {
    const modal = new bootstrap.Modal(document.getElementById('mapManagerModal'));
    modal.show();
    loadMapList();
}

function loadMapList() {
    $('#mapListContainer').html('<div class="text-center p-4"><div class="spinner-border"></div></div>');

    $.get('/Map/GetAllMaps', function (data) {
        if (data.success && data.maps.length > 0) {
            let html = '<div class="maps-grid">';
            data.maps.forEach(map => {
                const isActive = map.id === currentMapId;
                html += `
                    <div class="map-card ${isActive ? 'active' : ''}" onclick="selectMap(${map.id})">
                        <div class="map-card-header">
                            <h5>${map.name} ${isActive ? '<span class="current-map-badge">Đang mở</span>' : ''}</h5>
                            <span class="map-object-count">${map.objectCount} đối tượng</span>
                        </div>
                        ${map.description ? `<div class="map-card-description">${map.description}</div>` : ''}
                        <div class="map-card-footer">
                            <div class="map-card-actions">
                                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); selectMap(${map.id})">Mở</button>
                                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteMap(${map.id})">Xóa</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            $('#mapListContainer').html(html);
        }
    });
}

function selectMap(mapId) {
    currentMapId = mapId;
    localStorage.setItem('currentMapId', currentMapId);
    loadMapCanvasSize();
    $('#mapManagerModal').modal('hide');
    updateStatus('Đã chuyển map: ' + mapId);
}

function showCreateMapForm() {
    $('#mapFormId').val(0);
    $('#mapFormName').val('');
    $('#mapFormDescription').val('');
    const modal = new bootstrap.Modal(document.getElementById('mapFormModal'));
    modal.show();
}

function saveMapForm() {
    const name = $('#mapFormName').val().trim();
    if (!name) {
        alert('Vui lòng nhập tên map');
        return;
    }

    $.ajax({
        url: '/Map/CreateMap',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            Name: name,
            Description: $('#mapFormDescription').val().trim()
        }),
        success: function (response) {
            if (response.success) {
                currentMapId = response.id;
                localStorage.setItem('currentMapId', currentMapId);

                initializeCanvas(1200, 800);
                saveCanvasSize();

                updateCurrentMapDisplay();
                $('#mapFormModal').modal('hide');
                loadMapList();
            }
        }
    });
}

function deleteMap(mapId) {
    if (mapId === currentMapId) {
        alert('Không thể xóa map đang mở!');
        return;
    }

    if (confirm('Xóa map này?')) {
        $.post('/Map/DeleteMap', { id: mapId }, function (response) {
            if (response.success) {
                loadMapList();
            }
        });
    }
}

// ============= ZOOM =============

function enableZoom() {
    stage.on('wheel', function (e) {
        e.evt.preventDefault();

        const oldScale = canvasScale;
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - canvasPosition.x) / oldScale,
            y: (pointer.y - canvasPosition.y) / oldScale
        };

        const scaleBy = 1.1;
        const direction = e.evt.deltaY > 0 ? -1 : 1;

        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(0.1, Math.min(5, newScale));

        canvasScale = newScale;

        canvasPosition.x = pointer.x - mousePointTo.x * newScale;
        canvasPosition.y = pointer.y - mousePointTo.y * newScale;

        updateCanvasTransform();
        updateZoomDisplay();
    });
}

function centerCanvas() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    canvasPosition.x = (containerWidth - canvasWidth * canvasScale) / 2;
    canvasPosition.y = (containerHeight - canvasHeight * canvasScale) / 2;

    updateCanvasTransform();
}

function updateCanvasTransform() {
    stage.position(canvasPosition);
    stage.scale({ x: canvasScale, y: canvasScale });
    layer.batchDraw();
}

function updateZoomDisplay() {
    const percentage = Math.round(canvasScale * 100);
    $('#zoomPercentage').text(percentage + '%');
}

function zoomIn() {
    canvasScale = Math.min(5, canvasScale * 1.2);
    centerCanvas();
    updateZoomDisplay();
}

function zoomOut() {
    canvasScale = Math.max(0.1, canvasScale / 1.2);
    centerCanvas();
    updateZoomDisplay();
}

function zoomReset() {
    canvasScale = 1;
    centerCanvas();
    updateZoomDisplay();
}

function zoomFit() {
    const container = document.getElementById('container');
    const scaleX = container.offsetWidth / canvasWidth;
    const scaleY = container.offsetHeight / canvasHeight;
    canvasScale = Math.min(scaleX, scaleY) * 0.9;
    centerCanvas();
    updateZoomDisplay();
}

// ============= CANVAS SIZE SETTINGS =============

function showCanvasSizeSettings() {
    // Set current values
    $('#canvasSizeWidth').val(canvasWidth);
    $('#canvasSizeHeight').val(canvasHeight);

    // Update preview
    updateCanvasSizePreview();

    // ✅ Highlight matching preset button
    highlightMatchingPreset();

    const modal = new bootstrap.Modal(document.getElementById('canvasSizeModal'));
    modal.show();
}

function highlightMatchingPreset() {
    // Remove all highlights
    $('#canvasSizeModal .btn-outline-secondary, #canvasSizeModal .btn-outline-primary')
        .removeClass('btn-primary btn-outline-primary')
        .addClass('btn-outline-secondary');

    // Define presets
    const presets = [
        { w: 800, h: 600, selector: '[onclick*="800, 600"]' },
        { w: 1200, h: 800, selector: '[onclick*="1200, 800"]' },
        { w: 1920, h: 1080, selector: '[onclick*="1920, 1080"]' },
        { w: 1080, h: 1920, selector: '[onclick*="1080, 1920"]' },
        { w: 1000, h: 1000, selector: '[onclick*="1000, 1000"]' },
        { w: 794, h: 1123, selector: '[onclick*="794, 1123"]' },
        { w: 1123, h: 794, selector: '[onclick*="1123, 794"]' },
        { w: 2560, h: 1080, selector: '[onclick*="2560, 1080"]' },
        { w: 3840, h: 2160, selector: '[onclick*="3840, 2160"]' }
    ];

    // Find matching preset
    const matching = presets.find(p => p.w === canvasWidth && p.h === canvasHeight);

    if (matching) {
        $(matching.selector)
            .removeClass('btn-outline-secondary')
            .addClass('btn-primary');
        console.log('✓ Highlighted preset:', canvasWidth, 'x', canvasHeight);
    } else {
        console.log('→ Custom size:', canvasWidth, 'x', canvasHeight);
    }
}

function updateCanvasSizePreview() {
    const width = parseInt($('#canvasSizeWidth').val());
    const height = parseInt($('#canvasSizeHeight').val());
    $('#canvasSizePreview').text(`${width} × ${height} pixels`);

    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    $('#canvasAspectRatio').text(`Tỷ lệ: ${width / divisor}:${height / divisor}`);
}

function setCanvasPreset(width, height) {
    $('#canvasSizeWidth').val(width);
    $('#canvasSizeHeight').val(height);
    updateCanvasSizePreview();

    // ✅ Update button highlights
    highlightMatchingPreset();
}

function applyCanvasSize() {
    const newWidth = parseInt($('#canvasSizeWidth').val());
    const newHeight = parseInt($('#canvasSizeHeight').val());

    if (newWidth < 400 || newHeight < 300) {
        alert('Kích thước tối thiểu: 400x300');
        return;
    }

    if (newWidth > 10000 || newHeight > 10000) {
        alert('Kích thước tối đa: 10000x10000');
        return;
    }

    canvasWidth = newWidth;
    canvasHeight = newHeight;

    // Update background
    if (canvasBackground) {
        canvasBackground.width(canvasWidth);
        canvasBackground.height(canvasHeight);
    }

    centerCanvas();
    $('#canvasSizeModal').modal('hide');

    saveCanvasSize();

    console.log('✓ Canvas resized:', canvasWidth, 'x', canvasHeight);
}

// ============= UTILITY =============

function updateStatus(message, type = 'info') {
    $('#statusText').text(message);

    if (type === 'error') {
        $('#statusText').css('color', 'red');
    } else if (type === 'warning') {
        $('#statusText').css('color', 'orange');
    } else {
        $('#statusText').css('color', 'white');
    }
}

// ✅ NEW: Apply position changes
function applyPositionToSelected(x, y) {
    if (!selectedShape) return;

    // Constrain to canvas
    x = Math.max(0, Math.min(canvasWidth, x));
    y = Math.max(0, Math.min(canvasHeight, y));

    selectedShape.position({ x, y });
    layer.batchDraw();
    updateObject(selectedShape);
    console.log('→ Position updated:', x, y);
}

// ✅ NEW: Apply size changes
function applySizeToSelected(width, height) {
    if (!selectedShape) return;

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

    layer.batchDraw();
    updateObject(selectedShape);
    console.log('→ Size updated:', width, height);
}

// ✅ NEW: Apply rotation
function applyRotationToSelected(rotation) {
    if (!selectedShape) return;
    selectedShape.rotation(rotation);
    layer.batchDraw();
    updateObject(selectedShape);
    $('#rotationValue').text(rotation + '°');
}

// ✅ NEW: Toggle lock/unlock
function toggleLockShape() {
    if (!selectedShape) return;

    const isLocked = !selectedShape.draggable();
    selectedShape.draggable(isLocked);

    if (isLocked) {
        // Unlocking
        $('#lockToggleBtn')
            .removeClass('btn-warning')
            .addClass('btn-outline-warning');
        $('#lockToggleBtn i').removeClass('bi-lock').addClass('bi-unlock');
        $('#lockToggleText').text('Khóa di chuyển');
        updateStatus('Đã mở khóa - Có thể di chuyển');
    } else {
        // Locking
        $('#lockToggleBtn')
            .removeClass('btn-outline-warning')
            .addClass('btn-warning');
        $('#lockToggleBtn i').removeClass('bi-unlock').addClass('bi-lock');
        $('#lockToggleText').text('Mở khóa');
        updateStatus('Đã khóa - Không thể di chuyển');
    }

    updateObject(selectedShape);
}

// ✅ NEW: Apply scale
function applyScaleToSelected(scaleX, scaleY) {
    if (!selectedShape) return;
    selectedShape.scaleX(scaleX);
    selectedShape.scaleY(scaleY);
    layer.batchDraw();
    updateObject(selectedShape);
    $('#scaleXValue').text(scaleX.toFixed(1));
    $('#scaleYValue').text(scaleY.toFixed(1));
}

// ✅ NEW: Apply skew
function applySkewToSelected(skewX, skewY) {
    if (!selectedShape) return;
    selectedShape.skewX(skewX);
    selectedShape.skewY(skewY);
    layer.batchDraw();
    updateObject(selectedShape);
    $('#skewXValue').text(skewX.toFixed(1));
    $('#skewYValue').text(skewY.toFixed(1));
}

// ✅ NEW: Bring to front
function bringSelectedToFront() {
    if (!selectedShape) return;
    selectedShape.moveToTop();
    transformer.moveToTop();
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Đã đưa lên trên');
}

// ✅ NEW: Send to back
function sendSelectedToBack() {
    if (!selectedShape) return;
    selectedShape.moveToBottom();
    // Keep background at bottom
    if (canvasBackground) {
        canvasBackground.moveToBottom();
    }
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Đã đưa xuống dưới');
}

// ============= EVENT HANDLERS FOR NEW PROPERTIES =============

function setupAdvancedPropertyHandlers() {
    // Position X, Y
    $('#positionX').on('change', function () {
        const x = parseInt($(this).val());
        const y = parseInt($('#positionY').val());
        applyPositionToSelected(x, y);
    });

    $('#positionY').on('change', function () {
        const x = parseInt($('#positionX').val());
        const y = parseInt($(this).val());
        applyPositionToSelected(x, y);
    });

    // Size Width, Height
    $('#objectWidth').on('change', function () {
        const w = parseInt($(this).val());
        const h = parseInt($('#objectHeight').val());
        applySizeToSelected(w, h);
    });

    $('#objectHeight').on('change', function () {
        const w = parseInt($('#objectWidth').val());
        const h = parseInt($(this).val());
        applySizeToSelected(w, h);
    });

    // Rotation
    $('#rotation').on('input change', function () {
        const rotation = parseInt($(this).val());
        applyRotationToSelected(rotation);
    });

    // Lock/Unlock
    $('#lockToggleBtn').on('click', function () {
        toggleLockShape();
    });

    // Scale X, Y
    $('#scaleX').on('input change', function () {
        const scaleX = parseFloat($(this).val());
        const scaleY = parseFloat($('#scaleY').val());
        applyScaleToSelected(scaleX, scaleY);
    });

    $('#scaleY').on('input change', function () {
        const scaleX = parseFloat($('#scaleX').val());
        const scaleY = parseFloat($(this).val());
        applyScaleToSelected(scaleX, scaleY);
    });

    // Skew X, Y
    $('#skewX').on('input change', function () {
        const skewX = parseFloat($(this).val());
        const skewY = parseFloat($('#skewY').val());
        applySkewToSelected(skewX, skewY);
    });

    $('#skewY').on('input change', function () {
        const skewX = parseFloat($('#skewX').val());
        const skewY = parseFloat($(this).val());
        applySkewToSelected(skewX, skewY);
    });

    // Bring to front / Send to back
    $('#bringToFrontBtn').on('click', function () {
        bringSelectedToFront();
    });

    $('#sendToBackBtn').on('click', function () {
        sendSelectedToBack();
    });

    console.log('✓ Advanced property handlers set up');
}

// ✅ Export as PNG Image
function exportAsImage() {
    if (!stage || !layer) {
        alert('Không có canvas để xuất!');
        return;
    }

    try {
        // Deselect any selected shape (hide transformer)
        if (transformer) {
            transformer.nodes([]);
            layer.batchDraw();
        }

        // Get canvas bounds
        const padding = 20; // Add some padding
        const bbox = {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight
        };

        // Export with high quality
        const dataURL = stage.toDataURL({
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            pixelRatio: 2  // 2x resolution for better quality
        });

        // Get map name for filename
        const mapName = $('#currentMapName').text() || 'map';
        const filename = `${mapName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;

        // Download
        downloadFile(dataURL, filename);

        updateStatus('Đã xuất ảnh PNG: ' + filename);
        console.log('✓ Exported as image:', filename);

    } catch (error) {
        console.error('Export image error:', error);
        alert('Lỗi khi xuất ảnh: ' + error.message);
    }
}

// ✅ Export as JSON
function exportAsJSON() {
    if (!stage || !layer) {
        alert('Không có canvas để xuất!');
        return;
    }

    try {
        // Deselect
        if (transformer) {
            transformer.nodes([]);
        }

        // Get all objects (exclude transformer and background)
        const objects = [];
        layer.children.forEach(child => {
            if (child === transformer) return;
            if (child === canvasBackground) return;

            const obj = child.toObject();

            // Add additional metadata
            obj._type = child.getClassName();
            obj._dbId = child.getAttr('dbId');

            // For images, save the URL
            if (obj._type === 'Image') {
                obj._imageUrl = child.getAttr('uploadedUrl') || child.getAttr('librarySource');
            }

            objects.push(obj);
        });

        // Create export data
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            mapId: currentMapId,
            mapName: $('#currentMapName').text() || 'Untitled',
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            objectCount: objects.length,
            objects: objects
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const mapName = exportData.mapName.replace(/[^a-z0-9]/gi, '_');
        const filename = `${mapName}_${Date.now()}.json`;

        downloadFile(url, filename);
        URL.revokeObjectURL(url);

        updateStatus('Đã xuất JSON: ' + filename);
        console.log('✓ Exported as JSON:', filename, 'Objects:', objects.length);

    } catch (error) {
        console.error('Export JSON error:', error);
        alert('Lỗi khi xuất JSON: ' + error.message);
    }
}

// ✅ Export as SVG
function exportAsSVG() {
    if (!stage || !layer) {
        alert('Không có canvas để xuất!');
        return;
    }

    try {
        // Deselect
        if (transformer) {
            transformer.nodes([]);
            layer.batchDraw();
        }

        // Create SVG string
        let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;

        // Add white background
        svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/>`;

        // Add each shape
        layer.children.forEach(child => {
            if (child === transformer) return;
            if (child === canvasBackground) return;

            const className = child.getClassName();
            const x = child.x();
            const y = child.y();
            const stroke = child.stroke() || 'none';
            const fill = child.fill() || 'none';
            const strokeWidth = child.strokeWidth() || 1;
            const opacity = child.opacity() || 1;

            if (className === 'Rect') {
                const width = child.width();
                const height = child.height();
                svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" `;
                svg += `stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
            } else if (className === 'Circle') {
                const radius = child.radius();
                svg += `<circle cx="${x}" cy="${y}" r="${radius}" `;
                svg += `stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
            } else if (className === 'Ellipse') {
                const rx = child.radiusX();
                const ry = child.radiusY();
                svg += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" `;
                svg += `stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
            } else if (className === 'Line') {
                const points = child.points();
                svg += `<line x1="${points[0]}" y1="${points[1]}" x2="${points[2]}" y2="${points[3]}" `;
                svg += `stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
            } else if (className === 'Text') {
                const text = child.text();
                const fontSize = child.fontSize();
                const fontFamily = child.fontFamily();
                svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" `;
                svg += `fill="${fill}" opacity="${opacity}">${text}</text>`;
            }
            // Add more shape types as needed
        });

        svg += '</svg>';

        // Create blob and download
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const mapName = ($('#currentMapName').text() || 'map').replace(/[^a-z0-9]/gi, '_');
        const filename = `${mapName}_${Date.now()}.svg`;

        downloadFile(url, filename);
        URL.revokeObjectURL(url);

        updateStatus('Đã xuất SVG: ' + filename);
        console.log('✓ Exported as SVG:', filename);

    } catch (error) {
        console.error('Export SVG error:', error);
        alert('Lỗi khi xuất SVG: ' + error.message);
    }
}

// ✅ Import from JSON
function importFromJSON() {
    $('#jsonImportInput').click();
}

// Handle JSON file import
$('#jsonImportInput').on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const jsonData = JSON.parse(event.target.result);

            console.log('→ Importing JSON:', jsonData);

            // Validate
            if (!jsonData.objects || !Array.isArray(jsonData.objects)) {
                alert('File JSON không hợp lệ!');
                return;
            }

            // Confirm
            const msg = `Nhập ${jsonData.objectCount} đối tượng từ file?\n\n` +
                `Map: ${jsonData.mapName}\n` +
                `Canvas: ${jsonData.canvasWidth}x${jsonData.canvasHeight}\n\n` +
                `Lưu ý: Các đối tượng hiện tại sẽ KHÔNG bị xóa.`;

            if (!confirm(msg)) return;

            // Import objects
            let importedCount = 0;

            jsonData.objects.forEach(objData => {
                try {
                    let shape;
                    const type = objData._type;

                    if (type === 'Rect') {
                        shape = new Konva.Rect(objData);
                    } else if (type === 'Circle') {
                        shape = new Konva.Circle(objData);
                    } else if (type === 'Ellipse') {
                        shape = new Konva.Ellipse(objData);
                    } else if (type === 'Line') {
                        shape = new Konva.Line(objData);
                    } else if (type === 'Arrow') {
                        shape = new Konva.Arrow(objData);
                    } else if (type === 'Star') {
                        shape = new Konva.Star(objData);
                    } else if (type === 'Text') {
                        shape = new Konva.Text(objData);
                    } else if (type === 'Image' && objData._imageUrl) {
                        // Load image
                        const imageObj = new Image();
                        imageObj.onload = function () {
                            const img = new Konva.Image({
                                ...objData,
                                image: imageObj
                            });
                            img.setAttr('uploadedUrl', objData._imageUrl);
                            img.draggable(true);
                            setupDragBoundaries(img);
                            setupShapeEvents(img);
                            layer.add(img);
                            layer.batchDraw();

                            // Save to DB
                            saveObject(img, 'image');
                        };
                        imageObj.src = objData._imageUrl;
                        return; // Skip adding shape now
                    }

                    if (shape) {
                        shape.draggable(true);
                        setupDragBoundaries(shape);
                        setupShapeEvents(shape);
                        layer.add(shape);

                        // Save to DB
                        saveObject(shape, type.toLowerCase());

                        importedCount++;
                    }

                } catch (err) {
                    console.error('Error importing object:', err);
                }
            });

            layer.batchDraw();

            updateStatus(`Đã nhập ${importedCount} đối tượng`);
            alert(`Nhập thành công ${importedCount}/${jsonData.objectCount} đối tượng!`);

            console.log('✓ Import complete:', importedCount, 'objects');

        } catch (error) {
            console.error('Import error:', error);
            alert('Lỗi khi đọc file JSON: ' + error.message);
        }
    };

    reader.readAsText(file);

    // Reset input
    $(this).val('');
});

// ✅ Helper: Download file
function downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============= UPDATE EVENT HANDLERS =============

// Replace the old loadBtn handler with export menu
// Comment out or remove:
// $('#loadBtn').on('click', function() {
//     loadAllObjects();
// });


// ============= DROPDOWN TOOL SELECTION =============

function setTool(tool) {
    // Cancel polygon if switching tools
    if (isDrawingPolygon && tool !== 'polygon') {
        cancelPolygon();
    }

    currentTool = tool;
    updateToolButtons();
    updateDropdownLabels();
    deselectAll();
    updateCursor();

    const toolNames = {
        'select': 'Chọn đối tượng',
        'rect': 'Vẽ chữ nhật',
        'circle': 'Vẽ hình tròn',
        'ellipse': 'Vẽ ellipse',
        'triangle': 'Vẽ tam giác',
        'star': 'Vẽ ngôi sao',
        'polygon': 'Vẽ đa giác',
        'line': 'Vẽ đường thẳng',
        'arrow': 'Vẽ mũi tên'
    };

    updateStatus(toolNames[tool] || 'Tool: ' + tool);
}

function updateToolButtons() {
    // Remove active state from all buttons
    $('.top-toolbar .btn').removeClass('active btn-primary').addClass('btn-outline-primary');
    $('.top-toolbar .dropdown-item').removeClass('active');
    $('.top-toolbar .btn-group').removeClass('has-active-tool');

    const buttonMap = {
        'select': '#selectBtn',
        'rect': '#rectDropdown',
        'circle': '#circleDropdown',
        'ellipse': '#ellipseDropdown',
        'triangle': '#triangleDropdown',
        'star': '#starDropdown',
        'polygon': '#polygonDropdown',
        'line': '#lineDropdown',
        'arrow': '#arrowDropdown'
    };

    // Activate current tool
    if (buttonMap[currentTool]) {
        if (currentTool === 'select') {
            $(buttonMap[currentTool]).removeClass('btn-outline-primary').addClass('btn-primary active');
        } else {
            // Dropdown item
            $(buttonMap[currentTool]).addClass('active');

            // Mark the group as having active tool
            $('#shapesGroup').addClass('has-active-tool');
        }
    }
}

function updateDropdownLabels() {
    const shapeNames = {
        'rect': 'Chữ nhật',
        'circle': 'Hình tròn',
        'ellipse': 'Ellipse',
        'triangle': 'Tam giác',
        'star': 'Ngôi sao',
        'polygon': 'Đa giác',
        'line': 'Đường thẳng',
        'arrow': 'Mũi tên'
    };

    const shapeIcons = {
        'rect': 'bi-square',
        'circle': 'bi-circle',
        'ellipse': 'bi-egg',
        'triangle': 'bi-triangle',
        'star': 'bi-star',
        'polygon': 'bi-hexagon',
        'line': 'bi-dash-lg',
        'arrow': 'bi-arrow-right'
    };

    // Update shape dropdown label
    if (shapeNames[currentTool]) {
        const icon = shapeIcons[currentTool] || 'bi-shapes';
        $('#currentShapeName').html(`<i class="bi ${icon}"></i> ${shapeNames[currentTool]}`);
    } else {
        $('#currentShapeName').html('Hình vẽ');
    }
}

// ============= ENSURE DROPDOWN WORKS CORRECTLY =============



// ============= ALTERNATIVE: Manual Dropdown Control (if Bootstrap fails) =============

// Use this if Bootstrap dropdown doesn't work
function initManualDropdown() {
    $('.dropdown-toggle').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const menu = $(this).next('.dropdown-menu');
        const isOpen = menu.hasClass('show');

        // Close all other dropdowns
        $('.dropdown-menu').removeClass('show');

        // Toggle this dropdown
        if (!isOpen) {
            menu.addClass('show');
        }
    });

    // Close dropdown when clicking outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.btn-group').length) {
            $('.dropdown-menu').removeClass('show');
        }
    });

    // Close dropdown when clicking item
    $('.dropdown-item').on('click', function () {
        $(this).closest('.dropdown-menu').removeClass('show');
    });

    console.log('✓ Manual dropdown initialized');
}

// Uncomment if Bootstrap dropdown doesn't work:
// $(document).ready(function() {
//     initManualDropdown();
// });

// Force show dropdown manually


console.log('✓ Export/Import functions loaded');

