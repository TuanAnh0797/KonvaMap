// ============================================
// MAP UI MODULE
// UI Updates & Status Management
// ============================================

/**
 * Manages UI updates, status messages, and visual feedback.
 * Handles toolbar updates, status bar, modals, and notifications.
 */
const MapUI = (function () {
    'use strict';

    // ==================== CONSTANTS ====================

    const STATUS_TYPES = {
        INFO: 'info',
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error'
    };

    const STATUS_COLORS = {
        info: 'white',
        success: '#4CAF50',
        warning: 'orange',
        error: 'red'
    };

    // ==================== STATUS BAR ====================

    /**
     * Update status bar message
     * @param {string} message - Status message
     * @param {string} type - Status type (info, success, warning, error)
     */
    function updateStatus(message, type = 'info') {
        const $status = $('#statusText');
        if (!$status.length) {
            console.warn('⚠️ Status element not found');
            return;
        }

        $status.text(message);

        const color = STATUS_COLORS[type] || STATUS_COLORS.info;
        $status.css('color', color);

        console.log(`[${type.toUpperCase()}]`, message);
    }

    /**
     * Update connection status badge
     * @param {string} status - Status text
     * @param {string} type - Badge type (secondary, success, warning, danger)
     */
    function updateConnectionStatus(status, type = 'success') {
        const $badge = $('#connectionStatus');
        if (!$badge.length) return;

        $badge.removeClass('bg-secondary bg-success bg-warning bg-danger')
            .addClass(`bg-${type}`)
            .text(status);
    }

    // ==================== TOOLBAR UPDATES ====================

    /**
     * Update tool buttons based on current tool
     * @param {string} currentTool - Current tool name
     */
    function updateToolButtons(currentTool) {
        // Remove active state from all buttons
        $('.top-toolbar .btn').removeClass('active btn-primary');
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
                $(buttonMap[currentTool]).addClass('active');
            } else {
                // Dropdown item
                $(buttonMap[currentTool]).addClass('active');
                // Mark the group as having active tool
                $('#shapesGroup').addClass('has-active-tool');
            }
        }

        // Update dropdown label
        updateDropdownLabel(currentTool);
    }

    /**
     * Update dropdown label to show current shape
     * @private
     */
    function updateDropdownLabel(currentTool) {
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

        if (shapeNames[currentTool]) {
            const icon = shapeIcons[currentTool] || 'bi-shapes';
            $('#currentShapeName').html(`<i class="bi ${icon}"></i> ${shapeNames[currentTool]}`);
        } else {
            $('#currentShapeName').html('Hình vẽ');
        }
    }

    // ==================== ZOOM DISPLAY ====================

    /**
     * Update zoom percentage display
     * @param {number} scale - Current scale (1.0 = 100%)
     */
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        $('#zoomPercentage').text(percentage + '%');
    }

    // ==================== MAP NAME DISPLAY ====================

    /**
     * Update current map name display
     * @param {string} mapName - Map name
     */
    function updateCurrentMapName(mapName) {
        $('#currentMapName').text(mapName || 'Chưa chọn');
        $('#sidebarCurrentMapName').text(mapName || 'Chưa chọn');
    }

    // ==================== UTILITIES ====================

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string}
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== INITIALIZATION ====================

    /**
     * Initialize UI components
     */
    function initialize() {
        updateStatus('Đang khởi tạo...');
        updateConnectionStatus('Đang kết nối...', 'secondary');
        console.log('✓ UI initialized');
    }

    /**
     * Set ready state
     */
    function setReady() {
        updateStatus('Sẵn sàng');
        updateConnectionStatus('Kết nối', 'success');
    }

    // ==================== PUBLIC API ====================

    return {
        updateStatus,
        updateConnectionStatus,
        updateToolButtons,
        updateZoomDisplay,
        updateCurrentMapName,
        escapeHtml,
        initialize,
        setReady,
        STATUS_TYPES
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapUI = MapUI;
}

console.log('✓ MapUI module loaded');