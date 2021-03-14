import { Configuration } from "./configuration"
import fs from 'fs/promises';
import * as _ from "logger";
import path from 'path';
import { EventEmitter } from "events";
import Cache from './cache';

export type ThreadStat = {
    total: number,
    videos: number,
    photos: number,
    audio: number,
    gifs: number,
    message: number,
}
export type ThreadCategory = 'inbox' | 'requests' | 'archived';
export type MessageSizes = Record<ThreadCategory, { [key: string]: ThreadStat }>;

const _sizes = ({ dataDir, start, end, ignoreCache }: Configuration) => {
    const CACHE_FILE = path.join(__dirname, '..', 'cache', 'sizes.cache');
    const {
        tryCacheAndSave,
        writeThroughCache,
    } = Cache(CACHE_FILE);

    function randomID() {
        const opts = 'abcdefgh0123456789'.split('');
        let out = '';
        for (let i = 0; i < 5; i++) {
            out += opts[Math.floor(Math.random() * opts.length)];
        }
        return out;
    }

    /**
     * Calculates the size of a directory by `stat` ing every file within it and every subdirectory recursively. It will
     * eventually resolve with a number which is the cumulative sum of the directory in bytes. You can optionally pass
     * an event emitter object and it will emit the following events:
     *
     * * `fail`: if it failed to stat a file.
     *      [args: `directory: string`]
     * * `file`: when a file is stat-ed
     *      [args: `name: string`, `size: number`]
     * * `directory`: when a directory is stat-ed
     *      [args: `name: string`, `size: number`]
     * * `done`: when the process is complete containing the full directory size
     *      [args: `size: number`]
     *
     * @param directory the starting root directory
     * @param emitter an optional event emitter which will receive events as the process continues
     * @param root if this is the root run of the function, this should ALWAYS be true (TODO: remove this)
     */
    async function directorySize(
        directory: string,
        emitter?: EventEmitter,
        root: boolean = true,
    ): Promise<number> {
        // Skip the workflow folder
        if (path.resolve(directory) === path.resolve(path.join(__dirname, '..'))) return 0;

        // See if we have a cache of stating this entry. If so look it up and return it, if not manually stat it and
        // save that value to the cache
        const file = await tryCacheAndSave(`dirSize.${directory}`, async () => {
            let dirStats;

            try {
                dirStats = await fs.lstat(directory);
            } catch (e) {
                if (emitter) emitter.emit('fail', directory);
                _.warn(`Failed to stat ${directory} due to error: ${e.message}`)

                return {
                    isDirectory: false,
                    size: 0,
                }
            }

            // Directories do have a file size but we are not accounting for that, we just want file sizes in our total
            // so if its a directory return a size of 0
            if (dirStats.isDirectory()) {
                _.trace(`Manually stated dir ${directory}, not in cache`);
                return {
                    isDirectory: true,
                    size: 0,
                }
            }

            // Otherwise (its a file) return its actual size
            return {
                isDirectory: false,
                size: dirStats.size,
            }
        });

        // Can't recurse on files so just emit the event and finish
        if (!file.isDirectory) {
            if (emitter) emitter.emit('file', [directory, file.size]);
            return file.size;
        }
        _.trace(`Getting size of ${directory}`);

        // If it is a directory stat every child
        const children = await fs.readdir(directory);
        const sizes = await Promise.all(children.map((e) => directorySize(path.join(directory, e), emitter, false)));

        // Then sum them all
        let reduce = sizes.reduce((a, b) => a + b);

        // Emit that we did a folder
        if (emitter) emitter.emit('directory', [directory, reduce]);

        // If this is the root call then it means we are done so emit the done event and save the cache if we have one
        if (root) {
            if (emitter) emitter.emit('done', reduce);
            await writeThroughCache();
        }

        // Then done!
        return reduce;
    }

    /**
     * Calculates the size of each message thread broken down by their different categories and file types. This will
     * perform {@link directorySize} on the messages folder and listen for updates to slowly populate a the final object
     * The video value for each ThreadStat will not contain the size of the video thumbnails, only the videos
     * themselves. This means that they will not sum up to the total value if there are videos.
     */
    async function messageSizes(): Promise<MessageSizes> {
        const directoryRegex = /.+?[\\|\/](inbox|message_requests|archived_threads)[\\|\/]([a-zA-Z0-9_-]+)[\\|\/]?(photos|videos|gifs|audio)?[\\|\/]?([\\|\/]thumbnails)?$/i;
        return new Promise((resolve) => {
            /**
             * Pending means video folders that have only had one value read. To calculate the size of videos
             * we need the size of the video folder and the size of the thumbnail folder so we can subtract it
             * It will be removed in the final output
             */
            const threads = {
                inbox: {} as { [key: string]: ThreadStat },
                requests: {} as { [key: string]: ThreadStat },
                archived: {} as { [key: string]: ThreadStat },
                pending: {} as { [key: string]: { type: ThreadCategory, dir?: number, thumbs?: number } },
            };

            // Need to create an event emitter to listen to the results of the directory descent in real time
            const emitter = new EventEmitter();

            /**
             * Utility function to save a property value into its correct place in {@link threads}. If the given name
             * does not exist it will automatically create it an 0 it. If the category is not valid it will print a
             * warning and then not perform any other operations
             * @param category the category (one of inbox, request, archived)
             * @param type the data size that we are trying to update or save in the threads record
             * @param name the name of this message thread
             * @param value the value to save
             */
            const save = (
                category: ThreadCategory,
                type: keyof ThreadStat,
                name: string,
                value: number,
            ) => {
                if (threads[category] === undefined) {
                    _.warn('Invalid category', category);
                    return;
                }
                if (threads[category].hasOwnProperty(name)) {
                    threads[category][name][type] = value;
                } else {
                    threads[category][name] = {
                        audio: 0,
                        gifs: 0,
                        message: 0,
                        photos: 0,
                        total: 0,
                        videos: 0,
                        // Overwrite whatever key we are applying using spread operators. The square brackets mean
                        // use type as its value, not just the string 'type'
                        ...{
                            [type]: value,
                        },
                    }
                }
            }

            emitter.on('done', () => {
                // @ts-ignore - I know this doesn't follow the type but it works in the end
                delete threads['pending'];

                // Now for any that don't have complete data we need to calculate their message sizes
                const all_threads = [
                    ...Object.values(threads.archived),
                    ...Object.values(threads.inbox),
                    ...Object.values(threads.requests),
                ];

                // Recalculate the message size now that we definitely have all the values which are present
                for (const entry of all_threads) {
                    entry.message = entry.total - (entry.videos + entry.photos + entry.gifs + entry.audio);
                }

                resolve(threads)
            });

            emitter.on('directory', ([dir, size]) => {
                // Test to see if this directory is valid and extract the information, if not just return as we can't do
                // anything with it
                const match = directoryRegex.exec(dir);

                if (match === null) {
                    _.warn('Directory not matched', dir);
                    return;
                }

                // Hackby but works?
                // Extract out all the properties from the regex, we need to case this to an array before so that we
                // can apply typings to the stuff on the left. These are hacky types and things should be programmed
                // assuming that wrong data can be submitted
                let [path, category, name, type, isThumbnails] = match as unknown as [string, ThreadCategory, string, keyof ThreadStat | undefined, string | undefined];

                // I renamed some things to make it more readable
                if (category as string === 'message_requests') category = 'requests';
                if (category as string === 'archived_threads') category = 'archived';

                if (type === undefined) {
                    // This is the directory size
                    save(category, 'total', name, size);
                } else if (type === 'videos') {
                    // Videos need a lot of handling because it required both values.
                    // A summary:
                    //  * If it has a pending record we need to work out the size, we should either have the thumbnail
                    //    size of the parent directory size and the other should be saved so subtract them in the right
                    //    order and save it. If the other one isn't saved something really weird has happened so we just
                    //    do nothing
                    //  * If it doesn't have a pending record this means its the first run so we save a new pending
                    //    record so we can run the stuff above
                    if (threads.pending.hasOwnProperty(name)) {
                        // Has a pending value
                        const entry = threads.pending[name];
                        if (isThumbnails) {
                            if (entry.dir) {
                                save(category, 'videos', name, entry.dir - size);
                                _.debug(`Thread ${name}: video: ${entry.dir - size}`);
                                delete threads.pending[name];
                            } else {
                                _.warn(`Thumbnails were processed twice for ${dir} without a directory size`)
                            }
                        } else {
                            if (entry.thumbs) {
                                save(category, 'videos', name, size - entry.thumbs);
                                _.debug(`Thread ${name}: video: ${size - entry.thumbs}`);
                                delete threads.pending[name];
                            } else {
                                _.warn(`Directory was processed twice for $\{dir} without a thumb size`);
                            }
                        }
                    } else {
                        // Does not have a pending size
                        if (isThumbnails) {
                            threads.pending[name] = {
                                type: category,
                                thumbs: size,
                            };
                        } else {
                            threads.pending[name] = {
                                type: category,
                                dir: size,
                            };
                        }
                    }
                } else {
                    // If its anything else we don't have to do fancy processing on it!
                    save(category, type, name, size);
                    _.debug(`Thread ${name}: ${type}: ${size}`);
                }
            });

            directorySize(path.join(dataDir, 'messages'), emitter);
        })
    }

    return {
        messageSizes,
    };

}

export default _sizes;
