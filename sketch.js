const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const R = windowWidth / 10; // pool radius
const ANGLE_ALLOWANCE = 0.02; // about 1 degree
const SIM_SPEED = 1;
const SIM_SIZE = 10;
const CAT_SPEED_MULTIPLIER = 4;

let simState = "idle"; // "idle", "running", "terminal"
let simResult = null;
let currentStrategy = null;
let mouse;
let prevMouse;
let cat;
let prevCat;

function setup() {
	noLoop();

	const canvas = createCanvas(windowWidth / 1.5, windowHeight / 1.5);
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
	playPauseBtn.position(windowWidth / 3.5, windowHeight / 1.5);
	playPauseBtn.mousePressed(handlePlayPause);
	playPauseBtn.hide();

	manualModeBtn = createButton("Strategy: Manual Mode");
	manualModeBtn.class("btn btn-primary");
	manualModeBtn.position(windowWidth / 5, windowHeight / 6);
	manualModeBtn.mousePressed(() => startStrategy(updateMouse));

	nearEdgeStratBtn = createButton("Strategy: Nearest Edge");
	nearEdgeStratBtn.class("btn btn-warning");
	nearEdgeStratBtn.position(windowWidth / 5, windowHeight / 4);
	nearEdgeStratBtn.mousePressed(() => startStrategy(strategyNearestEdge));
}

function initializeCatMouse() {
	// Initialize mouse at center
	mouse = {
		x: 0,
		y: 0,
		speed: SIM_SPEED,
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
			checkCollision();
			checkEscape();
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
	circle(0, 0, R / 50); // center marker
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

function updateMouse() {
	// Convert cursor position to simulation coordinates
	const simX = mouseX - width / 1.5;
	const simY = mouseY - height / 2;

	// Vector from mouse to cursor
	let dx = simX - mouse.x;
	let dy = simY - mouse.y;

	// Distance to cursor
	let d = sqrt(dx * dx + dy * dy);

	if (d > 1) {
		// Normalize
		dx /= d;
		dy /= d;

		// Move mouse toward cursor
		mouse.x += dx * mouse.speed;
		mouse.y += dy * mouse.speed;
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
	textSize(SIM_SIZE * 2);
	text("🐭", 0, 0);
	pop();
}

function drawCatIcon(x, y) {
	push();
	translate(x, y);
	textSize(SIM_SIZE * 3);
	text("🐱", 0, 0);
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
	const threshold = SIM_SIZE * 0.7;

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
	manualModeBtn.show();
	nearEdgeStratBtn.show();

	// Random mouse position
	const p = randomPointInCircle(R / 3);
	mouse.x = p.x;
	mouse.y = p.y;
	mouse.speed = SIM_SPEED;

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
	manualModeBtn.hide();
	nearEdgeStratBtn.hide();
	playPauseBtn.show();
	loop();
}
