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
        d = this.s * d;
        return {
            x: (this.zx * z + this.xx * x + this.yx * y) * d,
            y: (this.zy * z + this.xy * x + this.yy * y) * d
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

        const degree_g = g.group();
        let offset = coeff_g.bbox().w*3/4;
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

    const transform_to_simplex = function(expression, parent, grid, cx, cy) {
        // duration is 0.0-1.0
        const timeline = new SVG.Timeline()

        const terms = expression.value.serialize();

        let i = 0;
        for (const term of terms) {
            const p_s = grid.grid(((i++) - Math.floor(terms.length/2))*3, 0);
            const term_graphics = draw_term(parent, term[0], term[1]);
            term_graphics[0].center(cx + p_s.x, cy + p_s.y);

            const runner = new SVG.Runner(0.4);
            const p_t = grid.resolve.apply(grid, term.slice(2));
            runner.center(cx + p_t.x, cy + p_t.y);
            runner.element(term_graphics[0]);

            timeline.schedule(runner.persist(true), 0, 'absolute');

            const runner_2 = new SVG.Runner(0.5);
            runner_2.center(cx + p_t.x*4, cy + p_t.y*8);
            runner_2.element(term_graphics[2]);

            timeline.schedule(runner_2.persist(true), 0.5, 'absolute');

            const runner_3 = new SVG.Runner(0.3);
            runner_3.center(cx + p_t.x, cy + p_t.y)
            .attr({ fill: '#f00', opacity: (Math.abs(term[0]) > 1e-4 ? '1.0':'0.0') });
            runner_3.element(term_graphics[1]);

            timeline.schedule(runner_3.persist(true), 0.7, 'absolute');
        }

        return timeline;
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

        const node_size = Math.min(width, height) * 0.01;
        const node_padding = Math.min(width, height) * 0.1;
        const grid = new Simplex_grid(node_padding);
        const cx = width / 2;
        const cy = height / 2;

        let timeline = null;

        if (expression.type === "node") {
            timeline = transform_to_simplex(expression, polynomial_group, grid, cx, cy);
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