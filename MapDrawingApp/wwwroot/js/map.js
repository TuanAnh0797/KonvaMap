// Map Drawing Application - WITH MORE SHAPES & DYNAMIC PROPERTIES
// Features: Triangle, Star, Arrow, Polygon, Ellipse + Live Property Editor

let stage, layer, transformer;
let currentTool = 'select';

let canvasWidth = 1200;
let canvasHeight = 800;
let canvasScale = 1;
let canvasPosition = { x: 0, y: 0 };
let isPanning = false;
let lastPointerPosition = null;

let isDrawing = false;
let currentShape = null;
let selectedShape = null;

$(document).ready(function () {
    console.log('=== MAP.JS WITH MORE SHAPES STARTING ===');

    // Remove Bootstrap conflicts
    $('.tool-buttons button').off('click.bs.button');
    $('.tool-buttons button').removeAttr('data-bs-toggle');

    
    // Initialize canvas with pan & zoom
    initializeCanvas();

    // Enable pan & zoom
    enablePan();
    enableZoom();
    updateZoomDisplay();

    console.log('✓ Stage created');

    updateStatus('Sẵn sàng - Nhiều hình dạng & thuộc tính động');
    $('#connectionStatus').removeClass('bg-secondary bg-warning').addClass('bg-success').text('Full Mode');

    // Tool buttons
    $('#selectBtn').on('click', function () {
        currentTool = 'select';
        updateToolButtons();
        stage.container().style.cursor = 'default';
        updateStatus('Chọn đối tượng để chỉnh sửa thuộc tính');
    });

    $('#rectBtn').on('click', function () {
        currentTool = 'rect';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ hình chữ nhật');
    });

    $('#circleBtn').on('click', function () {
        currentTool = 'circle';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ hình tròn');
    });

    $('#lineBtn').on('click', function () {
        currentTool = 'line';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ đường thẳng');
    });

    // NEW SHAPES
    $('#triangleBtn').on('click', function () {
        currentTool = 'triangle';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ tam giác');
    });

    $('#starBtn').on('click', function () {
        currentTool = 'star';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ ngôi sao');
    });

    $('#arrowBtn').on('click', function () {
        currentTool = 'arrow';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ mũi tên');
    });

    $('#ellipseBtn').on('click', function () {
        currentTool = 'ellipse';
        updateToolButtons();
        deselectAll();
        updateStatus('Vẽ ellipse (hình bầu dục)');
    });

    $('#textBtn').on('click', function () {
        currentTool = 'text';
        updateToolButtons();
        const text = prompt('Nhập văn bản:', 'Text');
        if (text) {
            addText(text);
        }
    });

    $('#imageBtn').on('click', function () {
        if (typeof openImageLibrary !== 'undefined') {
            if (confirm('Chọn nguồn:\n\nOK = Thư viện\nCancel = Upload')) {
                openImageLibrary();
            } else {
                $('#imageInput').click();
            }
        } else {
            $('#imageInput').click();
        }
    });

    $('#imageInput').on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            uploadImage(file);
        }
    });

    // Delete button
    $('#deleteBtn').on('click', function () {
        if (selectedShape) {
            deleteSelectedShape();
        } else {
            updateStatus('Chưa chọn đối tượng', 'warning');
        }
    });

    // Clear all
    $('#clearBtn').on('click', function () {
        if (confirm('Xóa tất cả?')) {
            clearAll();
        }
    });

    $('#loadBtn').on('click', function () {
        loadAllObjects();
    });

    $('#saveBtn').on('click', function () {
        updateStatus('Đã lưu tự động');
    });

    // PROPERTY CHANGE HANDLERS - Áp dụng cho đối tượng đang chọn
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

    // Click handler for selection
    stage.on('click tap', function (e) {
        if (currentTool !== 'select') return;

        if (e.target === stage) {
            deselectAll();
            return;
        }

        if (e.target.getParent() === transformer || e.target === transformer) {
            return;
        }

        if (e.target !== layer) {
            selectShape(e.target);
        }
    });

    // Drawing handlers
    stage.on('mousedown touchstart', function (e) {
        if (currentTool === 'select' || e.target !== stage) return;

        const pos = stage.getPointerPosition();
        startDrawing(pos);
    });

    stage.on('mousemove touchmove', function (e) {
        if (!isDrawing) return;
        const pos = stage.getPointerPosition();
        updateDrawing(pos);
    });

    stage.on('mouseup touchend', function (e) {
        if (!isDrawing) return;
        finishDrawing();
    });

    // Load existing objects
    loadAllObjects();

    console.log('=== MAP.JS READY ===');
});

function deselectAll() {
    transformer.nodes([]);
    selectedShape = null;
    layer.batchDraw();
    updatePropertyPanel(null);
}

function selectShape(shape) {
    console.log('→ Selected:', shape.getClassName());
    selectedShape = shape;
    transformer.nodes([shape]);
    layer.batchDraw();
    updatePropertyPanel(shape);
    updateStatus('Đã chọn: ' + shape.getClassName());
}

function updatePropertyPanel(shape) {
    if (!shape) {
        // Reset to defaults
        $('#colorPicker').val('#000000');
        $('#fillColorPicker').val('#ffffff');
        $('#strokeWidth').val(2);
        $('#opacity').val(1);
        $('#strokeWidthValue').text('2');
        $('#opacityValue').text('100%');
        $('#selectedObjectInfo').text('Chưa chọn đối tượng');
        return;
    }

    // Update property controls with selected shape's values
    const stroke = shape.stroke() || '#000000';
    const fill = shape.fill() || 'transparent';
    const strokeWidth = shape.strokeWidth() || 2;
    const opacity = shape.opacity() || 1;

    $('#colorPicker').val(stroke);
    $('#fillColorPicker').val(fill === 'transparent' ? '#ffffff' : fill);
    $('#strokeWidth').val(strokeWidth);
    $('#opacity').val(opacity);
    $('#strokeWidthValue').text(strokeWidth);
    $('#opacityValue').text(Math.round(opacity * 100) + '%');

    const info = `${shape.getClassName()} (ID: ${shape.getAttr('dbId') || 'new'})`;
    $('#selectedObjectInfo').text(info);
}

// Apply properties to selected shape
function applyColorToSelected(color) {
    if (!selectedShape) return;
    console.log('→ Applying color:', color);
    selectedShape.stroke(color);
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Màu đã thay đổi');
}

function applyFillColorToSelected(color) {
    if (!selectedShape) return;
    console.log('→ Applying fill:', color);
    selectedShape.fill(color);
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Màu nền đã thay đổi');
}

function applyStrokeWidthToSelected(width) {
    if (!selectedShape) return;
    console.log('→ Applying stroke width:', width);
    selectedShape.strokeWidth(width);
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Độ dày đã thay đổi');
}

function applyOpacityToSelected(opacity) {
    if (!selectedShape) return;
    console.log('→ Applying opacity:', opacity);
    selectedShape.opacity(opacity);
    layer.batchDraw();
    updateObject(selectedShape);
    updateStatus('Độ mờ đã thay đổi');
}

function startDrawing(pos) {
    isDrawing = true;
    const color = $('#colorPicker').val();
    const strokeWidth = parseInt($('#strokeWidth').val());
    const fillColor = $('#fillColorPicker').val();

    console.log('→ Start drawing:', currentTool, 'at', pos);

    if (currentTool === 'rect') {
        currentShape = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent'
        });
    } else if (currentTool === 'circle') {
        currentShape = new Konva.Circle({
            x: pos.x,
            y: pos.y,
            radius: 0,
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent'
        });
    } else if (currentTool === 'ellipse') {
        currentShape = new Konva.Ellipse({
            x: pos.x,
            y: pos.y,
            radiusX: 0,
            radiusY: 0,
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent'
        });
    } else if (currentTool === 'line') {
        currentShape = new Konva.Line({
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: color,
            strokeWidth: strokeWidth,
            lineCap: 'round'
        });
    } else if (currentTool === 'arrow') {
        currentShape = new Konva.Arrow({
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: color,
            strokeWidth: strokeWidth,
            fill: color,
            pointerLength: 10,
            pointerWidth: 10
        });
    } else if (currentTool === 'triangle') {
        currentShape = new Konva.Line({
            points: [pos.x, pos.y, pos.x, pos.y, pos.x, pos.y],
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent',
            closed: true
        });
        currentShape.setAttr('shapeType', 'triangle');
    } else if (currentTool === 'star') {
        currentShape = new Konva.Star({
            x: pos.x,
            y: pos.y,
            numPoints: 5,
            innerRadius: 0,
            outerRadius: 0,
            stroke: color,
            strokeWidth: strokeWidth,
            fill: 'transparent'
        });
    }

    if (currentShape) {
        layer.add(currentShape);
    }
}

function updateDrawing(pos) {
    if (!currentShape) return;

    const startX = currentShape.x();
    const startY = currentShape.y();
    const dx = pos.x - startX;
    const dy = pos.y - startY;

    if (currentTool === 'rect') {
        currentShape.width(dx);
        currentShape.height(dy);
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        currentShape.radius(radius);
    } else if (currentTool === 'ellipse') {
        currentShape.radiusX(Math.abs(dx));
        currentShape.radiusY(Math.abs(dy));
    } else if (currentTool === 'line' || currentTool === 'arrow') {
        const points = currentShape.points();
        currentShape.points([points[0], points[1], pos.x, pos.y]);
    } else if (currentTool === 'triangle') {
        // Equilateral triangle
        const height = dy;
        const base = height * 1.1547; // sqrt(4/3)
        currentShape.points([
            startX, startY,              // Top
            startX - base / 2, startY + height,  // Bottom left
            startX + base / 2, startY + height   // Bottom right
        ]);
    } else if (currentTool === 'star') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        currentShape.outerRadius(radius);
        currentShape.innerRadius(radius * 0.5);
    }

    layer.batchDraw();
}

function finishDrawing() {
    console.log('→ Finish drawing');
    isDrawing = false;

    if (currentShape) {
        currentShape.draggable(true);
        setupShapeEvents(currentShape);
        saveObject(currentShape, currentShape.getClassName().toLowerCase());
        currentShape = null;
        layer.batchDraw();
        updateStatus('Đã tạo đối tượng');
    }
}

function addText(initialText) {
    const pos = stage.getPointerPosition() || { x: 100, y: 100 };
    const color = $('#colorPicker').val();

    const textNode = new Konva.Text({
        x: pos.x,
        y: pos.y,
        text: initialText || 'Text',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: color,
        draggable: true,
        align: 'left'
    });

    setupShapeEvents(textNode);
    layer.add(textNode);
    layer.batchDraw();
    saveObject(textNode, 'text');

    // Auto-open editor for new text
    setTimeout(() => {
        showTextEditor(textNode);
    }, 100);

    updateStatus('Đã thêm văn bản - Chỉnh sửa trong modal');
}

function deleteSelectedShape() {
    if (!selectedShape) return;

    console.log('→ Deleting shape');
    const shapeId = selectedShape.getAttr('dbId');

    transformer.nodes([]);
    selectedShape.destroy();
    selectedShape = null;
    layer.batchDraw();
    updatePropertyPanel(null);

    if (shapeId) {
        deleteObject(shapeId);
    }

    updateStatus('Đã xóa đối tượng');
}

function clearAll() {
    transformer.nodes([]);
    selectedShape = null;

    const shapes = layer.children.filter(child => child !== transformer);
    shapes.forEach(shape => shape.destroy());

    layer.batchDraw();
    updatePropertyPanel(null);
    updateStatus('Đã xóa tất cả');
}

function setupShapeEvents(shape) {
    shape.on('dragstart', function () {
        if (currentTool === 'select') {
            selectedShape = shape;
        }
    });

    shape.on('dragend', function () {
        if (currentTool === 'select') {
            transformer.nodes([shape]);
            layer.batchDraw();
        }
        updateObject(shape);
        updateStatus('Đã di chuyển');
    });

    shape.on('transformend', function () {
        updateObject(shape);
        updateStatus('Đã thay đổi kích thước');
    });

    shape.on('dblclick dbltap', function (e) {
        e.cancelBubble = true;
        if (typeof showObjectInfo !== 'undefined') {
            showObjectInfo(shape);
        }
    });
}

function updateToolButtons() {
    $('.tool-buttons button').removeClass('active btn-primary').addClass('btn-outline-primary');

    const buttons = {
        'select': '#selectBtn',
        'rect': '#rectBtn',
        'circle': '#circleBtn',
        'line': '#lineBtn',
        'triangle': '#triangleBtn',
        'star': '#starBtn',
        'arrow': '#arrowBtn',
        'ellipse': '#ellipseBtn',
        'text': '#textBtn',
        'image': '#imageBtn'
    };

    if (buttons[currentTool]) {
        $(buttons[currentTool]).removeClass('btn-outline-primary').addClass('btn-primary active');
    }
}

function saveObject(shape, type) {
    // CRITICAL: Check currentMapId
    if (!currentMapId || currentMapId === null) {
        console.error('❌ Cannot save: No current map!');
        console.log('Attempting to create default map...');

        // Try to create default map
        createDefaultMap();

        // Queue the save for after map is created
        setTimeout(() => {
            if (currentMapId) {
                console.log('Retrying save after map created...');
                saveObject(shape, type);
            } else {
                alert('Lỗi: Không có map để lưu. Vui lòng tạo map mới.');
            }
        }, 1000);

        return;
    }

    const data = JSON.stringify(shape.toObject());

    let imageUrl = null;
    if (type === 'image') {
        imageUrl = shape.getAttr('librarySource') ||
            shape.getAttr('uploadedUrl') ||
            (shape.image() ? shape.image().src : null);
    }

    console.log('→ Saving object to map:', currentMapId, 'type:', type);

    $.ajax({
        url: '/Map/CreateObject',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            MapId: currentMapId,  // CRITICAL!
            Type: type,
            Data: data,
            ImageUrl: imageUrl
        }),
        success: function (response) {
            if (response.success) {
                shape.setAttr('dbId', response.id);
                console.log('✓ Saved ID:', response.id, 'to map:', currentMapId);
                updateStatus('Đã lưu vào map ID: ' + currentMapId);
            } else {
                console.error('Save failed:', response.message);
                updateStatus('Lỗi lưu: ' + response.message, 'error');
            }
        },
        error: function (xhr, status, error) {
            console.error('Save error:', error);
            console.log('Response:', xhr.responseText);
            updateStatus('Lỗi kết nối khi lưu', 'error');
        }
    });
}

function updateObject(shape) {
    const dbId = shape.getAttr('dbId');
    if (!dbId) {
        console.log('No dbId, skipping update');
        return;
    }

    const data = JSON.stringify(shape.toObject());
    const type = shape.getClassName().toLowerCase();

    let imageUrl = null;
    if (type === 'image') {
        imageUrl = shape.getAttr('librarySource') ||
            shape.getAttr('uploadedUrl') ||
            (shape.image() ? shape.image().src : null);
    }

    console.log('→ Updating object:', dbId);

    $.ajax({
        url: '/Map/UpdateObject',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            Id: dbId,
            Type: type,
            Data: data,
            ImageUrl: imageUrl
        }),
        success: function (response) {
            console.log('✓ Updated ID:', dbId);
        },
        error: function (xhr, status, error) {
            console.error('Update error:', error);
        }
    });
}

function deleteObject(id) {
    $.post('/Map/DeleteObject', { id: id }, function (response) {
        console.log('✓ Deleted ID:', id);
    });
}

function loadAllObjects() {
    if (!currentMapId) {
        console.log('No current map selected, skipping load');
        updateStatus('Chưa chọn map', 'warning');
        return;
    }

    console.log('→ Loading objects for map:', currentMapId);

    $.get('/Map/GetMapObjects', { mapId: currentMapId }, function (data) {
        console.log('→ Found', data.length, 'objects for map', currentMapId);

        // Clear canvas
        if (typeof transformer !== 'undefined' && transformer) {
            transformer.nodes([]);
        }
        selectedShape = null;

        const shapes = layer.children.filter(child => child !== transformer);
        shapes.forEach(shape => shape.destroy());

        // Load shapes
        data.forEach(obj => {
            loadShape(obj);
        });

        layer.batchDraw();
        updateStatus('Đã tải ' + data.length + ' đối tượng từ map ' + currentMapId);
    }).fail(function (xhr, status, error) {
        console.error('Load objects error:', error);
        updateStatus('Lỗi khi tải objects', 'error');
    });
}
function loadShape(obj) {
    try {
        const shapeData = JSON.parse(obj.data);
        let shape;

        if (obj.type === 'rect') {
            shape = new Konva.Rect(shapeData);
        } else if (obj.type === 'circle') {
            shape = new Konva.Circle(shapeData);
        } else if (obj.type === 'ellipse') {
            shape = new Konva.Ellipse(shapeData);
        } else if (obj.type === 'line') {
            shape = new Konva.Line(shapeData);
        } else if (obj.type === 'arrow') {
            shape = new Konva.Arrow(shapeData);
        } else if (obj.type === 'star') {
            shape = new Konva.Star(shapeData);
        } else if (obj.type === 'text') {
            shape = new Konva.Text(shapeData);
        } else if (obj.type === 'image') {
            const imageObj = new Image();
            imageObj.onload = function () {
                const img = new Konva.Image({
                    ...shapeData,
                    image: imageObj
                });
                img.setAttr('dbId', obj.id);
                img.setAttr('uploadedUrl', obj.imageUrl);
                setupShapeEvents(img);
                layer.add(img);
                layer.batchDraw();
            };
            imageObj.src = obj.imageUrl;
            return;
        }

        if (shape) {
            shape.setAttr('dbId', obj.id);
            shape.draggable(true);
            setupShapeEvents(shape);
            layer.add(shape);
        }
    } catch (e) {
        console.error('Load error:', obj.id, e);
    }
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
                const imageUrl = response.imageUrl;
                const imageObj = new Image();

                imageObj.onload = function () {
                    const pos = stage.getPointerPosition() || { x: 100, y: 100 };

                    const img = new Konva.Image({
                        x: pos.x,
                        y: pos.y,
                        image: imageObj,
                        width: Math.min(imageObj.width, 400),
                        height: Math.min(imageObj.height, 400),
                        draggable: true
                    });

                    img.setAttr('uploadedUrl', imageUrl);
                    setupShapeEvents(img);
                    layer.add(img);
                    layer.batchDraw();
                    saveObject(img, 'image');
                    updateStatus('Đã thêm hình ảnh');
                };
                imageObj.src = imageUrl;
            }
        }
    });
}

function updateStatus(message, type = 'info') {
    $('#statusText').text(message);
    console.log('Status:', message);

    if (type === 'error') {
        $('#statusText').css('color', 'red');
    } else if (type === 'warning') {
        $('#statusText').css('color', 'orange');
    } else {
        $('#statusText').css('color', '#666');
    }
}

function setupShapeEventsWithTextEdit(shape) {
    shape.on('dragstart', function () {
        if (currentTool === 'select') {
            selectedShape = shape;
        }
    });

    shape.on('dragend', function () {
        if (currentTool === 'select') {
            transformer.nodes([shape]);
            layer.batchDraw();
        }
        updateObject(shape);
        updateStatus('Đã di chuyển');
    });

    shape.on('transformend', function () {
        updateObject(shape);
        updateStatus('Đã thay đổi kích thước');
    });

    shape.on('dblclick dbltap', function (e) {
        e.cancelBubble = true;

        // If text, open text editor
        if (shape.getClassName() === 'Text') {
            showTextEditor(shape);
        } else {
            // Otherwise, show object info modal (if exists)
            if (typeof showObjectInfo !== 'undefined') {
                showObjectInfo(shape);
            }
        }
    });
}
let currentEditingText = null;

// Show text editor modal
function showTextEditor(textShape) {
    currentEditingText = textShape;

    // Get current text properties
    const text = textShape.text();
    const fontSize = textShape.fontSize() || 24;
    const fontFamily = textShape.fontFamily() || 'Arial';
    const fill = textShape.fill() || '#000000';
    const align = textShape.align() || 'left';
    const lineHeight = textShape.lineHeight() || 1.2;

    // Detect text style
    const fontStyle = textShape.fontStyle() || '';
    const textDecoration = textShape.textDecoration() || '';
    const isBold = fontStyle.includes('bold');
    const isItalic = fontStyle.includes('italic');
    const isUnderline = textDecoration.includes('underline');

    // Set form values
    $('#textContent').val(text);
    $('#textFontSize').val(fontSize);
    $('#textSizeValue').text(fontSize);
    $('#textFontFamily').val(fontFamily);
    $('#textColor').val(fill);
    $('#textLineHeight').val(lineHeight);
    $('#lineHeightValue').text(lineHeight);

    // Set align
    $('input[name="textAlign"]').prop('checked', false);
    $(`#align${align.charAt(0).toUpperCase() + align.slice(1)}`).prop('checked', true);

    // Set style
    $('#textBold').prop('checked', isBold);
    $('#textItalic').prop('checked', isItalic);
    $('#textUnderline').prop('checked', isUnderline);

    // Update preview
    updateTextPreview();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('textEditorModal'));
    modal.show();

    console.log('→ Text editor opened');
}

// Update preview in real-time
function updateTextPreview() {
    const text = $('#textContent').val() || 'Văn bản mẫu';
    const fontSize = $('#textFontSize').val();
    const fontFamily = $('#textFontFamily').val();
    const color = $('#textColor').val();
    const align = $('input[name="textAlign"]:checked').val();
    const lineHeight = $('#textLineHeight').val();
    const isBold = $('#textBold').is(':checked');
    const isItalic = $('#textItalic').is(':checked');
    const isUnderline = $('#textUnderline').is(':checked');

    // Build font style
    let fontWeight = isBold ? 'bold' : 'normal';
    let fontStyle = isItalic ? 'italic' : 'normal';
    let textDecoration = isUnderline ? 'underline' : 'none';

    // Apply to preview
    $('#previewText').css({
        'font-size': fontSize + 'px',
        'font-family': fontFamily,
        'color': color,
        'text-align': align,
        'line-height': lineHeight,
        'font-weight': fontWeight,
        'font-style': fontStyle,
        'text-decoration': textDecoration
    }).text(text);

    $('#textPreview').css('text-align', align);
}

// Apply text changes to canvas
function applyTextChanges() {
    if (!currentEditingText) return;

    const text = $('#textContent').val();
    const fontSize = parseInt($('#textFontSize').val());
    const fontFamily = $('#textFontFamily').val();
    const color = $('#textColor').val();
    const align = $('input[name="textAlign"]:checked').val();
    const lineHeight = parseFloat($('#textLineHeight').val());
    const isBold = $('#textBold').is(':checked');
    const isItalic = $('#textItalic').is(':checked');
    const isUnderline = $('#textUnderline').is(':checked');

    // Build font style string
    let fontStyleStr = '';
    if (isBold && isItalic) fontStyleStr = 'bold italic';
    else if (isBold) fontStyleStr = 'bold';
    else if (isItalic) fontStyleStr = 'italic';
    else fontStyleStr = 'normal';

    // Apply to Konva text
    currentEditingText.text(text);
    currentEditingText.fontSize(fontSize);
    currentEditingText.fontFamily(fontFamily);
    currentEditingText.fill(color);
    currentEditingText.align(align);
    currentEditingText.lineHeight(lineHeight);
    currentEditingText.fontStyle(fontStyleStr);
    currentEditingText.textDecoration(isUnderline ? 'underline' : '');

    // Redraw layer
    layer.batchDraw();

    // Save to database
    updateObject(currentEditingText);

    console.log('✓ Text updated:', text.substring(0, 20) + '...');
    updateStatus('Văn bản đã được cập nhật');

    // Close modal
    $('#textEditorModal').modal('hide');
    currentEditingText = null;
}

// Event handlers for text editor
$(document).ready(function () {
    // Real-time preview updates
    $('#textContent, #textFontSize, #textFontFamily, #textColor, #textLineHeight').on('input change', function () {
        updateTextPreview();
    });

    $('input[name="textAlign"], #textBold, #textItalic, #textUnderline').on('change', function () {
        updateTextPreview();
    });

    // Update value displays
    $('#textFontSize').on('input', function () {
        $('#textSizeValue').text($(this).val());
    });

    $('#textLineHeight').on('input', function () {
        $('#lineHeightValue').text($(this).val());
    });

    // Apply button
    $('#applyTextBtn').on('click', function () {
        applyTextChanges();
    });

    // Enter key in textarea = new line (not submit)
    $('#textContent').on('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Allow Enter for new line
            return true;
        }
    });
    initializeMapSystem();
});

// Replace setupShapeEvents with the new version
if (typeof setupShapeEvents !== 'undefined') {
    setupShapeEvents = setupShapeEventsWithTextEdit;
}
// MAP MANAGER FUNCTIONS - THÊM VÀO map.js

let currentMapId = null;

// Initialize - Check for default map or create one
function initializeMapSystem() {
    console.log('→ Initializing map system');

    // Check localStorage first
    const savedMapId = localStorage.getItem('currentMapId');

    if (savedMapId && savedMapId !== 'null') {
        currentMapId = parseInt(savedMapId);
        console.log('→ Restored map ID:', currentMapId);
        updateCurrentMapDisplay();
        loadAllObjects();
    } else {
        // Create default map
        console.log('→ No saved map, creating default');
        createDefaultMap();
    }
}

// Create default map on first load
function createDefaultMap() {
    console.log('→ Creating default map');

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
                console.log('✓ Default map created:', currentMapId);
                updateCurrentMapDisplay();
                updateStatus('Đã tạo bản đồ mặc định - ID: ' + currentMapId);
            } else {
                console.error('Failed to create default map:', response.message);
                alert('Lỗi tạo map mặc định: ' + response.message);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error creating default map:', error);
            alert('Lỗi kết nối khi tạo map');
        }
    });
}

// Update current map display
function updateCurrentMapDisplay() {
    if (!currentMapId) {
        $('#currentMapName').text('Chưa chọn map');
        $('#currentMapId').hide();
        if ($('#sidebarCurrentMapName').length) {
            $('#sidebarCurrentMapName').text('Chưa chọn');
        }
        return;
    }

    $.get('/Map/GetAllMaps', function (data) {
        if (data.success) {
            const currentMap = data.maps.find(m => m.id === currentMapId);
            if (currentMap) {
                $('#currentMapName').text(currentMap.name);
                $('#currentMapId').text('ID: ' + currentMap.id).show();
                if ($('#sidebarCurrentMapName').length) {
                    $('#sidebarCurrentMapName').text(currentMap.name);
                }
                console.log('✓ Current map:', currentMap.name);
            } else {
                console.warn('Map ID', currentMapId, 'not found');
                // Map doesn't exist, create new one
                createDefaultMap();
            }
        }
    }).fail(function () {
        console.error('Failed to get maps');
    });
}

// Open Map Manager
function openMapManager() {
    console.log('→ Opening map manager');

    const modal = new bootstrap.Modal(document.getElementById('mapManagerModal'));
    modal.show();

    loadMapList();
}

// Load map list
function loadMapList() {
    console.log('→ Loading map list');

    $('#mapListContainer').html(`
        <div class="text-center p-4">
            <div class="spinner-border"></div>
            <p class="mt-2">Đang tải...</p>
        </div>
    `);

    $.get('/Map/GetAllMaps', function (data) {
        console.log('→ Maps loaded:', data.maps.length);

        if (data.success) {
            if (data.maps.length === 0) {
                $('#mapListContainer').html(`
                    <div class="empty-maps">
                        <i class="bi bi-map"></i>
                        <h5>Chưa có map nào</h5>
                        <p>Click "Tạo map mới" để bắt đầu</p>
                    </div>
                `);
            } else {
                let html = '<div class="maps-grid">';

                data.maps.forEach(map => {
                    const isActive = map.id === currentMapId;
                    const activeClass = isActive ? 'active' : '';
                    const activeBadge = isActive ? '<span class="current-map-badge">Đang mở</span>' : '';

                    const updatedDate = new Date(map.updatedAt).toLocaleString('vi-VN');

                    html += `
                        <div class="map-card ${activeClass}" onclick="selectMap(${map.id})">
                            <div class="map-card-header">
                                <h5 class="map-card-title">
                                    <i class="bi bi-map"></i> ${map.name}
                                    ${activeBadge}
                                </h5>
                                <span class="map-object-count">
                                    ${map.objectCount} đối tượng
                                </span>
                            </div>
                            
                            ${map.description ? `<div class="map-card-description">${map.description}</div>` : ''}
                            
                            <div class="map-card-footer">
                                <div class="map-card-meta">
                                    <i class="bi bi-clock"></i> ${updatedDate}
                                </div>
                                <div class="map-card-actions">
                                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); selectMap(${map.id})">
                                        <i class="bi bi-box-arrow-in-right"></i> Mở
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editMap(${map.id})">
                                        <i class="bi bi-pencil"></i> Sửa
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteMap(${map.id})">
                                        <i class="bi bi-trash"></i> Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                $('#mapListContainer').html(html);
            }
        }
    }).fail(function () {
        $('#mapListContainer').html(`
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Lỗi khi tải danh sách map
            </div>
        `);
    });
}
// Select map
function selectMap(mapId) {
    console.log('→ Selecting map:', mapId);

    if (currentMapId === mapId) {
        console.log('Already on this map');
        $('#mapManagerModal').modal('hide');
        return;
    }

    currentMapId = mapId;
    localStorage.setItem('currentMapId', currentMapId);

    // Update display
    updateCurrentMapDisplay();

    // Reload objects for this map
    loadAllObjects();

    // Close modal
    $('#mapManagerModal').modal('hide');

    updateStatus('Đã chuyển sang map: ' + mapId);
}

// Show create map form
function showCreateMapForm() {
    $('#mapFormTitle').html('<i class="bi bi-plus-circle"></i> Tạo map mới');
    $('#mapFormId').val(0);
    $('#mapFormName').val('');
    $('#mapFormDescription').val('');

    const modal = new bootstrap.Modal(document.getElementById('mapFormModal'));
    modal.show();
}

// Edit map
function editMap(mapId) {
    console.log('→ Editing map:', mapId);

    $.get('/Map/GetAllMaps', function (data) {
        if (data.success) {
            const map = data.maps.find(m => m.id === mapId);
            if (map) {
                $('#mapFormTitle').html('<i class="bi bi-pencil"></i> Chỉnh sửa map');
                $('#mapFormId').val(map.id);
                $('#mapFormName').val(map.name);
                $('#mapFormDescription').val(map.description || '');

                const modal = new bootstrap.Modal(document.getElementById('mapFormModal'));
                modal.show();
            }
        }
    });
}

// Save map form
function saveMapForm() {
    const id = parseInt($('#mapFormId').val());
    const name = $('#mapFormName').val().trim();
    const description = $('#mapFormDescription').val().trim();

    if (!name) {
        alert('Vui lòng nhập tên map');
        return;
    }

    const mapData = {
        Id: id,
        Name: name,
        Description: description
    };

    const url = id === 0 ? '/Map/CreateMap' : '/Map/UpdateMap';
    const action = id === 0 ? 'Tạo' : 'Cập nhật';

    console.log('→ Saving map:', mapData);

    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(mapData),
        success: function (response) {
            if (response.success) {
                console.log('✓ Map saved');

                // If creating new map, switch to it
                if (id === 0 && response.id) {
                    currentMapId = response.id;
                    localStorage.setItem('currentMapId', currentMapId);
                    console.log('✓ Switched to new map:', currentMapId);
                    updateCurrentMapDisplay();
                    loadAllObjects();
                }

                // Close form modal
                $('#mapFormModal').modal('hide');

                // Reload map list
                loadMapList();

                updateStatus(action + ' map thành công');
            } else {
                alert('Lỗi: ' + response.message);
            }
        },
        error: function (xhr, status, error) {
            console.error('Save map error:', error);
            console.log('Response:', xhr.responseText);
            alert('Lỗi khi ' + action.toLowerCase() + ' map: ' + error);
        }
    });
}

// Delete map
function deleteMap(mapId) {
    if (mapId === currentMapId) {
        alert('Không thể xóa map đang mở!');
        return;
    }

    $.get('/Map/GetAllMaps', function (data) {
        if (data.success) {
            const map = data.maps.find(m => m.id === mapId);
            if (map) {
                const confirmMsg = `Xóa map "${map.name}"?\n\nĐiều này sẽ xóa ${map.objectCount} đối tượng bên trong.\n\nHành động này không thể hoàn tác!`;

                if (confirm(confirmMsg)) {
                    console.log('→ Deleting map:', mapId);

                    $.post('/Map/DeleteMap', { id: mapId }, function (response) {
                        if (response.success) {
                            console.log('✓ Map deleted');
                            loadMapList();
                            updateStatus('Đã xóa map');
                        } else {
                            alert('Lỗi: ' + response.message);
                        }
                    });
                }
            }
        }
    });
}
console.log('✓✓✓ MAP.JS WITH MORE SHAPES & DYNAMIC PROPERTIES LOADED ✓✓✓');

// Initialize canvas with custom size
function initializeCanvas() {
    const container = document.getElementById('container');

    // Load saved settings
    const savedWidth = localStorage.getItem('canvasWidth');
    const savedHeight = localStorage.getItem('canvasHeight');

    if (savedWidth) canvasWidth = parseInt(savedWidth);
    if (savedHeight) canvasHeight = parseInt(savedHeight);

    console.log('→ Canvas size:', canvasWidth, 'x', canvasHeight);

    stage = new Konva.Stage({
        container: 'container',
        width: container.offsetWidth,
        height: container.offsetHeight,
        draggable: false  // We'll handle drag manually
    });

    layer = new Konva.Layer();

    // Create background grid
    const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: 'white',
        stroke: '#e0e0e0',
        strokeWidth: 1
    });
    layer.add(background);
    background.moveToBottom();

    stage.add(layer);

    // Create transformer
    transformer = new Konva.Transformer({
        rotateEnabled: true,
        keepRatio: false,
        borderStroke: '#0d6efd',
        borderStrokeWidth: 2,
        anchorStroke: '#0d6efd',
        anchorFill: 'white',
        anchorSize: 10,
        padding: 5
    });
    layer.add(transformer);

    // Center canvas initially
    centerCanvas();

    console.log('✓ Canvas initialized with pan & zoom');
}

// Center canvas in viewport
function centerCanvas() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    canvasPosition.x = (containerWidth - canvasWidth * canvasScale) / 2;
    canvasPosition.y = (containerHeight - canvasHeight * canvasScale) / 2;

    updateCanvasTransform();
}

// Update canvas transform (position and scale)
function updateCanvasTransform() {
    stage.position(canvasPosition);
    stage.scale({ x: canvasScale, y: canvasScale });
    layer.batchDraw();
}

// Pan functionality
function enablePan() {
    stage.on('mousedown touchstart', function (e) {
        // Only pan if in select mode and clicking on empty space
        if (currentTool !== 'select') return;
        if (e.target !== stage && e.target.getParent() !== layer) return;

        isPanning = true;
        lastPointerPosition = stage.getPointerPosition();
        stage.container().style.cursor = 'grabbing';
    });

    stage.on('mousemove touchmove', function (e) {
        if (!isPanning) return;

        const pos = stage.getPointerPosition();
        if (!lastPointerPosition) return;

        const dx = pos.x - lastPointerPosition.x;
        const dy = pos.y - lastPointerPosition.y;

        canvasPosition.x += dx;
        canvasPosition.y += dy;

        updateCanvasTransform();

        lastPointerPosition = pos;
    });

    stage.on('mouseup touchend', function () {
        isPanning = false;
        stage.container().style.cursor = 'default';
    });

    console.log('✓ Pan enabled');
}

// Zoom functionality
function enableZoom() {
    stage.on('wheel', function (e) {
        e.evt.preventDefault();

        const oldScale = canvasScale;
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - canvasPosition.x) / oldScale,
            y: (pointer.y - canvasPosition.y) / oldScale
        };

        // Zoom speed
        const scaleBy = 1.1;
        const direction = e.evt.deltaY > 0 ? -1 : 1;

        // Calculate new scale
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        // Limit zoom range
        newScale = Math.max(0.1, Math.min(5, newScale));

        canvasScale = newScale;

        // Adjust position to zoom to mouse
        canvasPosition.x = pointer.x - mousePointTo.x * newScale;
        canvasPosition.y = pointer.y - mousePointTo.y * newScale;

        updateCanvasTransform();
        updateZoomDisplay();
    });

    console.log('✓ Zoom enabled');
}

// Update zoom percentage display
function updateZoomDisplay() {
    const percentage = Math.round(canvasScale * 100);
    $('#zoomPercentage').text(percentage + '%');
}

// Zoom buttons
function zoomIn() {
    const oldScale = canvasScale;
    canvasScale = Math.min(5, canvasScale * 1.2);

    // Zoom to center
    const containerWidth = document.getElementById('container').offsetWidth;
    const containerHeight = document.getElementById('container').offsetHeight;

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const mousePointTo = {
        x: (centerX - canvasPosition.x) / oldScale,
        y: (centerY - canvasPosition.y) / oldScale
    };

    canvasPosition.x = centerX - mousePointTo.x * canvasScale;
    canvasPosition.y = centerY - mousePointTo.y * canvasScale;

    updateCanvasTransform();
    updateZoomDisplay();
}

function zoomOut() {
    const oldScale = canvasScale;
    canvasScale = Math.max(0.1, canvasScale / 1.2);

    // Zoom to center
    const containerWidth = document.getElementById('container').offsetWidth;
    const containerHeight = document.getElementById('container').offsetHeight;

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const mousePointTo = {
        x: (centerX - canvasPosition.x) / oldScale,
        y: (centerY - canvasPosition.y) / oldScale
    };

    canvasPosition.x = centerX - mousePointTo.x * canvasScale;
    canvasPosition.y = centerY - mousePointTo.y * canvasScale;

    updateCanvasTransform();
    updateZoomDisplay();
}

function zoomReset() {
    canvasScale = 1;
    centerCanvas();
    updateZoomDisplay();
}

function zoomFit() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;

    canvasScale = Math.min(scaleX, scaleY) * 0.9;  // 90% to leave margin
    centerCanvas();
    updateZoomDisplay();
}

// Canvas size settings
function showCanvasSizeSettings() {
    $('#canvasSizeWidth').val(canvasWidth);
    $('#canvasSizeHeight').val(canvasHeight);

    // Update preview
    updateCanvasSizePreview();

    const modal = new bootstrap.Modal(document.getElementById('canvasSizeModal'));
    modal.show();
}

function updateCanvasSizePreview() {
    const width = parseInt($('#canvasSizeWidth').val());
    const height = parseInt($('#canvasSizeHeight').val());

    $('#canvasSizePreview').text(`${width} × ${height} pixels`);

    // Show aspect ratio
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const aspectW = width / divisor;
    const aspectH = height / divisor;

    $('#canvasAspectRatio').text(`Tỷ lệ: ${aspectW}:${aspectH}`);
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

    // Save to localStorage
    localStorage.setItem('canvasWidth', canvasWidth);
    localStorage.setItem('canvasHeight', canvasHeight);

    // Update background
    const background = layer.children.find(child =>
        child.getClassName() === 'Rect' && child.fill() === 'white'
    );

    if (background) {
        background.width(canvasWidth);
        background.height(canvasHeight);
    }

    // Re-center
    centerCanvas();

    // Close modal
    $('#canvasSizeModal').modal('hide');

    updateStatus(`Đã đổi kích thước canvas: ${canvasWidth}×${canvasHeight}`);
    console.log('✓ Canvas resized:', canvasWidth, 'x', canvasHeight);
}

// Update $(document).ready()
$(document).ready(function () {
    console.log('=== MAP.JS WITH PAN & ZOOM STARTING ===');

    // Remove old stage initialization
    // const container = document.getElementById('container');
    // stage = new Konva.Stage({...});

    // Use new initialization
    initializeCanvas();

    // Enable pan & zoom
    enablePan();
    enableZoom();

    // Update zoom display
    updateZoomDisplay();

    // Canvas size settings events
    $('#canvasSizeWidth, #canvasSizeHeight').on('input', function () {
        updateCanvasSizePreview();
    });

    // ... rest of existing ready code ...

    console.log('=== MAP.JS READY WITH PAN & ZOOM ===');
});

console.log('✓ Pan & Zoom functions loaded');