import { Configuration } from "./configuration";
import { Container } from "./lookup";

const _lookup = ({ dataDir, start, end, ignoreCache, name }: Configuration) => ((container: Container) => {
    const mapping: {
        [key: string]: { [key: string]: number },
    } = {};

    for (const [, members] of Object.entries(container.participants)) {
        for (const left of members) {
            for (const right of members) {
                if (left === right) continue;

                if (mapping.hasOwnProperty(left)) {
                    mapping[left][right] = (mapping[left][right] ?? 0) + 1;
                } else if (mapping.hasOwnProperty(right)) {
                    mapping[right][left] = (mapping[right][left] ?? 0) + 1;
                } else {
                    mapping[left] = {
                        [right]: 1,
                    }
                }
            }
        }
    }

    return mapping;
})
export default _lookup;
