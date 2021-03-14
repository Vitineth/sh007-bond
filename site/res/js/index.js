$(function () {
    console.log('onload');
})

function generateProgress(id, color) {
    const progress = $(`[data-progress-for="${id}"]`).find('.color');
    if (progress.length === 0) return () => undefined;

    progress.css('background', color);

    return (x, max) => {
        const p = (x / max) * 100;
        progress.css('width', p + "%")
    }
}
