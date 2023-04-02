const is_digit = function (c) {
	return c >= "0" && c <= "9";
};

const degree_mul = function (deg1, deg2) {
	const out = {};
	for (const [key, value] of Object.entries(deg1)) {
		out[key] = value;
	}

	for (const [key, value] of Object.entries(deg2)) {
		out[key] = out[key] || 0;
		out[key] += value;
	}
	return out;
};

class Term {
	constructor(sign = "+") {
		this.sign = sign;
		this.coefficient = this.sign === "+" ? 1.0 : -1.0;
		this.degrees = {};
		this.digits = "";
		this.last_deg = null;
		this.compiled = false;
	}

	parse(c) {
		if (this.compiled) return;
		if (is_digit(c)) {
			this.digits += c;
		} else if (c === "^") {
			this.degrees[this.last_deg] -= 1;
		} else {
			if (this.digits !== "") {
				if (this.last_deg == null) {
					this.coefficient = parseFloat(this.digits) * (this.sign === "+" ? 1.0 : -1.0);
				} else {
					this.degrees[this.last_deg] += parseFloat(this.digits);
				}
			}
			this.digits = "";
			this.degrees[c] = this.degrees[c] || 1;
			this.last_deg = c;
		}
	}

	hash_degree() {
		let out = "";
		Object.entries(this.degrees)
			.sort()
			.forEach(([key, value]) => {
				out += key + value.toString();
			});
		return out;
	}

	mul(term) {
		const out_term = new Term();
		out_term.coefficient = this.coefficient * term.coefficient;
		out_term.degrees = degree_mul(this.degrees, term.degrees);
		return out_term;
	}

	inverse() {
		const out_term = new Term();
		out_term.coefficient = -this.coefficient;
		out_term.degrees = this.degrees;
		out_term.compiled = this.compiled;
		return out_term;
	}

	compile() {
		if (this.compiled) return;
		if (this.last_deg == null) {
			this.coefficient = parseFloat(this.digits) * (this.sign === "+" ? 1.0 : -1.0);
		} else if (this.digits !== "") {
			this.degrees[this.last_deg] += parseFloat(this.digits);
		}
		this.compiled = true;
		return this;
	}

	serialize(max_degree) {
		let total_degs = 0;
		let degree_str = "";
		for (const [key, value] of Object.entries(this.degrees)) {
			total_degs += value;
		}
		return [this.coefficient, this.degrees, max_degree, this.degrees["x"] || 0, this.degrees["y"] || 0, this.degrees["z"] || max_degree - total_degs];
	}
}

class Polynomial {
	constructor() {
		this.terms = [];
	}

	parse(input) {
		let term = null;
		for (let i = 0; i < input.length; ++i) {
			const c = input[i];
			if (c === " ") continue;
			if (c === "+" || c === "-") {
				if (term != null) this.terms.push(term.compile());
				term = new Term(c);
			} else {
				if (term == null) term = new Term();
				term.parse(c);
			}
		}
		if (term != null) this.terms.push(term.compile());
		return this;
	}

	get(i) {
		return this.terms[i];
	}

	subtract(term) {
		const out = new Polynomial();
		let found = false;
		for (const t of this.terms) {
			if (t.hash_degree() === term.hash_degree()) {
				const new_term = new Term();
				new_term.coefficient = t.coefficient - term.coefficient;
				new_term.degrees = t.degrees;
				new_term.compiled = true;
				out.terms.push(new_term);
				found = true;
			} else {
				out.terms.push(t);
			}
		}
		if (!found) {
			out.terms.push(term.inverse());
		}
		return out;
	}

	serialize() {
		const out = [];
		this.max_degree = 0;
		for (const term of this.terms) {
			let deg = 0;
			for (const [key, value] of Object.entries(term.degrees)) {
				deg += value;
			}
			if (this.max_degree < deg) {
				this.max_degree = deg;
			}
		}

		for (const term of this.terms) {
			out.push(term.serialize(this.max_degree));
		}

		return out;
	}
}

class Expression {
	constructor(tokens) {
		let pivot = null;
		let pivot_i = -1;
		for (let i = 0; i < tokens.length; ++i) {
			const word = tokens[i];
			if (typeof word === "string" || word instanceof String) {
				const trimmed = word.trim();
				if (trimmed === "=") {
					pivot = trimmed;
					pivot_i = i;
					break;
				} else {
					pivot = trimmed;
					pivot_i = i;
				}
			}
		}

		if (pivot_i === -1) {
			this.type = "node";
			this.value = tokens[0];
		} else {
			this.type = pivot;
			this.left = new Expression(tokens.slice(0, pivot_i));
			this.right = new Expression(tokens.slice(pivot_i + 1));
		}
	}
}

const parse_expression = function (input) {
	const tokens = [];
	const pre_tokens = input.trim().split("{");
	for (const t of pre_tokens) {
		const post_tokens = t.split("}");
		if (post_tokens.length == 2) {
			tokens.push(new Polynomial().parse(post_tokens[0]));

			if (post_tokens[1].length > 0) tokens.push(post_tokens[1]);
		} else {
			if (t.length > 0) tokens.push(t);
		}
	}
	return new Expression(tokens);
};
