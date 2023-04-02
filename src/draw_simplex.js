class Simplex_grid {

    constructor(s) {
        this.s = s;
        this.cx = 0;
        this.cy = 0;
        this.fb = 1.0 / (2 * Math.sqrt(3));

        this.zy = this.fb - 1;
        this.zx = 0;

        this.xy = this.fb;
        this.xx = -0.5;

        this.yy = this.fb;
        this.yx = 0.5;
    }

    resolve(d, x, y, z) {
        return {
            x: (this.zx * z + this.xx * x + this.yx * y) * this.s,
            y: (this.zy * z + this.xy * x + this.yy * y) * this.s
        }
    }

    grid(x, y) {
        return {
            x: this.s * x,
            y: this.s * y
        }
    }
}

simplex = (function() {

    const draw_term = function(parent, coefficient, degrees) {
        const g = parent.group();
        const coeff_g = g.text(coefficient.toString())
            .font({
                family: 'DM Mono',
                size: 18,
                anchor: 'middle'
            })
            .fill('#333');

        if (degrees == null) return [g, coeff_g];

        const degree_g = g.group();
        let offset = coeff_g.bbox().w * 3 / 4;
        for (const [key, count] of Object.entries(degrees)) {
            const sg = degree_g.group();
            const base = sg.text(key.toString())
                .font({
                    family: 'DM Mono',
                    size: 18,
                    anchor: 'middle'
                })
                .fill('#333')
                .center(0, 0);
            const exp = sg.text(count.toString())
                .font({
                    family: 'DM Mono',
                    size: 9,
                    anchor: 'middle'
                })
                .fill((count > 1 ? '#333' : '#0000'))
                .dmove(base.bbox().w / 2, -4);
            sg.dmove(offset, -6);
            offset += (base.bbox().w / 2 + exp.bbox().w);
        }

        return [g, coeff_g, degree_g];
    }

    const fade_in = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration);
        runner.attr({ opacity: 1.0 });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, 'absolute');
    }

    const fade_out = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration);
        runner.attr({ opacity: 0.0 });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, 'absolute');
    }

    const move = function(svg_object, timeline, duration, start, x, y) {
        const runner = new SVG.Runner(duration);
        runner.center(x, y);
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, 'absolute');
    }

    const transform_to_simplex = function(expression, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline()
        const cx = width / 2;
        const cy = height / 2;
        const node_padding = Math.min(width, height) * 0.2;
        const grid = new Simplex_grid(node_padding);
        
        const terms = expression.value.serialize();

        let i = 0;
        for (const term of terms) {
            const p_s = grid.grid(((i++) - Math.floor(terms.length / 2)) * 1.5, 0);
            const term_graphics = draw_term(parent, term[0], term[1]);
            term_graphics[0].center(cx + p_s.x, cy + p_s.y);

            const p_t = grid.resolve.apply(grid, term.slice(2));
            move(term_graphics[0], timeline, 0.4, 0, cx + p_t.x, cy + p_t.y)
            fade_out(term_graphics[2], timeline, 0.5, 0.5);

            const runner_3 = new SVG.Runner(0.3);
            runner_3
                .center(cx + p_t.x, cy + p_t.y)
                .attr({ fill: '#f00', opacity: (Math.abs(term[0]) > 1e-4 ? 1.0 : 0.0) });
            runner_3.element(term_graphics[1]);
            timeline.schedule(runner_3.persist(true), 0.7, 'absolute');
        }

        return timeline;
    }

    const multiply = function(exp_0, exp_1, exp_res, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline()
        const cx = width / 2;
        const cy = height / 2;
        const node_padding = Math.min(width, height) * 0.2;
        const grid = new Simplex_grid(node_padding);
        const grid2 = new Simplex_grid(node_padding * 1.5);

        for (const term of exp_res.serialize()) {
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, cy + p.y).attr({ opacity: 0.0 });
            term_graphics[1].attr({ fill: '#f00' });

            fade_in(term_graphics[0], timeline, 0.1, 0.9);
        }

        const serialized_exp_0 = exp_0.serialize();
        const base_term_pos = [];
        for (const term of serialized_exp_0) {
            const o = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(width / 3 + o.x, cy + o.y);

            const p = grid2.resolve.apply(grid2, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0, cx + p.x, cy + p.y)
            fade_out(term_graphics[0], timeline, 0.1, 0.7);

            base_term_pos.push(p);
        }

        const serialized_exp_1 = exp_1.serialize();
        for (let i = 0; i < serialized_exp_1.length; ++i) {
            const term = serialized_exp_1[i];
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(width * 2 / 3 + p.x, cy + p.y);

            const duration_offset = (0.8 - 0.1) / (base_term_pos.length + 1);
            for (let j = 0; j < base_term_pos.length; ++j) {
                move(term_graphics[0], timeline, 0.2, 0.1 + duration_offset * j, cx + base_term_pos[j].x + p.x, cy + base_term_pos[j].y + p.y);
            }

            for (let j = 0; j < serialized_exp_0.length; ++j) {
                const base_term_graphics = draw_term(parent, term[0] * serialized_exp_0[j][0], null);
                base_term_graphics[0].center(cx + base_term_pos[j].x + p.x, cy + base_term_pos[j].y + p.y);
                base_term_graphics[1].attr({ fill: '#00f', opacity: 0.0 });

                fade_in(base_term_graphics[1], timeline, 0.2, 0.1 + duration_offset * (j + 1));
                const term_combine = (exp_1.get(i).mul(exp_0.get(j)));
                const p_combine = grid.resolve.apply(grid, term_combine.serialize(exp_res.max_degree).slice(2));
                move(base_term_graphics[0], timeline, 0.1, 0.8, cx + p_combine.x, cy + p_combine.y);
                fade_out(base_term_graphics[0], timeline, 0.1, 0.9);
            }

            fade_out(term_graphics[0], timeline, 0.1, 0.7);
        }

        return timeline;
    }

    const divide = function(exp_0, exp_1, exp_res, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline()
        const cx = width / 2;
        const cy = height * 2 / 3;
        const node_padding = Math.min(width, height) * 0.2;
        const grid = new Simplex_grid(node_padding);
        const grid2 = new Simplex_grid(node_padding * 1.75);

        const res_term_pos = [];
        const serialized_exp_res = exp_res.serialize();
        const duration_offset = (0.8 - 0.1) / (serialized_exp_res.length + 1);
        for (let j = 0; j < serialized_exp_res.length; ++j) {
            const term = serialized_exp_res[j];
            const p = grid2.resolve.apply(grid2, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, cy + p.y).attr({ opacity: 0.0 });
            term_graphics[1].attr({ fill: '#f00' });

            fade_in(term_graphics[0], timeline, 0.1, 0.1 + duration_offset * (j + 1));
            res_term_pos.push(p);
        }

        const serialized_exp_0 = exp_0.serialize();
        for (const term of serialized_exp_0) {
            const o = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(width / 3 + o.x, cy + o.y);

            const p = grid2.resolve.apply(grid2, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0, cx + p.x, cy + p.y)
            fade_out(term_graphics[0], timeline, 0.1, 0.7);
        }

        const serialized_exp_1 = exp_1.serialize();
        for (const term of serialized_exp_1) {
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(width * 2 / 3 + p.x, cy + p.y);

            for (let j = 0; j < res_term_pos.length; ++j) {
                move(term_graphics[0], timeline, 0.2, 0.1 + duration_offset * j, cx + res_term_pos[j].x + p.x, cy + res_term_pos[j].y + p.y);
            }

            fade_out(term_graphics[0], timeline, 0.1, 0.7);
        }

        for (let i = 0; i < serialized_exp_res.length; ++i) {
            const term = serialized_exp_res[i];

            for (let j = 0; j < serialized_exp_1.length; ++j) {
                const div_term = serialized_exp_1[j];
                const art_term_graphics = draw_term(parent, term[0] * div_term[0], null);
                const p = grid.resolve.apply(grid, div_term.slice(2));
                art_term_graphics[0].center(cx + res_term_pos[i].x + p.x, cy + res_term_pos[i].y + p.y);
                art_term_graphics[1].attr({ fill: '#00f', opacity: 0.0 });

                fade_in(art_term_graphics[1], timeline, 0.2, 0.1 + duration_offset * (i + 1));
                // const term_combine = (exp_1.get(i).mul(exp_0.get(j)));
                // const p_combine = grid.resolve.apply(grid, term_combine.serialize(exp_res.max_degree).slice(2));
                // move(art_term_graphics[0], timeline, 0.1, 0.8, cx + p_combine.x, cy + p_combine.y);
                // fade_out(art_term_graphics[0], timeline, 0.1, 0.9);
            }
        }


        return timeline;
    }

    const operation = function(expression, parent, width, height) {

        const left = expression.left;
        const right = expression.right;
        let exp_0, exp_1, exp_res;
        if (right.type === "node") {
            exp_0 = left.left.value;
            exp_1 = left.right.value;
            type = left.type;
            exp_res = right.value;
        } else {
            exp_0 = right.left.value;
            exp_1 = right.right.value;
            type = right.type;
            exp_res = left.value;
        }

        if(type === ".") {
            return multiply(exp_0, exp_1, exp_res, parent, width, height);
        }else{
            return divide(exp_0, exp_1, exp_res, parent, width, height);
        }
    }

    const draw = function(parent, expression) {
        // Set the dimensions of the plot
        const container_rect = parent.getBoundingClientRect();
        const computed_style = getComputedStyle(parent);
        const width = container_rect.width - parseFloat(computed_style.paddingLeft) - parseFloat(computed_style.paddingRight);
        const height = container_rect.height - parseFloat(computed_style.paddingTop) - parseFloat(computed_style.paddingBottom);
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };

        const svg = SVG().addTo(parent).size('100%', '100%');
        const polynomial_group = svg.group()

        let timeline = null;

        if (expression.type === "node") {
            timeline = transform_to_simplex(expression, polynomial_group, width, height);
        } else if (expression.type === "=") {
            timeline = operation(expression, polynomial_group, width, height);
        }

        parent.addEventListener('mousemove', (e) => {
            const time = (e.clientX - container_rect.x) / container_rect.width;
            timeline.time(Math.max(0, time));
        });

    }

    return {
        draw: draw
    }

})();