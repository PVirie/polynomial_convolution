

const parse_block = function(block) {
	const content = block.innerHTML;
	console.log(content);
	const expression = parse_expression(content);
	block.innerHTML = "";
	return expression;
}


window.onload = function() {
	const polynomial_blocks = document.querySelectorAll(".virie-algebra-block");
	for(const b of polynomial_blocks) {
		simplex.draw(b, parse_block(b));
	}
};