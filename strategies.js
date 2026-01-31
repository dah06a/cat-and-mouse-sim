function manualUpdateMouse() {
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

function strategyNearestEdge() {
	const { bx, by } = nearestBoundaryPoint(mouse.x, mouse.y);

	let dx = bx - mouse.x;
	let dy = by - mouse.y;

	const dist = sqrt(dx * dx + dy * dy);
	dx /= dist;
	dy /= dist;
	mouse.x += dx * mouse.speed;
	mouse.y += dy * mouse.speed;
}

function strategyDashOpposite() {
	// If for some reason dashDir isn't set, do nothing
	if (!mouse.dashDir) {
		const oppositeAngle = cat.angle + Math.PI;
		mouse.dashDir = {
			dx: Math.cos(oppositeAngle),
			dy: Math.sin(oppositeAngle),
		};
	}

	const { dx, dy } = mouse.dashDir;

	// Move mouse in the fixed direction
	mouse.x += dx * mouse.speed;
	mouse.y += dy * mouse.speed;
}

function strategySpiralEscape() {
	// --- PHASE 0: Move to center -----------------------------------------
	if (mouse.spiralPhase === 0) {
		const dist = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);

		if (dist < SPIRAL_CENTER_THRESHOLD) {
			// Arrived at center → move to phase 1 (wait)
			mouse.spiralPhase = 1;
			mouse.spiralCatStillFrames = 0;
			return;
		}

		// Move toward center
		const dx = -mouse.x / dist;
		const dy = -mouse.y / dist;
		mouse.x += dx * mouse.speed;
		mouse.y += dy * mouse.speed;
		return;
	}

	// --- PHASE 1: Wait at center until cat settles -----------------------
	if (mouse.spiralPhase === 1) {
		// Check if cat is barely rotating
		if (Math.abs(catAngularVelocity) < CAT_SETTLE_THRESHOLD) {
			mouse.spiralCatStillFrames++;
		} else {
			mouse.spiralCatStillFrames = 0; // reset if cat moves again
		}

		// Once the cat has been still for enough frames, begin dash
		if (mouse.spiralCatStillFrames >= CAT_SETTLE_FRAMES) {
			// Compute cat's true position on boundary
			const cx = R * Math.cos(cat.angle);
			const cy = R * Math.sin(cat.angle);

			// Opposite direction vector
			let dx = -cx;
			let dy = -cy;

			const mag = Math.sqrt(dx * dx + dy * dy);
			dx /= mag;
			dy /= mag;

			// Store dash direction
			mouse.spiralDashDir = { dx, dy };

			mouse.spiralFrames = 0;
			mouse.spiralPhase = 2; // dash phase
		}

		return;
	}

	// --- PHASE 2: Dash straight opposite the cat -------------------------
	if (mouse.spiralPhase === 2) {
		// Safety check
		if (!mouse.spiralDashDir) return;

		mouse.x += mouse.spiralDashDir.dx * mouse.speed;
		mouse.y += mouse.spiralDashDir.dy * mouse.speed;

		mouse.spiralFrames++;

		if (mouse.spiralFrames >= SPIRAL_DASH_FRAMES) {
			mouse.spiralPhase = 3; // move to spiral phase
		}

		return;
	}

	// --- PHASE 3: Spiral outward -----------------------------------------
	if (mouse.spiralPhase === 3) {
		// Mouse polar angle
		const mouseAngle = Math.atan2(mouse.y, mouse.x);

		// Cat polar angle
		const catAngle = cat.angle;

		// Signed angular difference (mouse relative to cat)
		let diff = Math.atan2(
			Math.sin(mouseAngle - catAngle),
			Math.cos(mouseAngle - catAngle),
		);

		// Choose tangential direction to INCREASE separation
		const tangentialSign = diff >= 0 ? 1 : -1;

		// Radial unit vector
		const r = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
		const rx = mouse.x / r;
		const ry = mouse.y / r;

		// Tangential unit vector (perpendicular to radial)
		let tx = -ry;
		let ty = rx;

		// Flip tangential direction based on sign
		tx *= tangentialSign;
		ty *= tangentialSign;

		// Combine radial + tangential components
		const vx = SPIRAL_RADIAL_WEIGHT * rx + SPIRAL_TANGENTIAL_WEIGHT * tx;
		const vy = SPIRAL_RADIAL_WEIGHT * ry + SPIRAL_TANGENTIAL_WEIGHT * ty;

		// Normalize
		const mag = Math.sqrt(vx * vx + vy * vy);
		const nx = vx / mag;
		const ny = vy / mag;

		// Move mouse
		mouse.x += nx * mouse.speed;
		mouse.y += ny * mouse.speed;

		return;
	}
}

function strategyOptimalCircling() {
	// Compute mouse radius and angle
	const r = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
	const mouseAngle = Math.atan2(mouse.y, mouse.x);

	// Cat angle already tracked as cat.angle
	const catAngle = cat.angle;

	// Signed angular difference (mouse relative to cat)
	let diff = Math.atan2(
		Math.sin(mouseAngle - catAngle),
		Math.cos(mouseAngle - catAngle),
	);

	// Radial unit vector
	const rx = mouse.x / r;
	const ry = mouse.y / r;

	// Tangential unit vector (perpendicular to radial)
	let tx = -ry;
	let ty = rx;

	// --- PHASE 0: Move to optimal circling radius -------------------------
	if (mouse.optimalPhase === 0) {
		const r = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);

		if (Math.abs(r - OPTIMAL_CIRCLE_RADIUS) < 1) {
			mouse.optimalPhase = 1;
			return;
		}

		const rx = mouse.x / r;
		const ry = mouse.y / r;

		const direction = OPTIMAL_CIRCLE_RADIUS > r ? 1 : -1;

		mouse.x += direction * rx * mouse.speed;
		mouse.y += direction * ry * mouse.speed;
		return;
	}

	// --- PHASE 1: Circle until cat is opposite ---------------------------
	if (mouse.optimalPhase === 1) {
		// Recompute r, radial and tangential each frame
		let r = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
		let rx = mouse.x / r;
		let ry = mouse.y / r;
		let tx = -ry;
		let ty = rx;

		const mouseAngle = Math.atan2(mouse.y, mouse.x);
		const catAngle = cat.angle;

		let diff = Math.atan2(
			Math.sin(mouseAngle - catAngle),
			Math.cos(mouseAngle - catAngle),
		);

		const tangentialSign = diff >= 0 ? 1 : -1;

		// Move tangentially
		mouse.x += tangentialSign * tx * mouse.speed;
		mouse.y += tangentialSign * ty * mouse.speed;

		// ⭐ Snap back to the *middle* of the band, not the outer boundary
		r = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
		const scale = OPTIMAL_CIRCLE_RADIUS / r;
		mouse.x *= scale;
		mouse.y *= scale;

		// Check if cat is opposite
		if (Math.abs(Math.abs(diff) - Math.PI) < OPPOSITE_ANGLE_TOLERANCE) {
			mouse.optimalPhase = 2;
		}

		return;
	}

	// --- PHASE 2: Move outward to dash boundary --------------------------
	if (mouse.optimalPhase === 2) {
		if (r >= DASH_BOUNDARY) {
			mouse.optimalPhase = 3;
			return;
		}

		// Move outward
		mouse.x += rx * mouse.speed;
		mouse.y += ry * mouse.speed;
		return;
	}

	// --- PHASE 3: Dash straight to the edge ------------------------------
	if (mouse.optimalPhase === 3) {
		// Move outward
		mouse.x += rx * mouse.speed;
		mouse.y += ry * mouse.speed;

		return;
	}
}
