// ============================================
// MAP SHAPES MODULE
// Shape Factory & Management
// ============================================

/**
 * Manages shape creation, manipulation, and lifecycle.
 * Factory pattern for creating different shape types.
 */
const MapShapes = (function () {
    'use strict';

    // ==================== SHAPE FACTORY ====================

    /**
     * Shape configuration defaults
     * @private
     */
    const DEFAULT_CONFIG = {
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
        draggable: true,
        opacity: 1
    };

    /**
     * Create a rectangle shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Rect}
     */
    function createRect(config) {
        const defaults = {
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Rect({ ...defaults, ...config });
        console.log('✓ Rectangle created:', config);
        return shape;
    }

    /**
     * Create a circle shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Circle}
     */
    function createCircle(config) {
        const defaults = {
            x: 150,
            y: 150,
            radius: 50,
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Circle({ ...defaults, ...config });
        console.log('✓ Circle created:', config);
        return shape;
    }

    /**
     * Create an ellipse shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Ellipse}
     */
    function createEllipse(config) {
        const defaults = {
            x: 150,
            y: 150,
            radiusX: 80,
            radiusY: 50,
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Ellipse({ ...defaults, ...config });
        console.log('✓ Ellipse created:', config);
        return shape;
    }

    /**
     * Create a line shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Line}
     */
    function createLine(config) {
        const defaults = {
            points: [50, 50, 150, 150],
            lineCap: 'round',
            lineJoin: 'round',
            ...DEFAULT_CONFIG
        };

        // Lines don't have fill
        delete defaults.fill;

        const shape = new Konva.Line({ ...defaults, ...config });
        console.log('✓ Line created:', config);
        return shape;
    }

    /**
     * Create an arrow shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Arrow}
     */
    function createArrow(config) {
        const defaults = {
            points: [50, 50, 150, 150],
            pointerLength: 10,
            pointerWidth: 10,
            lineCap: 'round',
            lineJoin: 'round',
            ...DEFAULT_CONFIG,
            fill: config?.stroke || DEFAULT_CONFIG.stroke // Arrow fill matches stroke
        };

        const shape = new Konva.Arrow({ ...defaults, ...config });
        console.log('✓ Arrow created:', config);
        return shape;
    }

    /**
     * Create a triangle shape (using Line with 3 points)
     * @param {object} config - Shape configuration
     * @returns {Konva.Line}
     */
    function createTriangle(config) {
        const x = config?.x || 150;
        const y = config?.y || 100;
        const size = config?.size || 100;

        const defaults = {
            points: [
                x, y,                           // Top point
                x - size / 2, y + size,         // Bottom left
                x + size / 2, y + size          // Bottom right
            ],
            closed: true,
            lineCap: 'round',
            lineJoin: 'round',
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Line({ ...defaults, ...config });
        shape.setAttr('shapeType', 'triangle');
        console.log('✓ Triangle created:', config);
        return shape;
    }

    /**
     * Create a star shape
     * @param {object} config - Shape configuration
     * @returns {Konva.Star}
     */
    function createStar(config) {
        const defaults = {
            x: 150,
            y: 150,
            numPoints: 5,
            innerRadius: 40,
            outerRadius: 80,
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Star({ ...defaults, ...config });
        console.log('✓ Star created:', config);
        return shape;
    }

    /**
     * Create a polygon shape (custom points)
     * @param {number[]} points - Array of points [x1, y1, x2, y2, ...]
     * @param {object} config - Shape configuration
     * @returns {Konva.Line}
     */
    function createPolygon(points, config) {
        if (!Array.isArray(points) || points.length < 6) {
            throw new Error('Polygon requires at least 3 points (6 values)');
        }

        const defaults = {
            points: points,
            closed: true,
            lineCap: 'round',
            lineJoin: 'round',
            ...DEFAULT_CONFIG
        };

        const shape = new Konva.Line({ ...defaults, ...config });
        shape.setAttr('shapeType', 'polygon');
        console.log('✓ Polygon created with', points.length / 2, 'points');
        return shape;
    }

    /**
     * Create a text shape
     * @param {string} text - Text content
     * @param {object} config - Shape configuration
     * @returns {Konva.Text}
     */
    function createText(text, config) {
        const defaults = {
            x: 100,
            y: 100,
            text: text || 'Text',
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000',
            align: 'left',
            draggable: true
        };

        const shape = new Konva.Text({ ...defaults, ...config });
        console.log('✓ Text created:', text);
        return shape;
    }

    /**
     * Create an image shape
     * @param {Image} imageObj - HTML Image object
     * @param {object} config - Shape configuration
     * @returns {Konva.Image}
     */
    function createImage(imageObj, config) {
        if (!imageObj) {
            throw new Error('Image object is required');
        }

        const defaults = {
            x: 100,
            y: 100,
            image: imageObj,
            width: imageObj.width,
            height: imageObj.height,
            draggable: true
        };

        const shape = new Konva.Image({ ...defaults, ...config });
        console.log('✓ Image created:', imageObj.src);
        return shape;
    }

    /**
     * Create shape by type (factory method)
     * @param {string} type - Shape type
     * @param {object} config - Shape configuration
     * @returns {Konva.Shape}
     */
    function createShape(type, config = {}) {
        const factories = {
            'rect': createRect,
            'circle': createCircle,
            'ellipse': createEllipse,
            'line': createLine,
            'arrow': createArrow,
            'triangle': createTriangle,
            'star': createStar,
            'text': () => createText(config.text || 'Text', config)
        };

        const factory = factories[type];
        if (!factory) {
            throw new Error('Unknown shape type: ' + type);
        }

        return factory(config);
    }

    // ==================== SHAPE MANIPULATION ====================

    /**
     * Clone a shape
     * @param {Konva.Shape} shape - Shape to clone
     * @param {object} offset - Position offset {x, y}
     * @returns {Konva.Shape}
     */
    function cloneShape(shape, offset = { x: 20, y: 20 }) {
        const clone = shape.clone();
        clone.position({
            x: shape.x() + offset.x,
            y: shape.y() + offset.y
        });

        // Clear database ID
        clone.setAttr('dbId', null);

        console.log('✓ Shape cloned:', shape.getClassName());
        return clone;
    }

    /**
     * Get shape properties as object
     * @param {Konva.Shape} shape
     * @returns {object}
     */
    function getShapeProperties(shape) {
        const className = shape.getClassName();

        const common = {
            type: className.toLowerCase(),
            x: shape.x(),
            y: shape.y(),
            rotation: shape.rotation(),
            scaleX: shape.scaleX(),
            scaleY: shape.scaleY(),
            opacity: shape.opacity(),
            draggable: shape.draggable()
        };

        // Type-specific properties
        const specific = {};

        if (className === 'Rect') {
            specific.width = shape.width();
            specific.height = shape.height();
            specific.cornerRadius = shape.cornerRadius();
        } else if (className === 'Circle') {
            specific.radius = shape.radius();
        } else if (className === 'Ellipse') {
            specific.radiusX = shape.radiusX();
            specific.radiusY = shape.radiusY();
        } else if (className === 'Line' || className === 'Arrow') {
            specific.points = shape.points();
        } else if (className === 'Star') {
            specific.numPoints = shape.numPoints();
            specific.innerRadius = shape.innerRadius();
            specific.outerRadius = shape.outerRadius();
        } else if (className === 'Text') {
            specific.text = shape.text();
            specific.fontSize = shape.fontSize();
            specific.fontFamily = shape.fontFamily();
            specific.fontStyle = shape.fontStyle();
            specific.align = shape.align();
            specific.lineHeight = shape.lineHeight();
        } else if (className === 'Image') {
            specific.width = shape.width();
            specific.height = shape.height();
        }

        // Stroke and fill
        if (shape.stroke) {
            specific.stroke = shape.stroke();
            specific.strokeWidth = shape.strokeWidth();
        }
        if (shape.fill) {
            specific.fill = shape.fill();
        }

        return { ...common, ...specific };
    }

    /**
     * Apply properties to shape
     * @param {Konva.Shape} shape
     * @param {object} properties
     */
    function applyShapeProperties(shape, properties) {
        const className = shape.getClassName();

        // Common properties
        if (properties.x !== undefined) shape.x(properties.x);
        if (properties.y !== undefined) shape.y(properties.y);
        if (properties.rotation !== undefined) shape.rotation(properties.rotation);
        if (properties.scaleX !== undefined) shape.scaleX(properties.scaleX);
        if (properties.scaleY !== undefined) shape.scaleY(properties.scaleY);
        if (properties.opacity !== undefined) shape.opacity(properties.opacity);
        if (properties.draggable !== undefined) shape.draggable(properties.draggable);

        // Stroke and fill
        if (properties.stroke !== undefined) shape.stroke(properties.stroke);
        if (properties.strokeWidth !== undefined) shape.strokeWidth(properties.strokeWidth);
        if (properties.fill !== undefined) shape.fill(properties.fill);

        // Type-specific properties
        if (className === 'Rect') {
            if (properties.width !== undefined) shape.width(properties.width);
            if (properties.height !== undefined) shape.height(properties.height);
            if (properties.cornerRadius !== undefined) shape.cornerRadius(properties.cornerRadius);
        } else if (className === 'Circle') {
            if (properties.radius !== undefined) shape.radius(properties.radius);
        } else if (className === 'Ellipse') {
            if (properties.radiusX !== undefined) shape.radiusX(properties.radiusX);
            if (properties.radiusY !== undefined) shape.radiusY(properties.radiusY);
        } else if (className === 'Line' || className === 'Arrow') {
            if (properties.points !== undefined) shape.points(properties.points);
        } else if (className === 'Star') {
            if (properties.numPoints !== undefined) shape.numPoints(properties.numPoints);
            if (properties.innerRadius !== undefined) shape.innerRadius(properties.innerRadius);
            if (properties.outerRadius !== undefined) shape.outerRadius(properties.outerRadius);
        } else if (className === 'Text') {
            if (properties.text !== undefined) shape.text(properties.text);
            if (properties.fontSize !== undefined) shape.fontSize(properties.fontSize);
            if (properties.fontFamily !== undefined) shape.fontFamily(properties.fontFamily);
            if (properties.fontStyle !== undefined) shape.fontStyle(properties.fontStyle);
            if (properties.align !== undefined) shape.align(properties.align);
            if (properties.lineHeight !== undefined) shape.lineHeight(properties.lineHeight);
        } else if (className === 'Image') {
            if (properties.width !== undefined) shape.width(properties.width);
            if (properties.height !== undefined) shape.height(properties.height);
        }

        console.log('✓ Properties applied to:', className);
    }

    // ==================== SHAPE VALIDATION ====================

    /**
     * Check if shape has minimum size
     * @param {Konva.Shape} shape
     * @param {number} minSize - Minimum size in pixels
     * @returns {boolean}
     */
    function hasMinimumSize(shape, minSize = 5) {
        const className = shape.getClassName();

        if (className === 'Rect') {
            return Math.abs(shape.width()) >= minSize &&
                Math.abs(shape.height()) >= minSize;
        } else if (className === 'Circle') {
            return shape.radius() >= minSize;
        } else if (className === 'Ellipse') {
            return shape.radiusX() >= minSize || shape.radiusY() >= minSize;
        } else if (className === 'Line' || className === 'Arrow') {
            const points = shape.points();
            if (points.length < 4) return false;
            const dx = points[2] - points[0];
            const dy = points[3] - points[1];
            return Math.sqrt(dx * dx + dy * dy) >= minSize;
        }

        // For other shapes, assume they're valid
        return true;
    }

    /**
     * Validate shape data
     * @param {object} data - Shape data
     * @returns {{valid: boolean, errors: string[]}}
     */
    function validateShapeData(data) {
        const errors = [];

        if (!data.type) {
            errors.push('Shape type is required');
        }

        if (data.x === undefined || data.y === undefined) {
            errors.push('Position (x, y) is required');
        }

        // Type-specific validation
        if (data.type === 'rect') {
            if (!data.width || !data.height) {
                errors.push('Rectangle requires width and height');
            }
        } else if (data.type === 'circle') {
            if (!data.radius) {
                errors.push('Circle requires radius');
            }
        } else if (data.type === 'text') {
            if (!data.text) {
                errors.push('Text shape requires text content');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ==================== SHAPE SERIALIZATION ====================

    /**
     * Serialize shape to JSON
     * @param {Konva.Shape} shape
     * @returns {string}
     */
    function serializeShape(shape) {
        try {
            const data = shape.toObject();
            return JSON.stringify(data);
        } catch (error) {
            console.error('❌ Failed to serialize shape:', error);
            throw error;
        }
    }

    /**
     * Deserialize shape from JSON
     * @param {string} jsonString
     * @param {string} type - Shape type
     * @returns {Konva.Shape}
     */
    function deserializeShape(jsonString, type) {
        try {
            const data = JSON.parse(jsonString);

            const factories = {
                'rect': () => new Konva.Rect(data),
                'circle': () => new Konva.Circle(data),
                'ellipse': () => new Konva.Ellipse(data),
                'line': () => new Konva.Line(data),
                'arrow': () => new Konva.Arrow(data),
                'star': () => new Konva.Star(data),
                'text': () => new Konva.Text(data)
            };

            const factory = factories[type];
            if (!factory) {
                throw new Error('Unknown shape type: ' + type);
            }

            const shape = factory();
            console.log('✓ Shape deserialized:', type);
            return shape;

        } catch (error) {
            console.error('❌ Failed to deserialize shape:', error);
            throw error;
        }
    }

    // ==================== SHAPE GROUPS ====================

    /**
     * Create a group of shapes
     * @param {Konva.Shape[]} shapes - Array of shapes
     * @param {object} config - Group configuration
     * @returns {Konva.Group}
     */
    function createGroup(shapes, config = {}) {
        if (!Array.isArray(shapes) || shapes.length === 0) {
            throw new Error('Shapes array is required');
        }

        const group = new Konva.Group({
            draggable: true,
            ...config
        });

        shapes.forEach(shape => {
            group.add(shape);
        });

        console.log('✓ Group created with', shapes.length, 'shapes');
        return group;
    }

    /**
     * Ungroup shapes
     * @param {Konva.Group} group
     * @returns {Konva.Shape[]} - Array of shapes
     */
    function ungroupShapes(group) {
        if (!(group instanceof Konva.Group)) {
            throw new Error('Not a valid group');
        }

        const shapes = group.getChildren().toArray();
        const layer = group.getLayer();

        if (layer) {
            shapes.forEach(shape => {
                // Convert shape position to layer coordinates
                const absPos = shape.getAbsolutePosition();
                shape.moveTo(layer);
                shape.position(absPos);
            });
        }

        group.destroy();

        console.log('✓ Ungrouped', shapes.length, 'shapes');
        return shapes;
    }

    // ==================== SHAPE UTILITIES ====================

    /**
     * Get all shapes in layer (excluding transformer and background)
     * @returns {Konva.Shape[]}
     */
    function getAllShapes() {
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();
        const background = MapCore.getCanvasBackground();

        if (!layer) {
            console.error('❌ Layer not available');
            return [];
        }

        return layer.children.filter(child =>
            child !== transformer &&
            child !== background
        );
    }

    /**
     * Get shapes by type
     * @param {string} type - Shape type
     * @returns {Konva.Shape[]}
     */
    function getShapesByType(type) {
        const shapes = getAllShapes();
        return shapes.filter(shape =>
            shape.getClassName().toLowerCase() === type.toLowerCase()
        );
    }

    /**
     * Find shape by database ID
     * @param {number} dbId
     * @returns {Konva.Shape|null}
     */
    function findShapeByDbId(dbId) {
        const shapes = getAllShapes();
        return shapes.find(shape => shape.getAttr('dbId') === dbId) || null;
    }

    /**
     * Count shapes by type
     * @returns {object} - Object with type counts
     */
    function countShapesByType() {
        const shapes = getAllShapes();
        const counts = {};

        shapes.forEach(shape => {
            const type = shape.getClassName();
            counts[type] = (counts[type] || 0) + 1;
        });

        return counts;
    }

    /**
     * Get shape statistics
     * @returns {object}
     */
    function getShapeStatistics() {
        const shapes = getAllShapes();
        const counts = countShapesByType();

        return {
            total: shapes.length,
            byType: counts,
            draggable: shapes.filter(s => s.draggable()).length,
            visible: shapes.filter(s => s.visible()).length
        };
    }

    /**
     * Remove all shapes from layer
     * @param {boolean} confirm - Require confirmation
     * @returns {number} - Number of shapes removed
     */
    function clearAllShapes(confirm = true) {
        if (confirm && !window.confirm('Clear all shapes?')) {
            return 0;
        }

        const shapes = getAllShapes();
        const count = shapes.length;

        shapes.forEach(shape => shape.destroy());

        const layer = MapCore.getLayer();
        if (layer) {
            layer.batchDraw();
        }

        console.log('✓ Cleared', count, 'shapes');
        return count;
    }

    // ==================== PUBLIC API ====================

    return {
        // Factory methods
        createRect,
        createCircle,
        createEllipse,
        createLine,
        createArrow,
        createTriangle,
        createStar,
        createPolygon,
        createText,
        createImage,
        createShape,

        // Manipulation
        cloneShape,
        getShapeProperties,
        applyShapeProperties,

        // Validation
        hasMinimumSize,
        validateShapeData,

        // Serialization
        serializeShape,
        deserializeShape,

        // Groups
        createGroup,
        ungroupShapes,

        // Utilities
        getAllShapes,
        getShapesByType,
        findShapeByDbId,
        countShapesByType,
        getShapeStatistics,
        clearAllShapes,

        // Constants
        DEFAULT_CONFIG
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MapShapes = MapShapes;
}

console.log('✓ MapShapes module loaded');