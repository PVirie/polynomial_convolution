const is_digit = function(c) {
    return (c >= '0' && c <= '9');
}

class Term {
    constructor(sign = "+") {
        this.sign = sign;
        this.coefficient = 1;
        this.degrees = {};
        this.digits = "";
        this.last_deg = null;
    }

    add(c) {
        if (is_digit(c)) {
            this.digits += c;
        } else if (c === "^") {
            this.degrees[this.last_deg] -= 1;
        } else {
            if (this.digits !== "") {
                if (this.last_deg == null) {
                    this.coefficient = parseFloat(this.digits)*(this.sign === "+"? 1.0: -1.0);
                } else {
                    this.degrees[this.last_deg] += parseFloat(this.digits);
                }
            }
            this.digits = "";
            this.degrees[c] = this.degrees[c] || 1;
            this.last_deg = c;
        }
    }

    compile() {
        if (this.last_deg == null) {
            this.coefficient = parseFloat(this.digits)*(this.sign === "+"? 1.0: -1.0);
        } else if (this.digits !== "") {
            this.degrees[this.last_deg] += parseFloat(this.digits);
        }

        return this;
    }
}

class Polynomial {

    constructor(input) {
        this.terms = [];
        let term = null;
        for (let i = 0; i < input.length; ++i) {
            const c = input[i];
            if (c === " ") continue;
            if (c === "+" || c === "-") {
                if (term != null) this.terms.push(term.compile());
                term = new Term(c);
            } else {
                if (term == null) term = new Term();
                term.add(c);
            }
        }
        if (term != null) this.terms.push(term.compile());
    }

    serialize() {
        const out = [];
        this.max_degree = 0;
        for (const term of this.terms) {
        	let deg = 0;
            for (const [key, value] of Object.entries(term.degrees)) {
                deg += value;
            }
            if(this.max_degree < deg) {
            	this.max_degree = deg;
            }
        }

        for (const term of this.terms) {
        	let total_degs = 0;
            let degree_str = "";
            for (const [key, value] of Object.entries(term.degrees)) {
            	total_degs += value;
            }
            out.push([
                term.coefficient,
                term.degrees,
                this.max_degree, 
                term.degrees["x"] || 0, 
                term.degrees["y"] || 0, 
                term.degrees["z"] || this.max_degree - total_degs
            ]);
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
            if (typeof word === 'string' || word instanceof String) {
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

const parse_expression = function(input) {
    const tokens = [];
    const pre_tokens = input.trim().split("{");
    for (const t of pre_tokens) {
        const post_tokens = t.split("}");
        if (post_tokens.length == 2) {
            tokens.push(new Polynomial(post_tokens[0]));

            if (post_tokens[1].length > 0) tokens.push(post_tokens[1]);
        } else {
            if (t.length > 0) tokens.push(t);
        }
    }
    return new Expression(tokens);
}