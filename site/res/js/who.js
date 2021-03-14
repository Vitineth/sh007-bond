(function (exp) {
    exp.who = function (canvasID, dataURI) {

        const linkColors = [
            '#81ecec', '#6be6f3', '#56dffa', '#45d8ff', '#3ecfff',
            '#46c6ff', '#59bcff', '#70b1ff', '#88a4ff', '#9f96fc',
            '#b588ee', '#c777dc', '#d666c7', '#e255ae', '#e84393',
        ]

        const colors = [
            '#55efc4', '#81ecec', '#74b9ff', '#a29bfe', '#dfe6e9',
            '#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#b2bec3',
            // '#ffeaa7', '#fab1a0', '#ff7675', '#fd79a8', '#636e72',
            // '#fdcb6e', '#e17055', '#d63031', '#e84393', '#2d3436'
        ];
        let resolve;
        const promise = new Promise((r) => resolve = r);

        console.log('beginning who');
        console.error(new Error());
        $.get(dataURI, function (json) {
            const setProgress = generateProgress(canvasID, colors[0]);

            const idTable = {};
            const connectionsPerNode = {};
            const nodes = [];
            const links = [];
            let nextID = 0;

            for (const entry of json) {
                // Map every source and taget to an ID which is unique and cache it, save the new node
                if (!Object.prototype.hasOwnProperty.call(idTable, entry.from)) {
                    idTable[entry.from] = nextID;
                    nodes.push({
                        id: nextID,
                        name: entry.from,
                    });
                    nextID++;
                }

                if (!Object.prototype.hasOwnProperty.call(idTable, entry.to)) {
                    idTable[entry.to] = nextID;
                    nodes.push({
                        id: nextID,
                        name: entry.to,
                    });
                    nextID++;
                }

                // Count the number of connections per node, this is used to calculate the strength of the link connections
                if (!Object.prototype.hasOwnProperty.call(connectionsPerNode, idTable[entry.to])) {
                    connectionsPerNode[idTable[entry.to]] = 1
                } else {
                    connectionsPerNode[idTable[entry.to]]++;
                }
                if (!Object.prototype.hasOwnProperty.call(connectionsPerNode, idTable[entry.from])) {
                    connectionsPerNode[idTable[entry.from]] = 1
                } else {
                    connectionsPerNode[idTable[entry.from]]++;
                }

                // Only include links that are stronger than 3
                if (entry.strength >= 3) {
                    links.push({
                        source: idTable[entry.from],
                        target: idTable[entry.to],
                        weight: entry.strength,
                    });

                }
            }

            const svg = d3.select('#' + canvasID);
            const width = 1200;
            const height = 700;
            const maxLink = Math.max(...links.map((e) => e.weight));

            const simulation = d3.forceSimulation(nodes)
                .force('charge', d3.forceManyBody())
                .force('link', d3.forceLink().links(links).strength((e) => {
                    const value = 1 / Math.max(connectionsPerNode[e.source.id], connectionsPerNode[e.target.id]);
                    return 1 / Math.max(connectionsPerNode[e.source.id], connectionsPerNode[e.target.id])
                    // return 1;
                }))
                .force('center', d3.forceCenter(width / 2, height / 2));


            const color = (d) => colors[d.id % colors.length];
            const linkColor = (w) => linkColors[Math.floor(((w.weight + 0.0) / maxLink) * linkColors.length)];

            const g = svg.append("g");

            const link = g.append("g")
                .attr("stroke-opacity", 0.6)
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("stroke", (d) => linkColor(d))
                .attr("stroke-width", d => Math.sqrt(d.weight));

            const node = g.append("g")
                .attr("class", "nodes")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5)
                .selectAll("g")
                .data(nodes)
                .enter()
                .append("g")

            const circles = node
                .append("circle")
                .attr("r", 5)
                .attr("fill", color)

            const labels = node
                .append("text")
                .attr('font-size', '0.5em')
                .attr("stroke", color)
                .attr("stroke-width", 0.5)
                .text((d) => d.name)

            var zoom_handler = d3.zoom()
                .on("zoom", zoom_actions);

            zoom_handler(svg);

            function zoom_actions({transform}) {
                g.attr("transform", transform)
            }

            function dragStarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragEnded(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded);

            const start = Date.now();
            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                labels
                    .attr('x', d => d.x + 7)
                    .attr('y', d => d.y + 2);

                circles
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

                setProgress(Date.now() - start, 60000);
            });

            setTimeout(() => {
                simulation.stop();
                resolve();
            }, 60000);
        }).catch(resolve);

        return promise;
    }
})(window.fbd === undefined ? window.fbd = {} : window.fbd);
