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
}

simplex = (function() {

    const draw = function(parent, expression) {
        // Set the dimensions of the plot
        const container_rect = parent.getBoundingClientRect();
        const computed_style = getComputedStyle(parent);
        const width = container_rect.width - parseFloat(computed_style.paddingLeft) - parseFloat(computed_style.paddingRight);
        const height = container_rect.height - parseFloat(computed_style.paddingTop) - parseFloat(computed_style.paddingBottom);
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };


        const svg = SVG().addTo(parent).size('100%', '100%');

        const node_size = Math.min(width, height) * 0.01;
        const node_padding = Math.min(width, height) * 0.1;
        const grid = new Simplex_grid(node_padding);

        const draw_term = function(term, cx, cy) {
            const p = grid.resolve.apply(grid, term.slice(1));
            // const circle = svg.circle(node_size).attr({ fill: 'red', cx: cx + p.x, cy: cy + p.y });
            const text = svg.text(term[0].toString())
                .font({
                    family: 'DM Mono', // Use the custom font
                    size: 18, // Set the font size
                    anchor: 'middle', // Set the text anchor
                })
                .fill('#f00')
                .move(cx + p.x, cy + p.y);
        }

        if (expression.type === "node") {
            const terms = expression.value.compile();
            for (const term of terms) {
                draw_term(term, width / 2, height / 2);
            }
        }
    }

    return {
        draw: draw
    }

})();