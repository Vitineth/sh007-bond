(function (exp) {
    const linkColors = [
        '#81ecec', '#6be6f3', '#56dffa', '#45d8ff', '#3ecfff',
        '#46c6ff', '#59bcff', '#70b1ff', '#88a4ff', '#9f96fc',
        '#b588ee', '#c777dc', '#d666c7', '#e255ae', '#e84393',
    ]
    const width = 1200;
    const height = 700;

    exp.echoar = function (canvasID, dataURI) {
        const setProgress = generateProgress(canvasID, linkColors[0]);
        $.get(dataURI, function (json) {
            const idTable = {};
            const connectionsPerNode = {};
            const nodes = [];
            const links = [];
            let nextID = 0;

            for (const entry of json) {
                if (entry.strength < 3) continue;
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

            // Now go through the links and create a new set of nodes which are actually connected
            console.log(nodes, links);
            const graph = {nodes, links};

            const g = ForceGraph3D({})(document.getElementById(canvasID)).graphData(graph);

            const start = Date.now();
            const timeToSim = 60000;
            g
                // .warmupTicks(5000)
                .nodeRelSize(10)
                .cooldownTime(timeToSim)
                .linkWidth(1)
                // .nodeColor(nodeColorRenderer)
                // .linkColor(linkColorRenderer)
                // .linkVisibility(linkVisibilityRenderer)
                // .nodeVisibility(nodeVisibilityRenderer)
                // .d3Force('link', d3.forceLink().links(links).strength((d) => {
                //     console.log(d);
                //     return 1;
                // }))
                .forceEngine('nbody')
                .onEngineTick(function () {
                    const diff = Date.now() - start;
                    const perc = ((diff / timeToSim) * 100) + "%";
                    // document.getElementById('sim-perc').innerText = 'Simulation Running: ' + perc;
                })
            ;

            // g.pauseAnimation();
            const link = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link); // Firefox workaround, see #6594

            function save(blob, filename) {

                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();

                // URL.revokeObjectURL( url ); breaks Firefox...

            }

            function saveString(text, filename) {

                save(new Blob([text], {type: 'text/plain'}), filename);

            }


            function saveArrayBuffer(buffer, filename) {

                save(new Blob([buffer], {type: 'application/octet-stream'}), filename);

            }


            g.onEngineStop(() => {
                console.log('trying');
                const exporter = new GLTFExporter();
                exporter.parse(g.scene(), function (result) {
                    console.log(result);

                    const fd = new FormData();
                    fd.append('key', 'shrill-thunder-5107');
                    fd.append('email', 'vitineth@gmail.com');
                    fd.append('target_type', '2');
                    fd.append('hologram_type', '2');
                    fd.append('type', 'upload');
                    fd.append('file_model', new Blob([result], {type: 'application/octet-stream'}), 'pls.glb');

                    fetch('https://console.echoAR.xyz/upload', {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            // 'Content-Type': 'multipart/form-data'
                        },
                        body: fd,
                    }).then((d) => {
                        console.log(d);
                        window.dx = d;
                    }).catch(console.error);
                    //
                    // if (result instanceof ArrayBuffer) {
                    //
                    //     saveArrayBuffer(result, 'scene.glb');
                    //
                    // } else {
                    //
                    //     const output = JSON.stringify(result, null, 2);
                    //     console.log(output);
                    //     saveString(output, 'scene.gltf');
                    //
                    // }
                    // downloadJSON( gltf );
                }, {
                    binary: true,
                });
            });
        });
    }
})(window.fbd === undefined ? window.fbd = {} : window.fbd);
