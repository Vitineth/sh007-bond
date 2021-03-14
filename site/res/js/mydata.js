(function (exp) {
    const colors = [
        '#81ecec', '#6be6f3', '#56dffa', '#45d8ff', '#3ecfff',
        '#46c6ff', '#59bcff', '#70b1ff', '#88a4ff', '#9f96fc',
        '#b588ee', '#c777dc', '#d666c7', '#e255ae', '#e84393',
    ]

    exp.advertisers = function (canvasID, dataURI, limit) {
        limit = limit || 100;
        // const element = $('#' + canvasID);
        // let index = 0;

        // $.get(dataURI).then((data) => {
        //     for(const entity of data.off_facebook_activity){
        //         element.append($('<div>').addClass('ads').css('border-color', colors[index++ % colors.length]).text(entity.name).append($('<div>').addClass('events').text(`(${entity.events.length} events)`)));
        //     }
        // })

        const setProgress = generateProgress(canvasID, colors[0]);

        let resolve;
        const promise = new Promise((r) => resolve = r);

        limit = limit || 100;
        $.get(dataURI).then((data) => {
            let uid = 0;
            let nodes = data.off_facebook_activity.map((e) => ({id: uid++, value: e.name, weight: e.events.length}))
            // let nodes = Object.entries(data)
            //     .map(([key, value]) => ({id: uid++, value: key, weight: value}))
            //     .filter((e) => e.weight > limit);
            const maxWeight = Math.max(...nodes.map((e) => e.weight));

            const radiusScale = d3.scaleSqrt().domain([0, maxWeight]).range([0, 80])
            const colorScale = d3.scaleOrdinal([0, maxWeight]).range(colors);
            const color = (d) => colorScale(d.weight);
            nodes.forEach((e) => e.radius = radiusScale(e.weight));

            const svg = d3.select('#' + canvasID);
            const [width, height] = [1200, 700];
            const [cx, cy] = [width / 2, height / 2];

            // charge is dependent on size of the bubble, so bigger towards the middle
            const charge = (d) => Math.pow(d.radius, 2.0) * 0.005;

            // create a force simulation and add forces to it
            const simulation = d3.forceSimulation()
                .force('charge', d3.forceManyBody().strength(charge))
                .force('x', d3.forceX().strength(0.03).x(cx))
                .force('y', d3.forceY().strength(0.03).y(cy))
                .force('collision', d3.forceCollide().radius(d => d.radius + 1));
            simulation.stop();

            const elements = svg.selectAll('.bubble')
                .data(nodes, d => d.id)
                .enter()
                .append('g')

            const bubbles = elements
                .append('circle')
                .classed('bubble', true)
                .attr('r', d => d.radius)
                .attr('fill', color)

            // labels
            const labels = elements
                .append('text')
                .attr('dy', '.3em')
                .style('text-anchor', 'middle')
                // .style('font-size', 10)
                .text(d => d.value)
                .attr('font-size', (d) => d.radius * (1 / 3))

            var zoomHandler = d3.zoom()
                .on("zoom", ({transform}) => {
                    elements.attr("transform", transform)
                })(svg);

            simulation.nodes(nodes)
                .on('tick', ticked)
                .restart();

            const start = Date.now();

            function ticked() {
                bubbles
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y)

                labels
                    .attr('x', d => d.x)
                    .attr('y', d => d.y)

                setProgress(Date.now() - start, 60000);
            }

            setTimeout(() => {
                simulation.stop();
                resolve();
                console.log('triggering next');
            }, 60000);
        }).catch((e) => {
            console.error(e);
            console.log('triggering next fail');
            resolve();
        })

        return promise;
    }
})(window.fbd === undefined ? window.fbd = {} : window.fbd);
