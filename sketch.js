const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const R = windowWidth / 10; // pool radius
const ANGLE_ALLOWANCE = 0.02; // about 1 degree
const SIM_SPEED = 0.5;
const SIM_SIZE = 10;
const CAT_SPEED_MULTIPLIER = 4;

let simState = "idle"; // "idle", "running", "caught", "escaped"
let mouse;
let prevMouse;
let cat;
let prevCat;

function setup() {
	noLoop();
	const canvas = createCanvas(windowWidth / 1.5, windowHeight / 1.5);
	canvas.parent("canvas-container");
	angleMode(RADIANS);

	// Setup buttons
	startStopButton = createButton("Start");
	startStopButton.class("btn btn-primary");
	startStopButton.position(windowWidth / 5, windowHeight / 6);
	startStopButton.mousePressed(handleStartStop);

	resetButton = createButton("Reset");
	resetButton.class("btn btn-secondary");
	resetButton.position(windowWidth / 3.5, windowHeight / 6);
	resetButton.mousePressed(resetSimulation);

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

	resetSimulation();
}

function draw() {
	background(240);
	translate(width / 1.5, height / 2); // move origin to center of pool
	drawPool();

	if (simState === "idle") {
		drawMouse();
		drawMouseIcon(mouse.x + SIM_SIZE * 0.8, mouse.y - SIM_SIZE * 0.8);
		drawCat();
		drawCatIcon(cat.x + SIM_SIZE * 0.8, cat.y - SIM_SIZE * 0.8);
		return;
	}

	if (simState === "running") {
		updateMouse();
		updateCat();
		drawMouse();
		drawMouseIcon(mouse.x + SIM_SIZE * 0.8, mouse.y - SIM_SIZE * 0.8);
		drawCat();
		drawCatIcon(cat.x + SIM_SIZE * 0.8, cat.y - SIM_SIZE * 0.8);

		// Check for collision
		if (checkCollision()) {
			noLoop();
			startStopButton.attribute("disabled", "true");
			startStopButton.html("Caught!");
		}
		// Check for escape
		if (checkEscape()) {
			noLoop();
			startStopButton.attribute("disabled", "true");
			startStopButton.class("btn btn-success");
			startStopButton.html("Escaped!");
		}

		// Compute and log speeds for debugging
		// computeSpeeds();
	}
}

function handleStartStop() {
	if (simState === "idle") {
		simState = "running";
		loop();
		startStopButton.html("Stop");
		startStopButton.class("btn btn-danger");
		return;
	}

	if (simState === "running") {
		simState = "idle";
		noLoop();
		startStopButton.html("Start");
		startStopButton.class("btn btn-primary");
		return;
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

	return dist < threshold;
}

function checkEscape() {
	const distFromCenter = sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
	return distFromCenter >= R;
}

function resetSimulation() {
	simState = "idle";

	// Random mouse position
	const p = randomPointInCircle(R);
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

	// Reset UI
	startStopButton.removeAttribute("disabled");
	startStopButton.html("Start");
	startStopButton.class("btn btn-primary");

	// Draw exactly one clean frame
	redraw();
	noLoop();
}

function randomPointInCircle(radius) {
	const angle = random(TWO_PI);
	const r = radius * sqrt(random()); // uniform distribution
	return {
		x: r * cos(angle),
		y: r * sin(angle),
	};
}

function randomAngle() {
	return random(TWO_PI);
}

function computeSpeeds() {
	const dt = 1 / frameRate(); // seconds per frame

	// Mouse distance traveled
	const mdx = mouse.x - prevMouse.x;
	const mdy = mouse.y - prevMouse.y;
	const mouseDist = sqrt(mdx * mdx + mdy * mdy);
	const mouseSpeedActual = mouseDist / dt;

	// Cat distance traveled
	const cdx = cat.x - prevCat.x;
	const cdy = cat.y - prevCat.y;
	const catDist = sqrt(cdx * cdx + cdy * cdy);
	const catSpeedActual = catDist / dt;

	// Debug log
	console.log(
		`Mouse speed: ${mouseSpeedActual.toFixed(2)} px/s | Cat speed: ${catSpeedActual.toFixed(2)} px/s`,
	);

	// Update previous positions
	prevMouse.x = mouse.x;
	prevMouse.y = mouse.y;
	prevCat.x = cat.x;
	prevCat.y = cat.y;
}
