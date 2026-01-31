// Global constants
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

// Simulation constants
const R = windowWidth / 6; // pool radius
const ANGLE_ALLOWANCE = 0.02; // about 1 degree
const SIM_SPEED = 1;
const SIM_SIZE = 8;
const CAT_SPEED_MULTIPLIER = 4;

// Spiral strategy constants
const SPIRAL_CENTER_THRESHOLD = 2; // how close to center counts as "at center"
const SPIRAL_DASH_FRAMES = 10; // how long to dash opposite
const SPIRAL_RADIAL_WEIGHT = 1.0; // outward push
const SPIRAL_TANGENTIAL_WEIGHT = 0.8; // sideways push (away from cat)
const CAT_SETTLE_THRESHOLD = 0.04; // how slow the cat must be
const CAT_SETTLE_FRAMES = 30; // how many frames in a row

// Circling strategy constants
const CIRCLING_BOUNDARY = R / CAT_SPEED_MULTIPLIER;
const DASH_BOUNDARY = R * (1 - Math.PI / 4);
const OPTIMAL_CIRCLE_RADIUS = (CIRCLING_BOUNDARY + DASH_BOUNDARY) / 2;
const OPPOSITE_ANGLE_TOLERANCE = 0.05; // radians (~3 degrees)

// Global variables updated during simulation
let simState = "idle"; // "idle", "running", "terminal"
let simResult = null;
let currentStrategy = null;
let mouse;
let prevMouse;
let cat;
let prevCat;
let prevCatAngle = 0;
let catAngularVelocity = 0;

function setup() {
	noLoop();

	const canvas = createCanvas(windowWidth / 1.3, windowHeight / 1.3);
	canvas.parent("canvas-container");
	angleMode(RADIANS);

	initializeButtons();
	initializeCatMouse();
	resetSimulation();
}

function initializeButtons() {
	resetBtn = createButton("Reset");
	resetBtn.class("btn btn-secondary");
	resetBtn.position(windowWidth / 5, windowHeight / 1.5);
	resetBtn.mousePressed(resetSimulation);

	playPauseBtn = createButton("Pause");
	playPauseBtn.class("btn btn-danger");
	playPauseBtn.position(windowWidth / 5, windowHeight / 1.35);
	playPauseBtn.mousePressed(handlePlayPause);
	playPauseBtn.hide();

	manualModeStratBtn = createButton("Strategy: Manual Mode");
	manualModeStratBtn.class("btn btn-primary");
	manualModeStratBtn.position(windowWidth / 5, windowHeight / 6);
	manualModeStratBtn.mousePressed(() => startStrategy(manualUpdateMouse));

	nearEdgeStratBtn = createButton("Strategy: Nearest Edge");
	nearEdgeStratBtn.class("btn btn-warning");
	nearEdgeStratBtn.position(windowWidth / 5, windowHeight / 4);
	nearEdgeStratBtn.mousePressed(() => startStrategy(strategyNearestEdge));

	dashOppStratBtn = createButton("Strategy: Opposite Dash");
	dashOppStratBtn.class("btn btn-info");
	dashOppStratBtn.position(windowWidth / 5, windowHeight / 3);
	dashOppStratBtn.mousePressed(() => startStrategy(strategyDashOpposite));

	optimalCircleBtn = createButton("Strategy: Optimal Circling");
	optimalCircleBtn.class("btn btn-functional");
	optimalCircleBtn.position(windowWidth / 5, windowHeight / 2.4);
	optimalCircleBtn.mousePressed(() => startStrategy(strategyOptimalCircling));

	spiralStratBtn = createButton("Strategy: Spiral Escape");
	spiralStratBtn.class("btn btn-danger");
	spiralStratBtn.position(windowWidth / 5, windowHeight / 2);
	spiralStratBtn.mousePressed(() => startStrategy(strategySpiralEscape));
}

function initializeCatMouse() {
	// Initialize mouse at center
	mouse = {
		x: 0,
		y: 0,
		speed: SIM_SPEED,
		dashDir: null,
		spiralPhase: 0,
		spiralFrames: 0,
		spiralDashDir: null,
		spiralCatDir: null,
		spiralCatStillFrames: 0,
		optimalPhase: 0,
		optimalFrames: 0,
		optimalDirection: null, // CW or CCW
	};
	prevMouse = { x: 0, y: 0 };

	// Initialize cat on the boundary
	cat = {
		x: 0,
		y: 0,
		angle: PI,
		speed: SIM_SPEED * CAT_SPEED_MULTIPLIER,
	};
	prevCat = { x: 0, y: 0 };
}

function draw() {
	background(240);
	translate(width / 1.5, height / 2); // move origin to center of pool
	drawPool();

	switch (simState) {
		case "idle":
			drawMouse();
			drawMouseIcon(mouse.x + SIM_SIZE * 0.8, mouse.y - SIM_SIZE * 0.8);
			drawCat();
			drawCatIcon(cat.x + SIM_SIZE * 0.8, cat.y - SIM_SIZE * 0.8);
			break;

		case "running":
			currentStrategy();
			updateCat();
			drawMouse();
			drawMouseIcon(mouse.x + SIM_SIZE * 0.8, mouse.y - SIM_SIZE * 0.8);
			drawCat();
			drawCatIcon(cat.x + SIM_SIZE * 0.8, cat.y - SIM_SIZE * 0.8);
			if (currentStrategy === strategyOptimalCircling) {
				drawCirclingBoundary();
				drawDashBoundary();
			}
			checkEscape();
			checkCollision();

			if (window.debugCatMouseSim) {
				computeSpeeds();
			}
			break;

		case "terminal":
			playPauseBtn.hide();
			fill(simResult === "escaped" ? "green" : "red");
			textSize(24);
			textAlign(CENTER, CENTER);
			text(simResult.toUpperCase(), 0, -R - 20);
			textAlign(LEFT, BASELINE);
			if (simResult === "escaped") {
				drawMouse();
				drawMouseIcon(mouse.x + SIM_SIZE * 0.8, mouse.y - SIM_SIZE * 0.8);
			} else {
				drawCat();
				drawCatIcon(cat.x + SIM_SIZE * 0.8, cat.y - SIM_SIZE * 0.8);
				noLoop();
			}
			break;

		default:
			console.error("Unknown simulation state:", simState);
			fill("red");
			textSize(24);
			textAlign(CENTER, CENTER);
			text("ERROR - please refresh and try again", 0, -R - 20);
			noLoop();
	}
}

function drawPool() {
	fill("lightblue");
	stroke(0);
	strokeWeight(2);
	circle(0, 0, R * 2);
	fill("black");
	circle(0, 0, R / 100); // center marker
}

function handlePlayPause() {
	if (isLooping()) {
		noLoop();
		playPauseBtn.html("Play");
		playPauseBtn.class("btn btn-success");
	} else {
		loop();
		playPauseBtn.html("Pause");
		playPauseBtn.class("btn btn-danger");
	}
}

function updateCat() {
	let mouseAngle = atan2(mouse.y, mouse.x);

	let diff = mouseAngle - cat.angle;
	diff = atan2(sin(diff), cos(diff));
	if (abs(diff) < ANGLE_ALLOWANCE) return;

	let direction = diff > 0 ? 1 : -1;

	// dt = seconds per frame
	const dt = 1 / frameRate();

	// mouse.speed is px/frame, convert to px/s
	const mouseSpeedPerSecond = mouse.speed / dt;

	// cat should be 4× faster
	const catLinearSpeed = CAT_SPEED_MULTIPLIER * mouseSpeedPerSecond;

	// convert linear speed to angular speed
	const angularSpeed = (catLinearSpeed * dt) / R;
	cat.angle += direction * angularSpeed;
	cat.angle = atan2(sin(cat.angle), cos(cat.angle));

	// update cat velocity and angle for strategy decisions
	catAngularVelocity = cat.angle - prevCatAngle;
	prevCatAngle = cat.angle;
}

function drawMouse() {
	fill("blue");
	noStroke();
	circle(mouse.x, mouse.y, SIM_SIZE);
}

function drawCat() {
	cat.x = R * cos(cat.angle);
	cat.y = R * sin(cat.angle);

	fill("red");
	noStroke();
	circle(cat.x, cat.y, SIM_SIZE);
}

function drawMouseIcon(x, y) {
	push();
	translate(x, y);
	textSize(Math.max(windowWidth, windowHeight) * 0.03);
	text("🐭", 0, 0);
	pop();
}

function drawCatIcon(x, y) {
	push();
	translate(x, y);
	textSize(Math.max(windowWidth, windowHeight) * 0.03);
	text("🐱", 0, 0);
	pop();
}

function drawCirclingBoundary() {
	push();
	noFill();
	stroke("red");
	strokeWeight(1);
	circle(0, 0, CIRCLING_BOUNDARY * 2);
	pop();
}

function drawDashBoundary() {
	push();
	noFill();
	stroke("green"); // orange outline
	strokeWeight(1);
	circle(0, 0, DASH_BOUNDARY * 2);
	pop();
}

function checkCollision() {
	// Cat's true mathematical position
	const cx = R * cos(cat.angle);
	const cy = R * sin(cat.angle);

	// Distance between cat and mouse
	const dx = mouse.x - cx;
	const dy = mouse.y - cy;
	const dist = sqrt(dx * dx + dy * dy);

	// Collision threshold (tune this)
	const threshold = SIM_SIZE * 0.5;

	if (dist < threshold) {
		simState = "terminal";
		simResult = "caught";
	}
}

function checkEscape() {
	const distFromCenter = sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
	if (distFromCenter >= R) {
		simState = "terminal";
		simResult = "escaped";
	}
}

function resetSimulation() {
	// Reset simulation state
	simState = "idle";
	simResult = null;
	currentStrategy = null;
	manualModeStratBtn.show();
	nearEdgeStratBtn.show();
	dashOppStratBtn.show();
	spiralStratBtn.show();
	optimalCircleBtn.show();

	// Random mouse position
	const p = randomPointInCircle(R / 2);
	mouse.x = p.x;
	mouse.y = p.y;
	mouse.speed = SIM_SPEED;
	mouse.dashDir = null;
	mouse.spiralPhase = 0;
	mouse.spiralFrames = 0;
	mouse.spiralDashDir = null;
	mouse.spiralCatDir = null;
	mouse.spiralCatStillFrames = 0;
	mouse.optimalPhase = 0;
	mouse.optimalFrames = 0;
	mouse.optimalDirection = null;

	// Random cat angle
	cat.angle = randomAngle();
	cat.speed = SIM_SPEED * CAT_SPEED_MULTIPLIER;

	// True position on boundary
	cat.x = R * cos(cat.angle);
	cat.y = R * sin(cat.angle);

	// Reset previous positions
	prevMouse.x = mouse.x;
	prevMouse.y = mouse.y;
	prevCat.x = cat.x;
	prevCat.y = cat.y;

	// Draw exactly one clean frame
	redraw();
	noLoop();
}

function startStrategy(strategyFunc) {
	simState = "running";
	currentStrategy = strategyFunc;
	manualModeStratBtn.hide();
	nearEdgeStratBtn.hide();
	dashOppStratBtn.hide();
	spiralStratBtn.hide();
	optimalCircleBtn.hide();
	playPauseBtn.show();
	loop();
}
