// ============= SCADA SYMBOLS LIBRARY =============
// Industrial automation symbols for SCADA systems

const SCADA_COLORS = {
    primary: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    pipe: '#607D8B',
    tank: '#455A64',
    motor: '#1976D2',
    valve: '#FFC107'
};

// ============= MOTORS & PUMPS =============

function createMotor(x, y, size = 60) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Motor body (circle)
    const body = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size / 2,
        fill: SCADA_COLORS.motor,
        stroke: '#000',
        strokeWidth: 2
    });

    // Letter M
    const text = new Konva.Text({
        x: -size / 4,
        y: -size / 6,
        text: 'M',
        fontSize: size / 2,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: 'white'
    });

    // Three phase lines
    for (let i = 0; i < 3; i++) {
        const line = new Konva.Line({
            points: [-size / 2 + i * size / 4, -size * 0.8, -size / 2 + i * size / 4, -size / 2],
            stroke: '#000',
            strokeWidth: 2
        });
        group.add(line);
    }

    group.add(body, text);
    group.setAttr('scadaType', 'motor');
    return group;
}

function createPump(x, y, size = 60) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Pump body (circle)
    const body = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size / 2,
        fill: SCADA_COLORS.primary,
        stroke: '#000',
        strokeWidth: 2
    });

    // Impeller (curved arrow)
    const arrow = new Konva.Path({
        data: 'M-15,-10 Q-20,0 -15,10 L-10,5 L-10,-5 Z M10,-10 Q15,0 10,10',
        fill: 'white',
        stroke: 'white',
        strokeWidth: 2
    });

    // Letter P
    const text = new Konva.Text({
        x: -size / 6,
        y: size / 4,
        text: 'P',
        fontSize: size / 3,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: 'white'
    });

    group.add(body, arrow, text);
    group.setAttr('scadaType', 'pump');
    return group;
}

// ============= VALVES =============

function createValve(x, y, size = 50, type = 'gate') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    if (type === 'gate') {
        // Gate valve - triangle
        const triangle = new Konva.Line({
            points: [-size / 2, size / 2, 0, -size / 2, size / 2, size / 2],
            fill: SCADA_COLORS.valve,
            stroke: '#000',
            strokeWidth: 2,
            closed: true
        });

        const stem = new Konva.Line({
            points: [0, -size / 2, 0, -size],
            stroke: '#000',
            strokeWidth: 3
        });

        group.add(triangle, stem);
    } else if (type === 'ball') {
        // Ball valve - circle with line
        const ball = new Konva.Circle({
            x: 0,
            y: 0,
            radius: size / 2,
            fill: SCADA_COLORS.valve,
            stroke: '#000',
            strokeWidth: 2
        });

        const line = new Konva.Line({
            points: [-size / 2, 0, size / 2, 0],
            stroke: '#000',
            strokeWidth: 4
        });

        group.add(ball, line);
    } else if (type === 'check') {
        // Check valve - triangle + circle
        const triangle = new Konva.Line({
            points: [-size / 2, size / 2, 0, -size / 2, size / 2, size / 2],
            fill: SCADA_COLORS.valve,
            stroke: '#000',
            strokeWidth: 2,
            closed: true
        });

        const circle = new Konva.Circle({
            x: 0,
            y: 0,
            radius: size / 3,
            stroke: '#000',
            strokeWidth: 2
        });

        group.add(triangle, circle);
    }

    group.setAttr('scadaType', 'valve');
    group.setAttr('valveType', type);
    return group;
}

// ============= TANKS & VESSELS =============

function createTank(x, y, width = 80, height = 100, type = 'vertical') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    if (type === 'vertical') {
        // Vertical tank
        const body = new Konva.Rect({
            x: -width / 2,
            y: -height / 2,
            width: width,
            height: height,
            fill: SCADA_COLORS.tank,
            stroke: '#000',
            strokeWidth: 2
        });

        // Level indicator (animated)
        const level = new Konva.Rect({
            x: -width / 2 + 5,
            y: 0,
            width: width - 10,
            height: height / 2 - 5,
            fill: 'rgba(33, 150, 243, 0.5)',
            stroke: SCADA_COLORS.primary,
            strokeWidth: 1
        });

        group.add(body, level);
        group.setAttr('levelIndicator', level);
    } else if (type === 'horizontal') {
        // Horizontal tank
        const body = new Konva.Ellipse({
            x: 0,
            y: 0,
            radiusX: width / 2,
            radiusY: height / 2,
            fill: SCADA_COLORS.tank,
            stroke: '#000',
            strokeWidth: 2
        });

        group.add(body);
    }

    group.setAttr('scadaType', 'tank');
    group.setAttr('tankType', type);
    return group;
}

// ============= PIPES & FLOW =============

function createPipe(x1, y1, x2, y2, diameter = 20) {
    const group = new Konva.Group({
        draggable: true
    });

    // Main pipe line
    const pipe = new Konva.Line({
        points: [x1, y1, x2, y2],
        stroke: SCADA_COLORS.pipe,
        strokeWidth: diameter,
        lineCap: 'round',
        lineJoin: 'round'
    });

    // Flow direction arrow
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    const arrow = new Konva.Arrow({
        points: [midX - 20, midY, midX + 20, midY],
        fill: 'yellow',
        stroke: 'yellow',
        strokeWidth: 3,
        pointerLength: 10,
        pointerWidth: 10,
        rotation: (angle * 180 / Math.PI)
    });

    group.add(pipe, arrow);
    group.setAttr('scadaType', 'pipe');
    return group;
}

// ============= SENSORS & INSTRUMENTS =============

function createSensor(x, y, size = 40, type = 'pressure') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Sensor body (circle)
    const body = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size / 2,
        fill: 'white',
        stroke: '#000',
        strokeWidth: 2
    });

    let symbol;
    if (type === 'pressure') {
        symbol = new Konva.Text({
            x: -size / 4,
            y: -size / 6,
            text: 'P',
            fontSize: size / 2,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#000'
        });
    } else if (type === 'temperature') {
        symbol = new Konva.Text({
            x: -size / 4,
            y: -size / 6,
            text: 'T',
            fontSize: size / 2,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#F44336'
        });
    } else if (type === 'flow') {
        symbol = new Konva.Text({
            x: -size / 4,
            y: -size / 6,
            text: 'F',
            fontSize: size / 2,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#2196F3'
        });
    } else if (type === 'level') {
        symbol = new Konva.Text({
            x: -size / 4,
            y: -size / 6,
            text: 'L',
            fontSize: size / 2,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#4CAF50'
        });
    }

    group.add(body, symbol);
    group.setAttr('scadaType', 'sensor');
    group.setAttr('sensorType', type);
    return group;
}

// ============= ELECTRICAL COMPONENTS =============

function createSwitch(x, y, size = 50, state = 'open') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Connection points
    const point1 = new Konva.Circle({
        x: -size / 2,
        y: 0,
        radius: 5,
        fill: '#000'
    });

    const point2 = new Konva.Circle({
        x: size / 2,
        y: 0,
        radius: 5,
        fill: '#000'
    });

    // Switch blade
    const blade = new Konva.Line({
        points: state === 'open' ?
            [-size / 2, 0, size / 4, -size / 3] :
            [-size / 2, 0, size / 2, 0],
        stroke: '#000',
        strokeWidth: 3,
        lineCap: 'round'
    });

    group.add(point1, point2, blade);
    group.setAttr('scadaType', 'switch');
    group.setAttr('switchState', state);

    // Click to toggle
    group.on('dblclick', function () {
        const currentState = this.getAttr('switchState');
        const newState = currentState === 'open' ? 'closed' : 'open';

        blade.points(newState === 'open' ?
            [-size / 2, 0, size / 4, -size / 3] :
            [-size / 2, 0, size / 2, 0]);

        this.setAttr('switchState', newState);
        layer.batchDraw();
    });

    return group;
}

function createIndicatorLight(x, y, size = 30, color = 'green') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    const colors = {
        'green': '#4CAF50',
        'red': '#F44336',
        'yellow': '#FFC107',
        'blue': '#2196F3'
    };

    // Light bulb
    const bulb = new Konva.Circle({
        x: 0,
        y: 0,
        radius: size / 2,
        fill: colors[color] || colors['green'],
        stroke: '#000',
        strokeWidth: 2,
        shadowColor: colors[color] || colors['green'],
        shadowBlur: 20,
        shadowOpacity: 0.8
    });

    group.add(bulb);
    group.setAttr('scadaType', 'indicator');
    group.setAttr('indicatorColor', color);

    // Click to toggle glow
    group.on('dblclick', function () {
        const currentBlur = bulb.shadowBlur();
        bulb.shadowBlur(currentBlur > 0 ? 0 : 20);
        layer.batchDraw();
    });

    return group;
}

// ============= PROCESS EQUIPMENT =============

function createHeatExchanger(x, y, size = 80) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Outer shell
    const shell = new Konva.Rect({
        x: -size / 2,
        y: -size / 3,
        width: size,
        height: size * 2 / 3,
        stroke: '#000',
        strokeWidth: 2
    });

    // Tubes (zigzag pattern)
    const tubes = new Konva.Line({
        points: [
            -size / 3, -size / 4,
            -size / 6, size / 4,
            0, -size / 4,
            size / 6, size / 4,
            size / 3, -size / 4
        ],
        stroke: SCADA_COLORS.primary,
        strokeWidth: 2
    });

    group.add(shell, tubes);
    group.setAttr('scadaType', 'heatExchanger');
    return group;
}

function createCompressor(x, y, size = 70) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Compressor body (trapezoid)
    const body = new Konva.Line({
        points: [
            -size / 3, -size / 2,
            size / 3, -size / 2,
            size / 2, size / 2,
            -size / 2, size / 2
        ],
        fill: SCADA_COLORS.motor,
        stroke: '#000',
        strokeWidth: 2,
        closed: true
    });

    // Letter C
    const text = new Konva.Text({
        x: -size / 6,
        y: -size / 8,
        text: 'C',
        fontSize: size / 2.5,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: 'white'
    });

    group.add(body, text);
    group.setAttr('scadaType', 'compressor');
    return group;
}

// ============= UTILITY FUNCTIONS =============

function addScadaSymbol(type, subtype, x, y) {
    let symbol;

    switch (type) {
        case 'motor':
            symbol = createMotor(x, y);
            break;
        case 'pump':
            symbol = createPump(x, y);
            break;
        case 'valve':
            symbol = createValve(x, y, 50, subtype || 'gate');
            break;
        case 'tank':
            symbol = createTank(x, y, 80, 100, subtype || 'vertical');
            break;
        case 'sensor':
            symbol = createSensor(x, y, 40, subtype || 'pressure');
            break;
        case 'switch':
            symbol = createSwitch(x, y);
            break;
        case 'indicator':
            symbol = createIndicatorLight(x, y, 30, subtype || 'green');
            break;
        case 'heatExchanger':
            symbol = createHeatExchanger(x, y);
            break;
        case 'compressor':
            symbol = createCompressor(x, y);
            break;
        // ✅ NEW: Conveyor belts
        case 'conveyor':
            symbol = createConveyorBelt(x, y, 200, 60, subtype || 'flat');
            break;
        // ✅ NEW: Lights
        case 'stackLight':
            const colors = subtype ? subtype.split(',') : ['red', 'yellow', 'green'];
            symbol = createStackLight(x, y, 40, colors);
            break;
        case 'beacon':
            symbol = createBeacon(x, y, 50, subtype || 'red', 'rotating');
            break;
        case 'beaconStrobe':
            symbol = createBeacon(x, y, 50, subtype || 'red', 'strobe');
            break;
        case 'emergencyLight':
            symbol = createEmergencyLight(x, y);
            break;
        case 'lightBar':
            const barColors = subtype ? subtype.split(',') : ['red', 'blue'];
            symbol = createLightBar(x, y, 150, 40, barColors);
            break;
        default:
            console.error('Unknown SCADA symbol type:', type);
            return null;
    }

    if (symbol) {
        setupDragBoundaries(symbol);
        setupShapeEvents(symbol);
        layer.add(symbol);
        layer.batchDraw();
        saveObject(symbol, 'group');
        updateStatus('Đã thêm: ' + type);
    }

    return symbol;
}
// Export functions
window.SCADA = {
    createMotor,
    createPump,
    createValve,
    createTank,
    createPipe,
    createSensor,
    createSwitch,
    createIndicatorLight,
    createHeatExchanger,
    createCompressor,
    // ✅ NEW: Conveyor belts
    createConveyorBelt,
    // ✅ NEW: Lights
    createStackLight,
    createBeacon,
    createEmergencyLight,
    createLightBar,
    addScadaSymbol
};


// ============= CONVEYOR BELTS =============

function createConveyorBelt(x, y, width = 200, height = 60, type = 'flat') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    if (type === 'flat') {
        // Flat conveyor belt
        const frame = new Konva.Rect({
            x: -width / 2,
            y: -height / 2,
            width: width,
            height: height,
            stroke: '#000',
            strokeWidth: 3
        });

        // Belt surface
        const belt = new Konva.Rect({
            x: -width / 2 + 5,
            y: -height / 2 + 5,
            width: width - 10,
            height: height - 10,
            fill: '#555',
            stroke: '#333',
            strokeWidth: 1
        });

        // Rollers
        const rollerCount = Math.floor(width / 40);
        for (let i = 0; i < rollerCount; i++) {
            const roller = new Konva.Circle({
                x: -width / 2 + 20 + i * (width - 40) / (rollerCount - 1),
                y: height / 2 - 10,
                radius: 8,
                fill: '#888',
                stroke: '#000',
                strokeWidth: 1
            });
            group.add(roller);
        }

        // Direction arrows (animated)
        const arrowCount = Math.floor(width / 60);
        for (let i = 0; i < arrowCount; i++) {
            const arrow = new Konva.Arrow({
                points: [
                    -width / 2 + 30 + i * 60, 0,
                    -width / 2 + 50 + i * 60, 0
                ],
                fill: 'yellow',
                stroke: 'yellow',
                strokeWidth: 3,
                pointerLength: 8,
                pointerWidth: 8
            });
            group.add(arrow);
        }

        group.add(frame, belt);

    } else if (type === 'inclined') {
        // Inclined conveyor belt
        const angle = 30; // degrees
        const inclineHeight = width * Math.tan(angle * Math.PI / 180);

        const points = [
            -width / 2, height / 2,
            width / 2, height / 2 - inclineHeight,
            width / 2, height / 2 - inclineHeight - 20,
            -width / 2, height / 2 - 20
        ];

        const belt = new Konva.Line({
            points: points,
            fill: '#555',
            stroke: '#000',
            strokeWidth: 3,
            closed: true
        });

        // Support structure
        const support1 = new Konva.Line({
            points: [-width / 2, height / 2, -width / 2, height / 2 + 30],
            stroke: '#666',
            strokeWidth: 4
        });

        const support2 = new Konva.Line({
            points: [width / 2, height / 2 - inclineHeight, width / 2, height / 2 + 30],
            stroke: '#666',
            strokeWidth: 4
        });

        // Direction arrows
        const arrow = new Konva.Arrow({
            points: [0, 0, width / 4, -inclineHeight / 2],
            fill: 'yellow',
            stroke: 'yellow',
            strokeWidth: 3,
            pointerLength: 10,
            pointerWidth: 10
        });

        group.add(support1, support2, belt, arrow);

    } else if (type === 'roller') {
        // Roller conveyor
        const frame = new Konva.Rect({
            x: -width / 2,
            y: -height / 2,
            width: width,
            height: height,
            stroke: '#000',
            strokeWidth: 3
        });

        // Multiple rollers
        const rollerCount = Math.floor(width / 25);
        for (let i = 0; i < rollerCount; i++) {
            const roller = new Konva.Rect({
                x: -width / 2 + 10 + i * (width - 20) / rollerCount,
                y: -height / 2 + 10,
                width: 5,
                height: height - 20,
                fill: '#888',
                stroke: '#333',
                strokeWidth: 1
            });
            group.add(roller);
        }

        // Direction arrow
        const arrow = new Konva.Arrow({
            points: [0, 0, width / 3, 0],
            fill: 'yellow',
            stroke: 'yellow',
            strokeWidth: 3,
            pointerLength: 10,
            pointerWidth: 10
        });

        group.add(frame, arrow);
    }

    group.setAttr('scadaType', 'conveyor');
    group.setAttr('conveyorType', type);

    // Double-click to reverse direction
    group.on('dblclick', function () {
        const arrows = this.find('Arrow');
        arrows.forEach(arrow => {
            const points = arrow.points();
            arrow.points([points[2], points[3], points[0], points[1]]);
        });
        layer.batchDraw();
    });

    return group;
}

// ============= LIGHTS & BEACONS =============

function createStackLight(x, y, size = 40, colors = ['red', 'yellow', 'green']) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    const colorMap = {
        'red': '#F44336',
        'yellow': '#FFC107',
        'green': '#4CAF50',
        'blue': '#2196F3',
        'white': '#FFFFFF',
        'orange': '#FF5722'
    };

    // Base
    const base = new Konva.Rect({
        x: -size / 2,
        y: colors.length * size / 2,
        width: size,
        height: size / 2,
        fill: '#333',
        stroke: '#000',
        strokeWidth: 2
    });
    group.add(base);

    // Stack of lights
    colors.forEach((color, index) => {
        const light = new Konva.Circle({
            x: 0,
            y: (colors.length - 1 - index) * size / 2,
            radius: size / 2.5,
            fill: colorMap[color] || colorMap['green'],
            stroke: '#000',
            strokeWidth: 2,
            shadowColor: colorMap[color] || colorMap['green'],
            shadowBlur: 0,
            shadowOpacity: 0
        });

        light.setAttr('lightColor', color);
        light.setAttr('lightOn', false);
        group.add(light);
    });

    group.setAttr('scadaType', 'stackLight');

    // Click to toggle lights
    group.on('click', function (e) {
        if (e.target instanceof Konva.Circle) {
            const isOn = e.target.getAttr('lightOn');
            e.target.shadowBlur(isOn ? 0 : 20);
            e.target.shadowOpacity(isOn ? 0 : 0.8);
            e.target.setAttr('lightOn', !isOn);
            layer.batchDraw();
        }
    });

    return group;
}

function createBeacon(x, y, size = 50, color = 'red', type = 'rotating') {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    const colorMap = {
        'red': '#F44336',
        'yellow': '#FFC107',
        'blue': '#2196F3',
        'orange': '#FF5722'
    };

    if (type === 'rotating') {
        // Rotating beacon
        const base = new Konva.Circle({
            x: 0,
            y: 0,
            radius: size / 2,
            fill: '#333',
            stroke: '#000',
            strokeWidth: 2
        });

        const dome = new Konva.Circle({
            x: 0,
            y: 0,
            radius: size / 2.5,
            fill: colorMap[color] || colorMap['red'],
            opacity: 0.7,
            stroke: '#000',
            strokeWidth: 1
        });

        // Rotating light beam
        const beam = new Konva.Wedge({
            x: 0,
            y: 0,
            radius: size / 2,
            angle: 60,
            fill: colorMap[color] || colorMap['red'],
            opacity: 0.4,
            rotation: 0
        });

        group.add(base, beam, dome);
        group.setAttr('beamShape', beam);

    } else if (type === 'strobe') {
        // Strobe light
        const base = new Konva.Rect({
            x: -size / 2,
            y: -size / 3,
            width: size,
            height: size * 2 / 3,
            fill: '#333',
            stroke: '#000',
            strokeWidth: 2
        });

        const light = new Konva.Rect({
            x: -size / 2.5,
            y: -size / 4,
            width: size / 1.25,
            height: size / 2,
            fill: colorMap[color] || colorMap['red'],
            stroke: '#000',
            strokeWidth: 1,
            shadowColor: colorMap[color] || colorMap['red'],
            shadowBlur: 0
        });

        group.add(base, light);
        group.setAttr('lightShape', light);
    }

    group.setAttr('scadaType', 'beacon');
    group.setAttr('beaconType', type);
    group.setAttr('beaconColor', color);
    group.setAttr('isAnimating', false);

    // Click to start/stop animation
    group.on('dblclick', function () {
        const isAnimating = this.getAttr('isAnimating');
        this.setAttr('isAnimating', !isAnimating);

        if (!isAnimating) {
            startBeaconAnimation(this, type);
        } else {
            stopBeaconAnimation(this);
        }
    });

    return group;
}

function startBeaconAnimation(beaconGroup, type) {
    if (type === 'rotating') {
        const beam = beaconGroup.getAttr('beamShape');
        if (!beam) return;

        const anim = new Konva.Animation(function (frame) {
            if (!beaconGroup.getAttr('isAnimating')) {
                anim.stop();
                return;
            }
            beam.rotation(frame.time / 10); // Rotate continuously
        }, layer);

        anim.start();
        beaconGroup.setAttr('animation', anim);

    } else if (type === 'strobe') {
        const light = beaconGroup.getAttr('lightShape');
        if (!light) return;

        const anim = new Konva.Animation(function (frame) {
            if (!beaconGroup.getAttr('isAnimating')) {
                anim.stop();
                light.shadowBlur(0);
                return;
            }
            // Strobe effect
            const blur = Math.abs(Math.sin(frame.time / 200)) * 30;
            light.shadowBlur(blur);
        }, layer);

        anim.start();
        beaconGroup.setAttr('animation', anim);
    }
}

function stopBeaconAnimation(beaconGroup) {
    const anim = beaconGroup.getAttr('animation');
    if (anim) {
        anim.stop();
    }

    const type = beaconGroup.getAttr('beaconType');
    if (type === 'strobe') {
        const light = beaconGroup.getAttr('lightShape');
        if (light) light.shadowBlur(0);
    }

    layer.batchDraw();
}

function createEmergencyLight(x, y, size = 60) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    // Emergency light box
    const box = new Konva.Rect({
        x: -size / 2,
        y: -size / 3,
        width: size,
        height: size * 2 / 3,
        fill: 'red',
        stroke: '#000',
        strokeWidth: 2,
        cornerRadius: 5
    });

    // EXIT text
    const text = new Konva.Text({
        x: -size / 2 + 5,
        y: -size / 6,
        text: 'EXIT',
        fontSize: size / 4,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: 'white'
    });

    // Light indicator
    const indicator = new Konva.Circle({
        x: size / 2 - 10,
        y: -size / 6,
        radius: 5,
        fill: 'lime',
        shadowColor: 'lime',
        shadowBlur: 10
    });

    group.add(box, text, indicator);
    group.setAttr('scadaType', 'emergencyLight');

    return group;
}

function createLightBar(x, y, width = 150, height = 40, colors = ['red', 'blue']) {
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true
    });

    const colorMap = {
        'red': '#F44336',
        'blue': '#2196F3',
        'yellow': '#FFC107',
        'orange': '#FF5722'
    };

    // Base bar
    const bar = new Konva.Rect({
        x: -width / 2,
        y: -height / 2,
        width: width,
        height: height,
        fill: '#333',
        stroke: '#000',
        strokeWidth: 2,
        cornerRadius: 5
    });
    group.add(bar);

    // Light sections
    const sectionWidth = width / colors.length;
    colors.forEach((color, index) => {
        const light = new Konva.Rect({
            x: -width / 2 + index * sectionWidth + 5,
            y: -height / 2 + 5,
            width: sectionWidth - 10,
            height: height - 10,
            fill: colorMap[color] || colorMap['red'],
            cornerRadius: 3,
            shadowColor: colorMap[color] || colorMap['red'],
            shadowBlur: 0
        });

        light.setAttr('lightColor', color);
        light.setAttr('lightIndex', index);
        group.add(light);
    });

    group.setAttr('scadaType', 'lightBar');
    group.setAttr('isAnimating', false);

    // Click to start/stop alternating animation
    group.on('dblclick', function () {
        const isAnimating = this.getAttr('isAnimating');
        this.setAttr('isAnimating', !isAnimating);

        if (!isAnimating) {
            startLightBarAnimation(this);
        } else {
            stopLightBarAnimation(this);
        }
    });

    return group;
}

function startLightBarAnimation(lightBarGroup) {
    const lights = lightBarGroup.find('Rect').filter(r => r.getAttr('lightColor'));

    const anim = new Konva.Animation(function (frame) {
        if (!lightBarGroup.getAttr('isAnimating')) {
            anim.stop();
            lights.forEach(light => light.shadowBlur(0));
            return;
        }

        // Alternating pattern
        const phase = Math.floor(frame.time / 300) % lights.length;
        lights.forEach((light, index) => {
            light.shadowBlur(index === phase ? 20 : 0);
        });
    }, layer);

    anim.start();
    lightBarGroup.setAttr('animation', anim);
}

function stopLightBarAnimation(lightBarGroup) {
    const anim = lightBarGroup.getAttr('animation');
    if (anim) {
        anim.stop();
    }

    const lights = lightBarGroup.find('Rect').filter(r => r.getAttr('lightColor'));
    lights.forEach(light => light.shadowBlur(0));
    layer.batchDraw();
}

console.log('✓ SCADA Symbols Library loaded');