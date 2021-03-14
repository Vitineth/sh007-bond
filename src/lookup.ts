import { Configuration } from "./configuration";
import fs from 'fs/promises';
import path from "path";

export    type Container = {
    /**
     * Mapping chat IDs to their actual names
     */
    threadData: {
        [key: string]: {
            message: string,
            sender: string,
            time: number,
        }[]
    }
    idMap: { [key: string]: string },
    globalOwnWords: { [key: string]: number },
    globalWords: { [key: string]: number },
    participants: { [key: string]: string[] },
    perThreadWords: { [key: string]: { [key: string]: number } },
    perThreadOwnWords: { [key: string]: { [key: string]: number } },
    perPersonWords: { [key: string]: { [key: string]: number } },
    globalTypes: Record<'generic' | 'share' | 'call' | 'subscribe', number>,
    typesByThread: { [key: string]: Record<'generic' | 'share' | 'call' | 'subscribe', number> }
}

const _lookup = ({ dataDir, start, end, ignoreCache, name }: Configuration) => {

    async function processWords(id: string, messages: any[], container: Container) {
        for (const message of messages) {
            if (container.typesByThread[id] === undefined) container.typesByThread[id] = {
                generic: 0,
                call: 0,
                share: 0,
                subscribe: 0
            };
            // @ts-ignore
            container.globalTypes[message.type.toLowerCase()] = (container.globalTypes[message.type.toLowerCase()] ?? 0) + 1;
            // @ts-ignore
            container.typesByThread[id][message.type.toLowerCase()] = (container.typesByThread[id][message.type.toLowerCase()] ?? 0) + 1;

            if (container.perThreadOwnWords[id] === undefined) container.perThreadOwnWords[id] = {};
            if (container.perThreadWords[id] === undefined) container.perThreadWords[id] = {};
            if (container.threadData[id] === undefined) container.threadData[id] = [];

            if (message.type === 'Generic' && message.hasOwnProperty('content')) {
                // Then process for words
                const words = message.content.split(' ');
                const isMe = message.sender_name === name;

                if (container.perPersonWords[message.sender_name] === undefined) container.perPersonWords[message.sender_name] = {};
                container.threadData[id].push({
                    message: message.content,
                    sender: message.sender_name,
                    time: message.timestamp_ms,
                });

                for (const word of words) {
                    if (isMe) {
                        container.perThreadOwnWords[id][word] = (container.perThreadOwnWords[id][word] ?? 0) + 1;
                        container.globalOwnWords[word] = (container.globalOwnWords[word] ?? 0) + 1;
                    }

                    container.perThreadWords[id][word] = (container.perThreadWords[id][word] ?? 0) + 1;
                    container.globalWords[word] = (container.globalWords[word] ?? 0) + 1;
                    container.perPersonWords[message.sender_name][word] = (container.perPersonWords[message.sender_name][word] ?? 0) + 1;
                }
            }
        }
    }

    async function parseMessageFile(file: string, container: Container) {
        const data = await fs.readFile(file, { encoding: 'utf8' });
        const parsed = JSON.parse(data);

        const id = parsed.thread_path.split('/').reverse()[0];

        container.idMap[id] = parsed.title;
        container.participants[id] = parsed.participants.map((entry: any) => entry.name);

        await processWords(id, parsed.messages, container);
    }

    async function findMessageFiles(folder: string, container: Container) {
        const files = await fs.readdir(folder);
        const messageFiles = files.filter((name) => name.startsWith('message') && name.endsWith('.json'));

        return Promise.all(messageFiles.map((file) => parseMessageFile(path.join(folder, file), container)));
    }

    async function findFiles(): Promise<Container> {
        const container: Container = {
            perThreadWords: {},
            threadData: {},
            globalWords: {},
            globalOwnWords: {},
            perThreadOwnWords: {},
            typesByThread: {},
            globalTypes: { subscribe: 0, share: 0, call: 0, generic: 0 },
            participants: {},
            perPersonWords: {},
            idMap: {},
        };

        const folders = await fs.readdir(path.join(dataDir, 'messages'));

        const promises = [];

        for (const folder of folders) {
            console.log(folder);
            // Ignore the stickers used folder, its bullshit
            if (folder.includes('stickers_used')) continue;

            // But traverse the rest for actual files
            promises.push(
                fs.readdir(path.join(dataDir, 'messages', folder)).then((files) => {
                    return Promise.all(
                        files.map((file) => findMessageFiles(path.join(dataDir, 'messages', folder, file), container))
                    );
                }),
            );
            // TODO: noooo pls catch
        }

        await Promise.all(promises);

        return container;
    }

    return findFiles;

};

export default _lookup;
