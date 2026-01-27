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

function nearestBoundaryPoint(x, y) {
	const d = sqrt(x * x + y * y);
	return {
		bx: (x / d) * R,
		by: (y / d) * R,
	};
}
