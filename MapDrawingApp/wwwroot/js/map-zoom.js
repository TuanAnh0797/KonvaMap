// ============================================
// MAP ZOOM MODULE  
// Zoom & Pan Controls
// ============================================

const MapZoom = (function () {
    'use strict';

    const ZOOM_CONFIG = {
        MIN: 0.1,
        MAX: 5,
        STEP: 1.2,
        WHEEL_STEP: 1.1,
        DEFAULT: 1
    };

    function zoomIn() {
        const currentScale = MapCore.getScale();
        const newScale = Math.min(ZOOM_CONFIG.MAX, currentScale * ZOOM_CONFIG.STEP);
        MapCore.setZoom(newScale);
        if (MapUI) MapUI.updateZoomDisplay(newScale);
        console.log('✓ Zoomed in:', newScale);
    }

    function zoomOut() {
        const currentScale = MapCore.getScale();
        const newScale = Math.max(ZOOM_CONFIG.MIN, currentScale / ZOOM_CONFIG.STEP);
        MapCore.setZoom(newScale);
        if (MapUI) MapUI.updateZoomDisplay(newScale);
        console.log('✓ Zoomed out:', newScale);
    }

    function zoomReset() {
        MapCore.setZoom(ZOOM_CONFIG.DEFAULT);
        if (MapUI) MapUI.updateZoomDisplay(ZOOM_CONFIG.DEFAULT);
        console.log('✓ Zoom reset');
    }

    function zoomFit() {
        MapCore.zoomFit();
        const scale = MapCore.getScale();
        if (MapUI) MapUI.updateZoomDisplay(scale);
        console.log('✓ Zoom fit:', scale);
    }

    function setupWheelZoom() {
        const stage = MapCore.getStage();
        if (!stage) return;

        stage.on('wheel', function (e) {
            e.evt.preventDefault();
            const oldScale = MapCore.getScale();
            const pointer = stage.getPointerPosition();
            const position = MapCore.getPosition();

            const mousePointTo = {
                x: (pointer.x - position.x) / oldScale,
                y: (pointer.y - position.y) / oldScale
            };

            const direction = e.evt.deltaY > 0 ? -1 : 1;
            let newScale = direction > 0
                ? oldScale * ZOOM_CONFIG.WHEEL_STEP
                : oldScale / ZOOM_CONFIG.WHEEL_STEP;

            newScale = Math.max(ZOOM_CONFIG.MIN, Math.min(ZOOM_CONFIG.MAX, newScale));

            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale
            };

            MapCore.setZoom(newScale);
            MapCore.setPosition(newPos.x, newPos.y);

            if (MapUI) MapUI.updateZoomDisplay(newScale);
        });

        console.log('✓ Wheel zoom setup');
    }

    function initialize() {
        setupWheelZoom();
        if (MapUI) MapUI.updateZoomDisplay(ZOOM_CONFIG.DEFAULT);
        console.log('✓ Zoom controls initialized');
    }

    return {
        zoomIn,
        zoomOut,
        zoomReset,
        zoomFit,
        initialize,
        setupWheelZoom,
        ZOOM_CONFIG
    };

})();

if (typeof window !== 'undefined') {
    window.MapZoom = MapZoom;
}

console.log('✓ MapZoom module loaded');