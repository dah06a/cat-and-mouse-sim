function strategyNearestEdge() {
	const { bx, by } = nearestBoundaryPoint(mouse.x, mouse.y);

	let dx = bx - mouse.x;
	let dy = by - mouse.y;

	const dist = sqrt(dx * dx + dy * dy);
	if (dist > 1) {
		dx /= dist;
		dy /= dist;
		mouse.x += dx * mouse.speed;
		mouse.y += dy * mouse.speed;
	}
}
