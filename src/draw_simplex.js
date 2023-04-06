class Simplex_grid {
    constructor(axes, s) {
        this.s = s;

        if (axes.length > 2) this.fb = 1.0 / (2 * Math.sqrt(3));
        else this.fb = 0;

        // axes is string: xyz, xy1, yxz, etc.
        this.axes = {
            1: { x: 0, y: 0 },
            x: { x: 0, y: 0 },
            y: { x: 0, y: 0 },
            z: { x: 0, y: 0 },
        };

        this.axes[axes[0]] = {
            x: -0.5,
            y: this.fb,
        };

        this.axes[axes[1]] = {
            x: 0.5,
            y: this.fb,
        };

        if (axes.length > 2)
            this.axes[axes[2]] = {
                x: 0,
                y: this.fb - 1,
            };
    }

    resolve(max_degree, degrees) {
        let total_deg = 0;
        for (const [key, value] of Object.entries(degrees)) {
            total_deg += value;
        }
        let x = (max_degree - total_deg) * this.axes["1"].x;
        let y = (max_degree - total_deg) * this.axes["1"].y;
        for (const c in degrees) {
            x += degrees[c] * this.axes[c].x;
            y += degrees[c] * this.axes[c].y;
        }
        return { x: x * this.s, y: y * this.s };
    }

    grid(x, y) {
        return {
            x: this.s * x,
            y: this.s * y,
        };
    }
}

simplex = (function() {
    const draw_term = function(parent, coefficient, degrees) {
        const g = parent.group();
        const coeff_g = g
            .text(coefficient.toString())
            .font({
                family: "DM Mono",
                size: 18,
                anchor: "middle",
            })
            .fill("#333");

        if (degrees == null) return [g, coeff_g];

        const degree_g = g.group();
        let offset = (coeff_g.bbox().w * 3) / 4;
        for (const [key, count] of Object.entries(degrees)) {
            const sg = degree_g.group();
            const base = sg
                .text(key.toString())
                .font({
                    family: "DM Mono",
                    size: 18,
                    anchor: "middle",
                })
                .fill("#333")
                .center(0, 0);
            const exp = sg
                .text(count.toString())
                .font({
                    family: "DM Mono",
                    size: 9,
                    anchor: "middle",
                })
                .fill(count > 1 ? "#333" : "#0000")
                .dmove(base.bbox().w / 2, -4);
            sg.dmove(offset, -6);
            offset += base.bbox().w / 2 + exp.bbox().w;
        }

        return [g, coeff_g, degree_g];
    };

    const fade_in = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration);
        runner.attr({ opacity: 1.0 });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, "absolute");
    };

    const fade_out = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration);
        runner.attr({ opacity: 0.0 });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, "absolute");
    };

    const fade_half = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration);
        runner.attr({ opacity: 0.3 });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, "absolute");
    };

    const move = function(svg_object, timeline, duration, start, x, y, ease = "<>") {
        const runner = new SVG.Runner(duration);
        runner.ease(ease);
        runner.center(x, y);
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, "absolute");
    };

    const settle = function(svg_object, timeline, duration, start) {
        const runner = new SVG.Runner(duration / 4);
        runner.attr({ fill: "#fff" });
        runner.element(svg_object);
        timeline.schedule(runner.persist(true), start, "absolute");

        const runner2 = new SVG.Runner((duration * 3) / 4);
        runner2.attr({ fill: "#333" });
        runner2.element(svg_object);
        timeline.schedule(runner2.persist(true), start + duration / 4, "absolute");
    };

    const transform_to_simplex = function(axes, expression, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline();
        const cx = width / 2;
        const cy = height / 2;

        const terms = expression.value.serialize();

        const node_padding = Math.min((width * 2 / 3) / (expression.value.max_degree), 50);
        const grid = new Simplex_grid(axes, node_padding);

        let i = 0;
        for (const term of terms) {
            const p_s = grid.grid((i++ - (terms.length - 1) / 2) * 1.5, 0);
            const term_graphics = draw_term(parent, term[0], term[1]);
            term_graphics[0].center(cx + p_s.x, cy + p_s.y);

            const p_t = grid.resolve.apply(grid, term.slice(2));
            move(term_graphics[0], timeline, 0.5, 0, cx + p_t.x, cy + p_t.y);
            fade_out(term_graphics[2], timeline, 0.1, 0.7);

            const runner_3 = new SVG.Runner(0.1);
            runner_3.center(cx + p_t.x, cy + p_t.y).attr({ opacity: Math.abs(term[0]) > 1e-4 ? 1.0 : 0.0 });
            runner_3.element(term_graphics[1]);
            timeline.schedule(runner_3.persist(true), 0.7, "absolute");

            settle(term_graphics[1], timeline, 0.2, 0.8);
        }

        return timeline;
    };

    const multiply = function(axes, exp_0, exp_1, exp_res, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline();
        const dim = axes.length;
        const cx = width / 2;
        const cy = dim == 2 ? height / 2 : (height * 2) / 3;

        const serialized_exp_res = exp_res.serialize();
        const serialized_exp_0 = exp_0.serialize();
        const serialized_exp_1 = exp_1.serialize();

        const node_padding = Math.min((width * 2 / 3) / (exp_res.max_degree), 50);

        const grid = new Simplex_grid(axes, node_padding);
        const grid2 = new Simplex_grid(axes, node_padding * 1.5);

        for (const term of serialized_exp_res) {
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, cy + p.y).attr({ opacity: 0.0 });
            term_graphics[1].attr({ fill: "#333" });

            fade_in(term_graphics[0], timeline, 0.1, 0.7);
            settle(term_graphics[1], timeline, 0.2, 0.8);
        }

        const duration_offset = (0.7 - 0.1) / (serialized_exp_0.length + 1);
        const base_term_pos = [];
        for (const term of serialized_exp_0) {
            const o = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            if (dim == 2) term_graphics[0].center(cx + o.x, height / 3 + o.y);
            else term_graphics[0].center(width / 3 + o.x, cy + o.y);

            const p = grid2.resolve.apply(grid2, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0, cx + p.x, cy + p.y);
            fade_out(term_graphics[0], timeline, 0.1, 0.1 + duration_offset * serialized_exp_0.length);

            base_term_pos.push(p);
        }

        let y_gap = 0;
        let artifact_grid = grid;
        if (dim === 2) {
            y_gap = 20;
            artifact_grid = grid2;
        }
        for (let i = 0; i < serialized_exp_1.length; ++i) {
            const term = serialized_exp_1[i];
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            if (dim == 2) term_graphics[0].center(cx + p.x, height * 2 / 3 + p.y);
            else term_graphics[0].center(width * 2 / 3 + p.x, cy + p.y);
            term_graphics[1].attr({ fill: "#070" });

            fade_half(term_graphics[1], timeline, duration_offset, 0.1);

            const p2 = artifact_grid.resolve.apply(artifact_grid, term.slice(2));
            const y_offset = (i + 1) * y_gap;
            for (let j = 0; j < base_term_pos.length; ++j) {
                move(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * j, cx + base_term_pos[j].x + p2.x, y_offset + cy + base_term_pos[j].y + p2.y);
            }

            for (let j = 0; j < serialized_exp_0.length; ++j) {
                const base_term_graphics = draw_term(parent, term[0] * serialized_exp_0[j][0], null);
                base_term_graphics[0].center(cx + base_term_pos[j].x + p2.x, y_offset + cy + base_term_pos[j].y + p2.y);
                base_term_graphics[1].attr({ fill: "#00f", opacity: 0.0 });

                fade_in(base_term_graphics[1], timeline, duration_offset, 0.1 + duration_offset * (j + 1));
                const term_combine = exp_1.get(i).mul(exp_0.get(j));
                const p_combine = grid.resolve.apply(grid, term_combine.serialize(exp_res.max_degree, exp_res.dim).slice(2));
                move(base_term_graphics[0], timeline, 0.1, 0.7, cx + p_combine.x, cy + p_combine.y);
                fade_out(base_term_graphics[0], timeline, 0.1, 0.7);
            }

            fade_out(term_graphics[0], timeline, 0.1, 0.1 + duration_offset * serialized_exp_0.length);
        }

        return timeline;
    };

    const divide_3d = function(axes, exp_0, exp_1, exp_res, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline();
        const cx = width / 2;
        const cy = (height * 2) / 3;

        const serialized_exp_res = exp_res.serialize();
        const serialized_exp_0 = exp_0.serialize();
        const serialized_exp_1 = exp_1.serialize();

        const node_padding = Math.min((height * 2 / 3) / (exp_0.max_degree), 50);

        const grid = new Simplex_grid(axes, node_padding);
        const grid2 = new Simplex_grid(axes, node_padding * 1.75);

        const res_term_pos = [];
        const duration_offset = (0.6 - 0.1) / (serialized_exp_res.length + 2);
        for (let j = 0; j < serialized_exp_res.length; ++j) {
            const term = serialized_exp_res[j];
            const p = grid2.resolve.apply(grid2, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, cy + p.y).attr({ opacity: 0.0 });
            term_graphics[1].attr({ fill: "#00f" });

            fade_in(term_graphics[0], timeline, 0.1, 0.1 + duration_offset * (j + 1));

            const p_t = grid.resolve.apply(grid, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0.7, cx + p_t.x, cy + p_t.y);
            settle(term_graphics[1], timeline, 0.2, 0.8);

            res_term_pos.push(p);
        }

        for (const term of serialized_exp_0) {
            const o = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(width / 3 + o.x, cy + o.y);

            const p = grid2.resolve.apply(grid2, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0, cx + p.x, cy + p.y);
            fade_out(term_graphics[0], timeline, 0.02, 0.1 - 0.02 + duration_offset * 3);
        }

        for (const term of serialized_exp_1) {
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center((width * 2) / 3 + p.x, cy + p.y);
            term_graphics[1].attr({ fill: "#070" });

            fade_half(term_graphics[1], timeline, duration_offset, 0.1);

            for (let j = 0; j < res_term_pos.length; ++j) {
                move(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * j, cx + res_term_pos[j].x + p.x, cy + res_term_pos[j].y + p.y);
            }
            fade_out(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * res_term_pos.length);
        }

        let residue = exp_0;
        for (let i = 0; i < serialized_exp_res.length; ++i) {
            const term = serialized_exp_res[i];

            for (let j = 0; j < serialized_exp_1.length; ++j) {
                const div_term = serialized_exp_1[j];
                const art_term_graphics = draw_term(parent, term[0] * div_term[0], null);
                const p = grid.resolve.apply(grid, div_term.slice(2));
                art_term_graphics[0].center(cx + res_term_pos[i].x + p.x, cy + res_term_pos[i].y + p.y);
                art_term_graphics[1].attr({ fill: "#f00", opacity: 0.0 });

                fade_in(art_term_graphics[1], timeline, duration_offset, 0.1 + duration_offset * (i + 1));

                const term_combine = exp_res.get(i).mul(exp_1.get(j));
                residue = residue.subtract(term_combine);
                const p_subtract = grid2.resolve.apply(grid2, term_combine.serialize(exp_0.max_degree, exp_res.dim).slice(2));
                move(art_term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * (i + 2), cx + p_subtract.x, cy + p_subtract.y);
                fade_out(art_term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * (i + 2));
            }

            // create versions of subtraction
            const serialized_residue = residue.serialize();
            for (let k = 0; k < serialized_residue.length; ++k) {
                const res_term = serialized_residue[k];
                const term_graphics = draw_term(parent, res_term[0], null);
                const p = grid2.resolve.apply(grid2, res_term.slice(2));
                term_graphics[0].center(cx + p.x, cy + p.y);
                term_graphics[0].attr({ opacity: 0.0 });

                fade_in(term_graphics[0], timeline, 0.02, 0.1 - 0.02 + duration_offset * (i + 3));
                fade_out(term_graphics[0], timeline, 0.02, 0.1 - 0.02 + duration_offset * (i + 4));
            }
        }

        return timeline;
    };

    const divide_2d = function(axes, exp_0, exp_1, exp_res, parent, width, height) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline();
        const cx = width / 2;
        const cy = height / 2;

        const serialized_exp_res = exp_res.serialize();
        const serialized_exp_0 = exp_0.serialize();
        const serialized_exp_1 = exp_1.serialize();

        const node_padding = Math.min((width * 2 / 3) / (exp_0.max_degree * 1.5), 50);

        const grid = new Simplex_grid(axes, node_padding);
        const grid2 = new Simplex_grid(axes, node_padding * 1.75);

        const y_gap = 20;

        const res_term_pos = [];
        const duration_offset = (0.6 - 0.1) / (serialized_exp_res.length + 2);
        for (let j = 0; j < serialized_exp_res.length; ++j) {
            const term = serialized_exp_res[j];
            const p = grid2.resolve.apply(grid2, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, cy + p.y - y_gap).attr({ opacity: 0.0 });
            term_graphics[1].attr({ fill: "#00f" });

            fade_in(term_graphics[0], timeline, 0.1, 0.1 + duration_offset * (j + 1));

            const p_t = grid.resolve.apply(grid, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0.7, cx + p_t.x, cy + p_t.y);
            settle(term_graphics[1], timeline, 0.2, 0.8);

            res_term_pos.push(p);
        }

        for (const term of serialized_exp_0) {
            const o = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + o.x, height / 3 + o.y);

            const p = grid2.resolve.apply(grid2, term.slice(2));
            move(term_graphics[0], timeline, 0.1, 0, cx + p.x, cy + p.y);
            fade_out(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * (res_term_pos.length + 2));
        }

        for (let i = 0; i < serialized_exp_1.length; ++i) {
            const term = serialized_exp_1[i];
            const p = grid.resolve.apply(grid, term.slice(2));
            const term_graphics = draw_term(parent, term[0], null);
            term_graphics[0].center(cx + p.x, (height * 2) / 3 + p.y);
            term_graphics[1].attr({ fill: "#070" });

            fade_half(term_graphics[1], timeline, duration_offset, 0.1);

            const p2 = grid2.resolve.apply(grid2, term.slice(2));
            const y_offset = (i + 1) * y_gap;
            for (let j = 0; j < res_term_pos.length; ++j) {
                move(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * j, cx + res_term_pos[j].x + p2.x, y_offset + cy + res_term_pos[j].y + p2.y);
            }
            fade_out(term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * res_term_pos.length);
        }

        for (let i = 0; i < serialized_exp_res.length; ++i) {
            const term = serialized_exp_res[i];

            for (let j = 0; j < serialized_exp_1.length; ++j) {
                const y_offset = (j + 1) * y_gap;
                const div_term = serialized_exp_1[j];
                const art_term_graphics = draw_term(parent, term[0] * div_term[0], null);
                const p = grid2.resolve.apply(grid2, div_term.slice(2));
                art_term_graphics[0].center(cx + res_term_pos[i].x + p.x, y_offset + cy + res_term_pos[i].y + p.y);
                art_term_graphics[1].attr({ fill: "#f00", opacity: 0.0 });

                fade_in(art_term_graphics[1], timeline, duration_offset, 0.1 + duration_offset * (i + 1));

                const term_combine = exp_res.get(i).mul(exp_1.get(j));
                const p_subtract = grid2.resolve.apply(grid2, term_combine.serialize(exp_0.max_degree, exp_res.dim).slice(2));
                move(art_term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * (res_term_pos.length + 2), cx + p_subtract.x, cy + p_subtract.y);
                fade_out(art_term_graphics[0], timeline, duration_offset, 0.1 + duration_offset * (res_term_pos.length + 2));
            }
        }

        return timeline;
    };

    const operation = function(axes, expression, parent, width, height) {
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

        if (type === ".") {
            return multiply(axes, exp_0, exp_1, exp_res, parent, width, height);
        } else if (type === "/") {
            if (axes.length === 2) return divide_2d(axes, exp_0, exp_1, exp_res, parent, width, height);
            else return divide_3d(axes, exp_0, exp_1, exp_res, parent, width, height);
        }
    };

    const draw = function(parent, axes, expression) {
        // Set the dimensions of the plot
        const container_rect = parent.getBoundingClientRect();
        const computed_style = getComputedStyle(parent);
        const width = container_rect.width - parseFloat(computed_style.paddingLeft) - parseFloat(computed_style.paddingRight);
        const height = container_rect.height - parseFloat(computed_style.paddingTop) - parseFloat(computed_style.paddingBottom);
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };

        const svg = SVG().addTo(parent).size("100%", "100%");
        const polynomial_group = svg.group();

        let timeline = null;

        if (expression.type === "node") {
            timeline = transform_to_simplex(axes, expression, polynomial_group, width, height);
        } else if (expression.type === "=") {
            timeline = operation(axes, expression, polynomial_group, width, height);
        }

        const control_group = svg.group();

        const bar_padding = width * 0.05;
        const line = control_group.line(bar_padding, height - 10, width - bar_padding, height - 10);
        line.stroke({ color: "#9990", width: 5, linecap: "round" });

        const bar = control_group.line(0, height - 10, bar_padding * 2, height - 10);
        bar.stroke({ color: "#fffc", width: 7, linecap: "round" });

        move(bar, timeline, 1.0, 0, width - bar_padding, height - 10, "-");

        let touching = false;
        let sx = null;
        let sy = null;
        let holding_bar = false;

        const on_bar_enter = function() {
            holding_bar = true;
            line.stroke({ color: "#9997" });
        };
        const on_bar_move = function(clientX, container_rect) {
            const time = (clientX - container_rect.left - bar_padding) / (container_rect.width - bar_padding * 2);
            timeline.time(Math.max(0, time));
        };
        const on_bar_leave = function() {
            holding_bar = false;
            line.stroke({ color: "#9990" });
        };
        parent.addEventListener("mousemove", (e) => {
            on_bar_move(e.clientX, parent.getBoundingClientRect());
        });
        parent.addEventListener("touchstart", (e) => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
        });
        parent.addEventListener("touchmove", (e) => {
            if (!touching) {
                if (e.touches[0].clientX - sx > e.touches[0].clientY - sy) {
                    holding_bar = true;
                }
                touching = true;
            } else {
                if (holding_bar) {
                    on_bar_move(e.touches[0].clientX, parent.getBoundingClientRect());
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
        parent.addEventListener("touchend", (e) => {
            on_bar_leave();
            touching = false;
        });
    };

    return {
        draw: draw,
    };
})();