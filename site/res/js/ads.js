(function (exp) {
    const colors = [
        '#81ecec', '#6be6f3', '#56dffa', '#45d8ff', '#3ecfff',
        '#46c6ff', '#59bcff', '#70b1ff', '#88a4ff', '#9f96fc',
        '#b588ee', '#c777dc', '#d666c7', '#e255ae', '#e84393',
    ]

    exp.ads = function (canvasID, dataURI) {
        const element = $('#' + canvasID);

        $.get(dataURI).then((data) => {
            let index = 0;
            for (const e of data.topics) {
                element.append($('<div>').addClass('ads').css('border-color', colors[index++ % colors.length]).text(e));
            }
        })

        return Promise.resolve();
    }
})(window.fbd === undefined ? window.fbd = {} : window.fbd);
