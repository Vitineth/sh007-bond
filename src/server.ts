import express from 'express';
import path from "path";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";
import gltf from 'gltf-pipeline';

const app = express();
app.use(express.static(path.join(__dirname, '../site')));
app.use(bodyParser.json())
app.use(bodyParser.raw())
app.use(bodyParser.text())
app.use(bodyParser.urlencoded())
app.use(fileUpload());
app.post('/compress', (req, res) => {
    // @ts-ignore
    gltf.processGlb(req.files?.file_model?.data, {
        compressDracoMeshes: true,
        // @ts-ignore
        compressionLevel: 10,
    }).then((e) => {
        res.send(e.glb);
        console.log(e.glb)
    }).catch((e) => {
        console.error(e);
        res.sendStatus(500);
    });
});
app.listen(3031);
// gltf.processGlb()
