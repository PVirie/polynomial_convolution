const parse_block = function(block) {
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

const parse_all = function() {
    for (const b of polynomial_blocks) {
        if (b.parts == null) {
            const parts = parse_block(b);
            b.parts = parts;
        }
        if(b.animator != null) b.animator.clear();
        
        while (b.firstChild) b.firstChild.remove();
        b.animator = simplex.draw(b, b.parts[0], b.parts[1]);
    }
}

const bib_index = {};
const compile_citation = function() {
    const bib = document.querySelector(".bibliography");
    for (const b of citation_blocks) {
        const content = b.innerHTML;
        if(bib_index[content] == null) {
            bib_index[content] = Object.keys(bib_index).length + 1;
        }
        if(bib != null) {
            const li = document.createElement("li");
            li.innerHTML = bib_index[content] + ". " + content;
            bib.appendChild(li);
        }
        b.innerHTML = bib_index[content];
    }
}


let delayer = null;
const citation_blocks = document.querySelectorAll(".cite");
const polynomial_blocks = document.querySelectorAll(".virie-algebra-block");

window.addEventListener('resize', function() {
    if (delayer != null) clearTimeout(delayer);
    delayer = setTimeout(function() {
        parse_all();
    }, 500);
});

window.onload = function() {
    parse_all();
    compile_citation();
};