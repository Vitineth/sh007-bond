import express from 'express';
import path from "path";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import fs from "fs/promises";

const obj2gltf = require('obj2gltf');

const app = express();
app.use(express.static(path.join(__dirname, '../site')));
app.use(bodyParser.json({
    limit: '100mb',
}))
app.use(bodyParser.raw({
    limit: '100mb',
}));
app.use(bodyParser.text({
    limit: '100mb'
}))
app.use(bodyParser.urlencoded({
    limit: '100mb',
    extended: true,
}))
app.use(fileUpload({
    limits: {
        fileSize: ((100 * 1024) * 1024) * 1024
    }
}));
app.post('/compress', (req, res) => {
    fs.writeFile('t.cache.obj', req.body).then(() => {
        obj2gltf('t.cache.obj', {})
            .then(function (glb: any) {
                console.log(`${req.body.length} -> ${glb.length}`)
                res.send(glb);
                // fs.writeFileSync('model.glb', glb);
            });
    })
    // @ts-ignore
    // gltf.processGlb(req.files?.file_model?.data, {
    //     compressDracoMeshes: true,
    //     @ts-ignore
    // compressionLevel: 10,
    // }).then((e) => {
    //     res.send(e.glb);
    //     console.log(e.glb)
    // }).catch((e) => {
    //     console.error(e);
    //     res.sendStatus(500);
    // });
});
app.listen(3031);
// gltf.processGlb()
