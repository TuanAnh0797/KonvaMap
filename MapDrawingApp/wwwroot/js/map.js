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
        $('#colorPicker').val('#000000');
        $('#fillColorPicker').val('#ffffff');
        $('#strokeWidth').val(2);
        $('#opacity').val(1);
        $('#strokeWidthValue').text('2');
        $('#opacityValue').text('100%');
        $('#selectedObjectInfo').text('Chưa chọn');
        return;
    }

    $('#colorPicker').val(shape.stroke() || '#000000');
    $('#fillColorPicker').val(shape.fill() === 'transparent' ? '#ffffff' : shape.fill() || '#ffffff');
    $('#strokeWidth').val(shape.strokeWidth() || 2);
    $('#opacity').val(shape.opacity() || 1);
    $('#strokeWidthValue').text(shape.strokeWidth() || 2);
    $('#opacityValue').text(Math.round((shape.opacity() || 1) * 100) + '%');
    $('#selectedObjectInfo').text(`${shape.getClassName()} (ID: ${shape.getAttr('dbId') || 'new'})`);
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
    $('#canvasSizeWidth').val(canvasWidth);
    $('#canvasSizeHeight').val(canvasHeight);
    updateCanvasSizePreview();
    const modal = new bootstrap.Modal(document.getElementById('canvasSizeModal'));
    modal.show();
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

console.log('✓ map.js v5 WITH CANVAS BOUNDARIES + POLYGON LOADED');