// ============================================
// MAP.JS - MAIN ORCHESTRATION
// Refactored Version - Uses Modular Architecture
// ============================================

/**
 * Main application file that orchestrates all modules.
 * This file is now clean and focused on initialization and coordination.
 */

(function () {
    'use strict';

    console.log('=== MAP DRAWING APPLICATION v2.0 ===');
    console.log('Modular Architecture');

    // ==================== APPLICATION STATE ====================

    const App = {
        initialized: false,
        currentMapId: null
    };

    // ==================== INITIALIZATION ====================

    /**
     * Initialize the application
     */
    async function initializeApplication() {
        console.log('→ Initializing application...');

        try {
            // 1. Check dependencies
            if (!checkDependencies()) {
                throw new Error('Required dependencies not loaded');
            }

            // 2. Initialize UI
            MapUI.initialize();

            // 3. Restore or create map
            await initializeMap();

            // 4. Setup event handlers
            setupAllEventHandlers();

            // 5. Setup zoom controls
            MapZoom.initialize();

            // 6. Mark as initialized
            App.initialized = true;
            MapUI.setReady();

            console.log('✓✓✓ Application initialized successfully ✓✓✓');

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            alert('Lỗi khởi tạo ứng dụng: ' + error.message);
        }
    }

    /**
     * Check if all required dependencies are loaded
     */
    function checkDependencies() {
        const required = [
            'jQuery',
            'Konva',
            'MapCore',
            'MapBoundaries',
            'MapDatabase',
            'MapShapes',
            'MapTools',
            'MapProperties',
            'MapEvents',
            'MapUI',
            'MapZoom',
            'MapExport'
        ];

        const missing = [];

        required.forEach(dep => {
            if (typeof window[dep] === 'undefined') {
                missing.push(dep);
            }
        });

        if (missing.length > 0) {
            console.error('❌ Missing dependencies:', missing);
            return false;
        }

        console.log('✓ All dependencies loaded');
        return true;
    }

    /**
     * Initialize map system
     */
    async function initializeMap() {
        console.log('→ Initializing map system...');

        // Try to restore saved map
        const savedMapId = localStorage.getItem('currentMapId');

        if (savedMapId && savedMapId !== 'null') {
            App.currentMapId = parseInt(savedMapId);
            console.log('→ Restored map ID:', App.currentMapId);
            await loadMap(App.currentMapId);
        } else {
            console.log('→ Creating default map');
            await createDefaultMap();
        }
    }

    /**
     * Load a map
     */
    async function loadMap(mapId) {
        try {
            console.log('→ Loading map:', mapId);

            // Get canvas size
            const { width, height } = await MapDatabase.getCanvasSize(mapId);

            // Initialize canvas
            MapCore.initialize(width, height);
            MapCore.setCurrentMapId(mapId);

            // Load objects after a short delay to ensure canvas is ready
            setTimeout(async () => {
                await loadMapObjects(mapId);
                updateMapDisplay();
            }, 100);

        } catch (error) {
            console.error('❌ Failed to load map:', error);
            // Fallback to default
            MapCore.initialize(1200, 800);
        }
    }

    /**
     * Load map objects
     */
    async function loadMapObjects(mapId) {
        try {
            console.log('→ Loading objects for map:', mapId);

            const objects = await MapDatabase.getMapObjects(mapId);
            console.log('→ Found', objects.length, 'objects');

            const layer = MapCore.getLayer();
            if (!layer) {
                console.error('❌ Layer not available');
                return;
            }

            // Load each object
            objects.forEach(obj => {
                const shape = loadShapeFromDatabase(obj);
                if (shape) {
                    layer.add(shape);
                }
            });

            layer.batchDraw();
            console.log('✓ Objects loaded');

        } catch (error) {
            console.error('❌ Failed to load objects:', error);
        }
    }

    /**
     * Load shape from database object
     */
    function loadShapeFromDatabase(obj) {
        try {
            if (!obj.data) return null;

            const shapeData = JSON.parse(obj.data);
            let shape = null;

            // Create shape based on type
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
                if (!obj.imageUrl) return null;

                // Load image asynchronously
                const imageObj = new Image();
                imageObj.onload = function () {
                    const img = new Konva.Image({
                        ...shapeData,
                        image: imageObj
                    });
                    img.setAttr('dbId', obj.id);

                    if (obj.imageUrl.startsWith('/library/')) {
                        img.setAttr('librarySource', obj.imageUrl);
                    } else {
                        img.setAttr('uploadedUrl', obj.imageUrl);
                    }

                    img.draggable(true);
                    MapBoundaries.setupDragBoundaries(img);
                    MapEvents.setupShapeEvents(img);

                    const layer = MapCore.getLayer();
                    if (layer) {
                        layer.add(img);
                        layer.batchDraw();
                    }
                };
                imageObj.src = obj.imageUrl;
                return null; // Will be added async
            }

            if (shape) {
                // Set database ID
                shape.setAttr('dbId', obj.id);

                // Make draggable
                shape.draggable(true);

                // Setup boundaries
                MapBoundaries.setupDragBoundaries(shape);

                // Setup events
                MapEvents.setupShapeEvents(shape);

                return shape;
            }

            return null;

        } catch (error) {
            console.error('❌ Failed to load shape:', obj.id, error);
            return null;
        }
    }

    /**
     * Create default map
     */
    async function createDefaultMap() {
        try {
            const map = await MapDatabase.createMap('Bản đồ mặc định', 'Map được tạo tự động');

            App.currentMapId = map.id;
            localStorage.setItem('currentMapId', map.id);

            MapCore.initialize(1200, 800);
            MapCore.setCurrentMapId(map.id);

            // Save canvas size
            await MapDatabase.updateCanvasSize(map.id, 1200, 800);

            updateMapDisplay();

            console.log('✓ Default map created:', map.id);

        } catch (error) {
            console.error('❌ Failed to create default map:', error);
            // Initialize anyway with default size
            MapCore.initialize(1200, 800);
        }
    }

    /**
     * Update map display (name, etc)
     */
    async function updateMapDisplay() {
        if (!App.currentMapId) return;

        try {
            const maps = await MapDatabase.getAllMaps();
            const currentMap = maps.find(m => m.id === App.currentMapId);

            if (currentMap) {
                MapUI.updateCurrentMapName(currentMap.name);
            }
        } catch (error) {
            console.error('Failed to update map display:', error);
        }
    }

    // ==================== EVENT HANDLERS SETUP ====================

    /**
     * Setup all event handlers
     */
    function setupAllEventHandlers() {
        console.log('→ Setting up event handlers...');

        // Setup module event handlers
        MapEvents.setupAllEvents();
        MapProperties.setupEventHandlers();

        // Setup global functions
        setupGlobalFunctions();

        console.log('✓ Event handlers setup complete');
    }

    /**
     * Setup global functions (for onclick handlers in HTML)
     */
    function setupGlobalFunctions() {
        // Tool selection
        window.setTool = function (tool) {
            MapTools.setTool(tool);
            MapUI.updateToolButtons(tool);
        };

        // Zoom controls
        window.zoomIn = function () { MapZoom.zoomIn(); };
        window.zoomOut = function () { MapZoom.zoomOut(); };
        window.zoomReset = function () { MapZoom.zoomReset(); };
        window.zoomFit = function () { MapZoom.zoomFit(); };

        // Export/Import
        window.exportAsImage = function () { MapExport.exportAsPNG(); };
        window.exportAsJSON = function () { MapExport.exportAsJSON(); };
        window.exportAsSVG = function () { MapExport.exportAsSVG(); };
        window.importFromJSON = function () { MapExport.importFromJSON(); };

        // Map management
        window.openMapManager = openMapManager;
        window.showCreateMapForm = showCreateMapForm;
        window.selectMap = selectMap;
        window.deleteMap = deleteMap;
        window.saveMapForm = saveMapForm;

        // Canvas size
        window.showCanvasSizeSettings = showCanvasSizeSettings;
        window.setCanvasPreset = setCanvasPreset;
        window.applyCanvasSize = applyCanvasSize;

        console.log('✓ Global functions setup');
    }

    // ==================== MAP MANAGEMENT ====================

    /**
     * Open map manager modal
     */
    async function openMapManager() {
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('mapManagerModal'));
        modal.show();

        // Load maps
        await loadMapList();
    }

    /**
     * Load map list
     */
    async function loadMapList() {
        try {
            MapUI.updateStatus('Đang tải danh sách map...');

            $('#mapListContainer').html('<div class="text-center p-4"><div class="spinner-border"></div></div>');

            const maps = await MapDatabase.getAllMaps();

            if (maps.length === 0) {
                $('#mapListContainer').html(`
                    <div class="empty-maps">
                        <i class="bi bi-map"></i>
                        <h3>Chưa có bản đồ nào</h3>
                        <p>Hãy tạo bản đồ đầu tiên của bạn!</p>
                        <button class="btn btn-primary" onclick="showCreateMapForm()">
                            <i class="bi bi-plus-circle"></i> Tạo bản đồ mới
                        </button>
                    </div>
                `);
                return;
            }

            displayMapCards(maps);
            MapUI.updateStatus('Đã tải ' + maps.length + ' map');

        } catch (error) {
            console.error('❌ Failed to load maps:', error);
            $('#mapListContainer').html('<div class="alert alert-danger">Lỗi khi tải danh sách map</div>');
        }
    }

    /**
     * Display map cards
     */
    function displayMapCards(maps) {
        let html = '<div class="maps-grid">';

        maps.forEach(map => {
            const isActive = map.id === App.currentMapId;
            const updatedDate = new Date(map.updatedAt).toLocaleDateString('vi-VN');

            html += `
                <div class="map-card ${isActive ? 'active' : ''}" onclick="selectMap(${map.id})">
                    <div class="map-card-header">
                        <h5 class="map-card-title">
                            ${MapUI.escapeHtml(map.name)}
                            ${isActive ? '<span class="current-map-badge">Đang mở</span>' : ''}
                        </h5>
                        <span class="map-object-count">${map.objectCount || 0} đối tượng</span>
                    </div>
                    ${map.description ? `
                        <div class="map-card-description">${MapUI.escapeHtml(map.description)}</div>
                    ` : ''}
                    <div class="map-card-footer">
                        <div class="map-card-meta">
                            <small><i class="bi bi-calendar3"></i> ${updatedDate}</small>
                        </div>
                        <div class="map-card-actions">
                            <button class="btn btn-sm btn-primary" 
                                    onclick="event.stopPropagation(); selectMap(${map.id})">
                                <i class="bi bi-folder-open"></i> Mở
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="event.stopPropagation(); deleteMap(${map.id})">
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

    /**
     * Show create map form
     */
    function showCreateMapForm() {
        $('#mapFormId').val(0);
        $('#mapFormName').val('');
        $('#mapFormDescription').val('');
        $('#mapFormTitle').html('<i class="bi bi-plus-circle"></i> Tạo map mới');

        const modal = new bootstrap.Modal(document.getElementById('mapFormModal'));
        modal.show();
    }

    /**
     * Save map form
     */
    async function saveMapForm() {
        const name = $('#mapFormName').val().trim();
        const description = $('#mapFormDescription').val().trim();

        if (!name) {
            alert('Vui lòng nhập tên map');
            return;
        }

        try {
            const map = await MapDatabase.createMap(name, description);

            App.currentMapId = map.id;
            localStorage.setItem('currentMapId', map.id);

            // Initialize canvas
            MapCore.initialize(1200, 800);
            MapCore.setCurrentMapId(map.id);

            // Save canvas size
            await MapDatabase.updateCanvasSize(map.id, 1200, 800);

            // Update display
            updateMapDisplay();

            // Close modals
            $('#mapFormModal').modal('hide');
            $('#mapManagerModal').modal('hide');

            // Reload map list
            await loadMapList();

            MapUI.updateStatus('Đã tạo map mới: ' + name, 'success');

        } catch (error) {
            console.error('❌ Failed to save map:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    /**
     * Select a map
     */
    async function selectMap(mapId) {
        if (mapId === App.currentMapId) {
            $('#mapManagerModal').modal('hide');
            return;
        }

        try {
            App.currentMapId = mapId;
            localStorage.setItem('currentMapId', mapId);

            // Clear current canvas
            MapShapes.clearAllShapes(false);

            // Load new map
            await loadMap(mapId);

            // Close modal
            $('#mapManagerModal').modal('hide');

            MapUI.updateStatus('Đã chuyển map: ' + mapId, 'success');

        } catch (error) {
            console.error('❌ Failed to select map:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    /**
     * Delete a map
     */
    async function deleteMap(mapId) {
        if (mapId === App.currentMapId) {
            alert('Không thể xóa map đang mở!');
            return;
        }

        if (!confirm('Xóa map này?')) {
            return;
        }

        try {
            await MapDatabase.deleteMap(mapId);
            await loadMapList();
            MapUI.updateStatus('Đã xóa map', 'success');

        } catch (error) {
            console.error('❌ Failed to delete map:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // ==================== CANVAS SIZE MANAGEMENT ====================

    /**
     * Show canvas size settings
     */
    function showCanvasSizeSettings() {
        const dimensions = MapCore.getCanvasDimensions();

        $('#canvasSizeWidth').val(dimensions.width);
        $('#canvasSizeHeight').val(dimensions.height);

        updateCanvasSizePreview();
        highlightMatchingPreset();

        const modal = new bootstrap.Modal(document.getElementById('canvasSizeModal'));
        modal.show();
    }

    /**
     * Update canvas size preview
     */
    function updateCanvasSizePreview() {
        const width = parseInt($('#canvasSizeWidth').val());
        const height = parseInt($('#canvasSizeHeight').val());

        $('#canvasSizePreview').text(`${width} × ${height} pixels`);

        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        $('#canvasAspectRatio').text(`Tỷ lệ: ${width / divisor}:${height / divisor}`);
    }

    /**
     * Set canvas preset
     */
    function setCanvasPreset(width, height) {
        $('#canvasSizeWidth').val(width);
        $('#canvasSizeHeight').val(height);
        updateCanvasSizePreview();
        highlightMatchingPreset();
    }

    /**
     * Highlight matching preset
     */
    function highlightMatchingPreset() {
        const width = parseInt($('#canvasSizeWidth').val());
        const height = parseInt($('#canvasSizeHeight').val());

        // Remove all highlights
        $('#canvasSizeModal .btn').removeClass('btn-primary').addClass('btn-outline-secondary');

        // Highlight matching
        const presets = [
            { w: 800, h: 600 }, { w: 1200, h: 800 }, { w: 1920, h: 1080 },
            { w: 1080, h: 1920 }, { w: 1000, h: 1000 }, { w: 794, h: 1123 },
            { w: 1123, h: 794 }, { w: 2560, h: 1080 }, { w: 3840, h: 2160 }
        ];

        presets.forEach(p => {
            if (p.w === width && p.h === height) {
                $(`[onclick*="${p.w}, ${p.h}"]`)
                    .removeClass('btn-outline-secondary')
                    .addClass('btn-primary');
            }
        });
    }

    /**
     * Apply canvas size
     */
    async function applyCanvasSize() {
        const width = parseInt($('#canvasSizeWidth').val());
        const height = parseInt($('#canvasSizeHeight').val());

        if (width < 400 || height < 300) {
            alert('Kích thước tối thiểu: 400x300');
            return;
        }

        if (width > 10000 || height > 10000) {
            alert('Kích thước tối đa: 10000x10000');
            return;
        }

        try {
            // Resize canvas
            MapCore.resizeCanvas(width, height);

            // Save to database
            if (App.currentMapId) {
                await MapDatabase.updateCanvasSize(App.currentMapId, width, height);
            }

            // Close modal
            $('#canvasSizeModal').modal('hide');

            MapUI.updateStatus(`Canvas: ${width}x${height}`, 'success');
            console.log('✓ Canvas resized:', width, 'x', height);

        } catch (error) {
            console.error('❌ Failed to resize canvas:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Setup preview update on input
    $(document).ready(function () {
        $('#canvasSizeWidth, #canvasSizeHeight').on('input', function () {
            updateCanvasSizePreview();
            highlightMatchingPreset();
        });
    });

    // ==================== START APPLICATION ====================

    $(document).ready(function () {
        console.log('→ Document ready, starting initialization...');

        // Wait for all libraries to load
        if (typeof jQuery === 'undefined' || typeof Konva === 'undefined') {
            console.log('⏳ Waiting for libraries...');
            setTimeout(() => {
                $(document).ready(initializeApplication);
            }, 500);
        } else {
            initializeApplication();
        }
    });

    // Export for debugging
    window.App = App;

})();

console.log('✓ map.js loaded');