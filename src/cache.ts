import fs from "fs/promises";
import * as _ from "logger";

export default function (cacheFile: string) {
    const cache: { tried: 'no' | 'loaded' | 'failed', data: any, modified: boolean } = {
        tried: 'no',
        data: {},
        modified: false,
    };

    async function tryCacheAndSave<T>(key: string, alternative: () => Promise<T>): Promise<T> {
        // If we failed to load the cache this will never work so execute the fallback and try and save it to the new
        // cache
        if (cache.tried === 'failed') {
            const result = await alternative();
            saveToCache(key, result);
            return result;
        }

        // If we haven't loaded the cache yet, try and load it. If it fails then we mark it as failed and use the
        // fallback
        if (cache.tried === 'no') {
            try {
                cache.data = JSON.parse(await fs.readFile(cacheFile, { encoding: 'utf8' }));
                cache.tried = 'loaded';
            } catch (e) {
                cache.tried = 'failed';
                _.error('Failed to read sizes cache', e);
                return alternative();
            }
        }

        // Otherwise we must be loaded so try and read it from the cache and return it if it exists
        if (cache.data.hasOwnProperty(key)) {
            return cache.data[key];
        }

        // Otherwise use the fallback and try and and save it into the cache
        const result = await alternative();
        saveToCache(key, result);
        return result;
    }

    function saveToCache(key: string, value: any) {
        cache.data[key] = value;
        cache.modified = true;
    }

    function writeThroughCache(): Promise<void> {
        if (cache.modified) {
            return fs.writeFile(cacheFile, JSON.stringify(cache.data), { encoding: 'utf8' });
        }

        return Promise.resolve();
    }

    return {
        writeThroughCache,
        saveToCache,
        tryCacheAndSave,
    };
}
