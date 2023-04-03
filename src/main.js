const parse_block = function (block) {
	let axes = null;
	for (const c of block.classList) {
		if (c.startsWith("axes-")) {
			axes = c.slice(5);
			console.log(axes);
			break;
		}
	}
	const content = block.innerHTML;
	console.log(content);
	const expression = parse_expression(content);
	block.innerHTML = "";
	return [axes, expression];
};

window.onload = function () {
	const polynomial_blocks = document.querySelectorAll(".virie-algebra-block");
	for (const b of polynomial_blocks) {
		const parts = parse_block(b);
		simplex.draw(b, parts[0], parts[1]);
	}
};
