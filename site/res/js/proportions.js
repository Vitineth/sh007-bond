(function (exp) {
    const linkColors = [
        '#81ecec', '#6be6f3', '#56dffa', '#45d8ff', '#3ecfff',
        '#46c6ff', '#59bcff', '#70b1ff', '#88a4ff', '#9f96fc',
        '#b588ee', '#c777dc', '#d666c7', '#e255ae', '#e84393',
    ]
    const width = 1200;
    const height = 700;
    const pack = data => d3.pack()
        .size([width - 2, height - 2])
        .padding(3)
        (d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value))

    exp.proportions = function (canvasID, dataURI) {
        const setProgress = generateProgress(canvasID, linkColors[0]);

        let resolve;
        const promise = new Promise((r) => resolve = r);

        $.get(dataURI, function (json) {
            const nodes = [];
            let maxV = 0;

            for (const [key, entry] of Object.entries(json)) {
                const vc = Object.values(entry).reduce((a, b) => a + b, 0);
                const total = entry['total']
                nodes.push({
                    name: key,
                    v: vc,
                    children: Object.entries(entry).filter(([k]) => k !== 'total').map(([k, v]) => ({
                        name: k,
                        value: v / total,
                        v: v / total
                    }))
                });

                if (vc > maxV) maxV = vc;
            }
            const colorScale = d3.scaleOrdinal([0, maxV]).range(linkColors);
            const data = {
                name: "root",
                children: nodes
            };

            const uid = (s) => s + (Math.round(Math.random() * 100000))
            const color = (d) => colorScale(d.data.v);
            const root = pack(data);

            const svg = d3.select('#' + canvasID)
                .style("font", "10px sans-serif")
                .attr("text-anchor", "middle");

            const shadow = uid("shadow");

            svg.append("filter")
                .attr("id", shadow.id)
                .append("feDropShadow")
                .attr("flood-opacity", 0.3)
                .attr("dx", 0)
                .attr("dy", 1);

            const everything = svg.append("g");

            const node = everything.selectAll("g")
                .data(d3.group(root.descendants(), d => d.height))
                .join("g")
                .attr("filter", shadow)
                .selectAll("g")
                .data(d => d[1])
                .join("g")
                .attr("transform", d => `translate(${d.x + 1},${d.y + 1})`);

            node.append("circle")
                .attr("r", d => d.r)
                .attr("fill", color);

            const leaf = node.filter(d => !d.children);

            leaf.select("circle")
                .attr("id", d => (d.leafUid = uid("leaf")).id);

            leaf.append("clipPath")
                .attr("id", d => (d.clipUid = uid("clip")).id)
                .append("use")
                .attr("xlink:href", d => d.leafUid.href);

            leaf.append("text")
                .attr("clip-path", d => d.clipUid)
                .selectAll("tspan")
                .data(d => [d])
                .join("tspan")
                .attr("x", 0)
                .attr("y", (d, i, nodes) => {
                    if (d.depth === 1) {
                        return `${(i - nodes.length / 2 + 0.8) - (d.r)}em`
                    }
                    return `${i - nodes.length / 2 + 0.8}em`;
                })
                .attr('font-size', (d) => {
                    // console.log(d);
                    // console.log(d.children);
                    // console.log(d, d.depth);
                    if (d.depth !== 1) {
                        return d.r * 0.5;
                    } else {
                        // console.warn('###########')
                        return d.r * 0.01;
                    }
                })
                .text(d => d.data.name)

            node.append("title")
                .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${d.value}`);

            d3.zoom()
                .on("zoom", ({transform}) => {
                    everything.attr("transform", transform)
                })(svg);

            resolve();
        }).catch(resolve);

        return promise;
    }
})(window.fbd === undefined ? window.fbd = {} : window.fbd);
