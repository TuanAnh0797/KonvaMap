// ============================================
// MAP DATABASE MODULE
// Database CRUD Operations
// ============================================

/**
 * Manages all database operations for maps and map objects.
 * Handles API calls to backend for persistence.
 */
const MapDatabase = (function () {
    'use strict';

    // ==================== CONSTANTS ====================

    const API_ENDPOINTS = {
        // Map endpoints
        getAllMaps: '/Map/GetAllMaps',
        createMap: '/Map/CreateMap',
        updateMap: '/Map/UpdateMap',
        deleteMap: '/Map/DeleteMap',
        getMapObjects: '/Map/GetMapObjects',

        // Canvas size endpoints
        getCanvasSize: '/Map/GetCanvasSize',
        updateCanvasSize: '/Map/UpdateCanvasSize',

        // Object endpoints
        createObject: '/Map/CreateObject',
        updateObject: '/Map/UpdateObject',
        deleteObject: '/Map/DeleteObject',
        getAllObjects: '/Map/GetAllObjects',

        // Image endpoints
        uploadImage: '/Map/UploadImage',
        getLibraryImages: '/ImageLibrary/GetLibraryImages'
    };

    // ==================== MAP OPERATIONS ====================

    /**
     * Get all maps from database
     * @returns {Promise<Array>} Array of maps
     */
    async function getAllMaps() {
        try {
            const response = await $.ajax({
                url: API_ENDPOINTS.getAllMaps,
                type: 'GET',
                dataType: 'json'
            });

            if (response.success && response.maps) {
                console.log('✓ Loaded', response.maps.length, 'maps');
                return response.maps;
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('❌ Failed to get maps:', error);
            throw error;
        }
    }

    /**
     * Create a new map
     * @param {string} name - Map name
     * @param {string} description - Map description (optional)
     * @returns {Promise<object>} Created map data with ID
     */
    async function createMap(name, description = '') {
        try {
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw new Error('Map name is required');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.createMap,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    Name: name.trim(),
                    Description: description ? description.trim() : null
                }),
                dataType: 'json'
            });

            if (response.success && response.id) {
                console.log('✓ Map created:', response.id, name);
                return {
                    id: response.id,
                    name: name.trim(),
                    description: description ? description.trim() : null,
                    ...response.map
                };
            } else {
                throw new Error(response.message || 'Failed to create map');
            }

        } catch (error) {
            console.error('❌ Failed to create map:', error);
            throw error;
        }
    }

    /**
     * Update an existing map
     * @param {number} id - Map ID
     * @param {string} name - New map name
     * @param {string} description - New description (optional)
     * @returns {Promise<boolean>} Success status
     */
    async function updateMap(id, name, description = '') {
        try {
            if (!id || id <= 0) {
                throw new Error('Invalid map ID');
            }

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw new Error('Map name is required');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.updateMap,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    Id: id,
                    Name: name.trim(),
                    Description: description ? description.trim() : null
                }),
                dataType: 'json'
            });

            if (response.success) {
                console.log('✓ Map updated:', id);
                return true;
            } else {
                throw new Error(response.message || 'Failed to update map');
            }

        } catch (error) {
            console.error('❌ Failed to update map:', error);
            throw error;
        }
    }

    /**
     * Delete a map
     * @param {number} id - Map ID
     * @returns {Promise<boolean>} Success status
     */
    async function deleteMap(id) {
        try {
            if (!id || id <= 0) {
                throw new Error('Invalid map ID');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.deleteMap,
                type: 'POST',
                data: { id: id },
                dataType: 'json'
            });

            if (response.success) {
                console.log('✓ Map deleted:', id);
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete map');
            }

        } catch (error) {
            console.error('❌ Failed to delete map:', error);
            throw error;
        }
    }

    /**
     * Get all objects for a specific map
     * @param {number} mapId - Map ID
     * @returns {Promise<Array>} Array of objects
     */
    async function getMapObjects(mapId) {
        try {
            if (!mapId || mapId <= 0) {
                throw new Error('Invalid map ID');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.getMapObjects,
                type: 'GET',
                data: { mapId: mapId },
                dataType: 'json'
            });

            // Response is direct array (no wrapper)
            if (Array.isArray(response)) {
                console.log('✓ Loaded', response.length, 'objects for map', mapId);
                return response;
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('❌ Failed to get map objects:', error);
            throw error;
        }
    }

    // ==================== CANVAS SIZE OPERATIONS ====================

    /**
     * Get canvas size for a map
     * @param {number} mapId - Map ID
     * @returns {Promise<{width: number, height: number}>} Canvas dimensions
     */
    async function getCanvasSize(mapId) {
        try {
            if (!mapId || mapId <= 0) {
                throw new Error('Invalid map ID');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.getCanvasSize,
                type: 'GET',
                data: { mapId: mapId },
                dataType: 'json'
            });

            if (response.success) {
                const width = response.width || 1200;
                const height = response.height || 800;
                console.log('✓ Canvas size loaded:', width, 'x', height);
                return { width, height };
            } else {
                throw new Error(response.message || 'Failed to get canvas size');
            }

        } catch (error) {
            console.error('❌ Failed to get canvas size:', error);
            // Return default size on error
            return { width: 1200, height: 800 };
        }
    }

    /**
     * Update canvas size for a map
     * @param {number} mapId - Map ID
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {Promise<boolean>} Success status
     */
    async function updateCanvasSize(mapId, width, height) {
        try {
            if (!mapId || mapId <= 0) {
                throw new Error('Invalid map ID');
            }

            if (!width || width < 400 || width > 10000) {
                throw new Error('Width must be between 400 and 10000');
            }

            if (!height || height < 300 || height > 10000) {
                throw new Error('Height must be between 300 and 10000');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.updateCanvasSize,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    MapId: mapId,
                    Width: width,
                    Height: height
                }),
                dataType: 'json'
            });

            if (response.success) {
                console.log('✓ Canvas size updated:', width, 'x', height);
                return true;
            } else {
                throw new Error(response.message || 'Failed to update canvas size');
            }

        } catch (error) {
            console.error('❌ Failed to update canvas size:', error);
            throw error;
        }
    }

    // ==================== OBJECT OPERATIONS ====================

    /**
     * Create a new object in database
     * @param {number} mapId - Map ID
     * @param {string} type - Object type
     * @param {object} data - Object data (will be JSON stringified)
     * @param {string} imageUrl - Image URL (optional)
     * @returns {Promise<number>} Created object ID
     */
    async function createObject(mapId, type, data, imageUrl = null) {
        try {
            if (!mapId || mapId <= 0) {
                throw new Error('Invalid map ID');
            }

            if (!type || typeof type !== 'string') {
                throw new Error('Object type is required');
            }

            if (!data) {
                throw new Error('Object data is required');
            }

            // Stringify data if it's an object
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);

            const response = await $.ajax({
                url: API_ENDPOINTS.createObject,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    MapId: mapId,
                    Type: type,
                    Data: dataString,
                    ImageUrl: imageUrl
                }),
                dataType: 'json'
            });

            if (response.success && response.id) {
                console.log('✓ Object created:', response.id, type);
                return response.id;
            } else {
                throw new Error(response.message || 'Failed to create object');
            }

        } catch (error) {
            console.error('❌ Failed to create object:', error);
            throw error;
        }
    }

    /**
     * Update an existing object
     * @param {number} id - Object ID
     * @param {string} type - Object type
     * @param {object} data - Object data (will be JSON stringified)
     * @param {string} imageUrl - Image URL (optional)
     * @returns {Promise<boolean>} Success status
     */
    async function updateObject(id, type, data, imageUrl = null) {
        try {
            if (!id || id <= 0) {
                throw new Error('Invalid object ID');
            }

            if (!type || typeof type !== 'string') {
                throw new Error('Object type is required');
            }

            if (!data) {
                throw new Error('Object data is required');
            }

            // Stringify data if it's an object
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);

            const response = await $.ajax({
                url: API_ENDPOINTS.updateObject,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    Id: id,
                    Type: type,
                    Data: dataString,
                    ImageUrl: imageUrl
                }),
                dataType: 'json'
            });

            if (response.success) {
                console.log('✓ Object updated:', id);
                return true;
            } else {
                throw new Error(response.message || 'Failed to update object');
            }

        } catch (error) {
            console.error('❌ Failed to update object:', error);
            throw error;
        }
    }

    /**
     * Delete an object
     * @param {number} id - Object ID
     * @returns {Promise<boolean>} Success status
     */
    async function deleteObject(id) {
        try {
            if (!id || id <= 0) {
                throw new Error('Invalid object ID');
            }

            const response = await $.ajax({
                url: API_ENDPOINTS.deleteObject,
                type: 'POST',
                data: { id: id },
                dataType: 'json'
            });

            if (response.success) {
                console.log('✓ Object deleted:', id);
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete object');
            }

        } catch (error) {
            console.error('❌ Failed to delete object:', error);
            throw error;
        }
    }

    /**
     * Get all objects (across all maps)
     * @returns {Promise<Array>} Array of all objects
     */
    async function getAllObjects() {
        try {
            const response = await $.ajax({
                url: API_ENDPOINTS.getAllObjects,
                type: 'GET',
                dataType: 'json'
            });

            if (Array.isArray(response)) {
                console.log('✓ Loaded', response.length, 'total objects');
                return response;
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('❌ Failed to get all objects:', error);
            throw error;
        }
    }

    // ==================== IMAGE OPERATIONS ====================

    /**
     * Upload an image file
     * @param {File} file - Image file
     * @returns {Promise<string>} Uploaded image URL
     */
    async function uploadImage(file) {
        try {
            if (!file) {
                throw new Error('No file provided');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await $.ajax({
                url: API_ENDPOINTS.uploadImage,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json'
            });

            if (response.success && response.imageUrl) {
                console.log('✓ Image uploaded:', response.imageUrl);
                return response.imageUrl;
            } else {
                throw new Error(response.message || 'Failed to upload image');
            }

        } catch (error) {
            console.error('❌ Failed to upload image:', error);
            throw error;
        }
    }

    /**
     * Get library images
     * @returns {Promise<Array>} Array of library images
     */
    async function getLibraryImages() {
        try {
            const response = await $.ajax({
                url: API_ENDPOINTS.getLibraryImages,
                type: 'GET',
                dataType: 'json'
            });

            if (response.success && response.images) {
                console.log('✓ Loaded', response.images.length, 'library images');
                return response.images;
            } else {
                console.log('→ No library images found');
                return [];
            }

        } catch (error) {
            console.error('❌ Failed to get library images:', error);
            return [];
        }
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Delete multiple objects
     * @param {number[]} ids - Array of object IDs
     * @returns {Promise<{success: number, failed: number}>} Results
     */
    async function deleteMultipleObjects(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('IDs array is required');
        }

        let success = 0;
        let failed = 0;

        for (const id of ids) {
            try {
                await deleteObject(id);
                success++;
            } catch (error) {
                failed++;
                console.error('Failed to delete object:', id, error);
            }
        }

        console.log('✓ Batch delete complete:', success, 'success,', failed, 'failed');
        return { success, failed };
    }

    /**
     * Create multiple objects
     * @param {number} mapId - Map ID
     * @param {Array<{type: string, data: object, imageUrl: string}>} objects
     * @returns {Promise<{success: number, failed: number, ids: number[]}>} Results
     */
    async function createMultipleObjects(mapId, objects) {
        if (!mapId || mapId <= 0) {
            throw new Error('Invalid map ID');
        }

        if (!Array.isArray(objects) || objects.length === 0) {
            throw new Error('Objects array is required');
        }

        let success = 0;
        let failed = 0;
        const ids = [];

        for (const obj of objects) {
            try {
                const id = await createObject(mapId, obj.type, obj.data, obj.imageUrl);
                ids.push(id);
                success++;
            } catch (error) {
                failed++;
                console.error('Failed to create object:', obj.type, error);
            }
        }

        console.log('✓ Batch create complete:', success, 'success,', failed, 'failed');
        return { success, failed, ids };
    }

    // ==================== UTILITIES ====================

    /**
     * Check if server is reachable
     * @returns {Promise<boolean>} Server status
     */
    async function checkServerConnection() {
        try {
            await $.ajax({
                url: API_ENDPOINTS.getAllMaps,
                type: 'GET',
                timeout: 5000,
                dataType: 'json'
            });
            console.log('✓ Server connection OK');
            return true;
        } catch (error) {
            console.error('❌ Server connection failed:', error);
            return false;
        }
    }

    /**
     * Get API endpoint URLs (for debugging)
     * @returns {object} API endpoints
     */
    function getEndpoints() {
        return { ...API_ENDPOINTS };
    }

    // ==================== PUBLIC API ====================

    return {
        // Map operations
        getAllMaps,
        createMap,
        updateMap,
        deleteMap,
        getMapObjects,

        // Canvas size operations
        getCanvasSize,
        updateCanvasSize,

        // Object operations
        createObject,
        updateObject,
        deleteObject,
        getAllObjects,

        // Image operations
        uploadImage,
        getLibraryImages,

        // Batch operations
        deleteMultipleObjects,
        createMultipleObjects,

        // Utilities
        checkServerConnection,
        getEndpoints
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapDatabase = MapDatabase;
}

console.log('✓ MapDatabase module loaded');