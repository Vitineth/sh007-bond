declare module 'gltf-pipeline'{

    declare type Options = Partial<{
        separate: boolean,
        separateTextures: boolean,
        stats: boolean,
        keepUnusedElements: boolean,
        compressDracoMeshes: boolean,
        separateBuffers: boolean,
        separateShaders: boolean,
        logger: any,
        separateResources: any,
        customStages: any[],
    }>;
    declare type x = {
        processGlb: (glb: Buffer, options: Options) => Promise<any>
    };

    const b: x = {};

    export default b;
}
