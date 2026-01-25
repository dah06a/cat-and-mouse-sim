const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const R = windowWidth / 8; // pool radius
const ANGLE_ALLOWANCE = 0.02; // about 1 degree
const SIM_SPEED = 0.5;
const SIM_SIZE = 10;

let mouse;
let cat;

function setup() {
	const canvas = createCanvas(windowWidth / 1.5, windowHeight / 1.5);
	canvas.parent("canvas-container");
	noLoop();

	// Setup buttons
	startStopButton = createButton("Start");
	startStopButton.class("btn btn-primary");
	startStopButton.position(windowWidth / 5, windowHeight / 6);
	startStopButton.mousePressed(handleStartStop);

	// Initialize mouse at center
	mouse = {
		x: 0,
		y: 0,
		speed: SIM_SPEED,
	};

	// Initialize cat on the boundary
	cat = {
		angle: PI,
		speed: SIM_SPEED * 4,
	};

	angleMode(RADIANS);
}

function draw() {
	background(240);

	// Move origin to center
	translate(width / 1.5, height / 2);

	drawPool();
	updateMouse();
	updateCat();
	drawMouse();
	drawCat();

	// Check for collision
	if (checkCollision()) {
		noLoop();
		startStopButton.attribute("disabled", "");
		startStopButton.html("Caught!");
		resetButton = createButton("Reset");
		resetButton.class("btn btn-secondary");
		resetButton.position(windowWidth / 5, windowHeight / 5);
	}
}

function handleStartStop() {
	if (isLooping()) {
		noLoop();
		startStopButton.html("Start");
		startStopButton.class("btn btn-primary");
	} else {
		loop();
		startStopButton.html("Stop");
		startStopButton.class("btn btn-danger");
	}
}

function drawPool() {
	fill("lightblue");
	stroke(0);
	strokeWeight(2);
	circle(0, 0, R * 2);
}

function updateMouse() {
	// Placeholder: move right
	mouse.x += mouse.speed * 0.5;
}

function updateCat() {
	// Mouse angle relative to center
	let mouseAngle = atan2(mouse.y, mouse.x);

	// Smallest signed angular difference
	let diff = mouseAngle - cat.angle;
	diff = atan2(sin(diff), cos(diff)); // normalize to [-PI, PI]

	// Dead zone to prevent jitter
	if (abs(diff) < 0.02) {
		return; // don't move the cat
	}

	// Move cat toward mouse angle
	let direction = diff > 0 ? 1 : -1;
	cat.angle += direction * 0.02 * cat.speed;

	// Keep angle normalized
	cat.angle = atan2(sin(cat.angle), cos(cat.angle));
}

function drawMouse() {
	fill("blue");
	noStroke();
	circle(mouse.x, mouse.y, SIM_SIZE);
}

function drawCat() {
	const cx = R * cos(cat.angle);
	const cy = R * sin(cat.angle);

	fill("red");
	noStroke();
	circle(cx, cy, SIM_SIZE * 2);
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
	const threshold = SIM_SIZE * 0.75;

	return dist < threshold;
}
