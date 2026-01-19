// ============================================
// MAP EXPORT MODULE
// Export/Import Functionality
// ============================================

const MapExport = (function () {
    'use strict';

    function exportAsPNG() {
        const stage = MapCore.getStage();
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();

        if (!stage || !layer) {
            alert('Canvas not available');
            return;
        }

        try {
            if (transformer) {
                transformer.nodes([]);
                layer.batchDraw();
            }

            const dimensions = MapCore.getCanvasDimensions();
            const dataURL = stage.toDataURL({
                x: 0,
                y: 0,
                width: dimensions.width,
                height: dimensions.height,
                pixelRatio: 2
            });

            const filename = `map_${Date.now()}.png`;
            downloadFile(dataURL, filename);

            if (MapUI) MapUI.updateStatus('Đã xuất PNG', 'success');
            console.log('✓ Exported PNG:', filename);

        } catch (error) {
            console.error('❌ PNG export failed:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    function exportAsJSON() {
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();
        const background = MapCore.getCanvasBackground();

        if (!layer) {
            alert('Canvas not available');
            return;
        }

        try {
            const objects = [];
            layer.children.forEach(child => {
                if (child === transformer || child === background) return;

                const obj = child.toObject();
                obj._type = child.getClassName();
                obj._dbId = child.getAttr('dbId');

                if (obj._type === 'Image') {
                    obj._imageUrl = child.getAttr('uploadedUrl') ||
                        child.getAttr('librarySource');
                }

                objects.push(obj);
            });

            const dimensions = MapCore.getCanvasDimensions();
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                mapId: MapCore.getCurrentMapId(),
                canvasWidth: dimensions.width,
                canvasHeight: dimensions.height,
                objectCount: objects.length,
                objects: objects
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const filename = `map_${Date.now()}.json`;
            downloadFile(url, filename);
            URL.revokeObjectURL(url);

            if (MapUI) MapUI.updateStatus('Đã xuất JSON', 'success');
            console.log('✓ Exported JSON:', filename);

        } catch (error) {
            console.error('❌ JSON export failed:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    function exportAsSVG() {
        const layer = MapCore.getLayer();
        const transformer = MapCore.getTransformer();
        const background = MapCore.getCanvasBackground();

        if (!layer) {
            alert('Canvas not available');
            return;
        }

        try {
            const dimensions = MapCore.getCanvasDimensions();
            let svg = `<svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">`;
            svg += `<rect width="${dimensions.width}" height="${dimensions.height}" fill="white"/>`;

            layer.children.forEach(child => {
                if (child === transformer || child === background) return;

                const className = child.getClassName();
                const x = child.x();
                const y = child.y();
                const stroke = child.stroke() || 'none';
                const fill = child.fill() || 'none';
                const strokeWidth = child.strokeWidth() || 1;
                const opacity = child.opacity() || 1;

                if (className === 'Rect') {
                    svg += `<rect x="${x}" y="${y}" width="${child.width()}" height="${child.height()}" ` +
                        `stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
                } else if (className === 'Circle') {
                    svg += `<circle cx="${x}" cy="${y}" r="${child.radius()}" ` +
                        `stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
                }
            });

            svg += '</svg>';

            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const filename = `map_${Date.now()}.svg`;
            downloadFile(url, filename);
            URL.revokeObjectURL(url);

            if (MapUI) MapUI.updateStatus('Đã xuất SVG', 'success');
            console.log('✓ Exported SVG:', filename);

        } catch (error) {
            console.error('❌ SVG export failed:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    function importFromJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const jsonData = JSON.parse(event.target.result);

                    if (!jsonData.objects || !Array.isArray(jsonData.objects)) {
                        alert('File JSON không hợp lệ!');
                        return;
                    }

                    if (!confirm(`Nhập ${jsonData.objectCount} đối tượng?`)) return;

                    let importedCount = 0;
                    const layer = MapCore.getLayer();

                    jsonData.objects.forEach(objData => {
                        try {
                            let shape = null;
                            const type = objData._type;

                            if (type === 'Rect') shape = new Konva.Rect(objData);
                            else if (type === 'Circle') shape = new Konva.Circle(objData);
                            else if (type === 'Ellipse') shape = new Konva.Ellipse(objData);
                            else if (type === 'Line') shape = new Konva.Line(objData);
                            else if (type === 'Arrow') shape = new Konva.Arrow(objData);
                            else if (type === 'Star') shape = new Konva.Star(objData);
                            else if (type === 'Text') shape = new Konva.Text(objData);

                            if (shape && layer) {
                                layer.add(shape);
                                if (MapEvents) MapEvents.setupShapeEvents(shape);
                                importedCount++;
                            }
                        } catch (err) {
                            console.error('Failed to import:', err);
                        }
                    });

                    if (layer) layer.batchDraw();

                    if (MapUI) MapUI.updateStatus(`Đã nhập ${importedCount} đối tượng`, 'success');
                    alert(`Nhập thành công ${importedCount} đối tượng!`);

                } catch (error) {
                    console.error('❌ Import failed:', error);
                    alert('Lỗi: ' + error.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    function downloadFile(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return {
        exportAsPNG,
        exportAsJSON,
        exportAsSVG,
        importFromJSON
    };

})();

if (typeof window !== 'undefined') {
    window.MapExport = MapExport;
}

console.log('✓ MapExport module loaded');