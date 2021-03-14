import Lookup from './lookup';
import Sizes from './sizes';
import Relationships from './relationships';
import * as _ from "logger";
import fs from 'fs';
import path from "path";

_.setMinimumLevel(_.LogLevel.BASE);

const conf = {
    dataDir: '../',
    end: 0,
    start: 0,
    name: 'Ryan Delaney',
};

const stopWords = [
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'i',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'i\'m',
    'is',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
]

// const outputFolder = path.join(__dirname, '..', 'site', 'res', 'data');
const outputFolder = path.join(__dirname, '..', 'demo');

if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

fs.copyFileSync(path.join(conf.dataDir, 'ads_and_businesses', 'ads_interests.json'), path.join(outputFolder, 'adinterest.json'));
fs.copyFileSync(path.join(conf.dataDir, 'ads_and_businesses', 'advertisers_who_uploaded_a_contact_list_with_your_information.json'), path.join(outputFolder, 'advertisers.json'));
fs.copyFileSync(path.join(conf.dataDir, 'ads_and_businesses', 'your_off-facebook_activity.json'), path.join(outputFolder, 'off-facebook.json'));

const resolveIDS = (idMap: { [key: string]: string }, threads: { [p: string]: any }) => {
    return Object.fromEntries(
        Object.entries(threads).map(([id, data]) => ([
            id,
            {
                name: idMap[id],
                data,
            }
        ])),
    );
}

Sizes(conf).messageSizes()
    .then((data) => {
        const mergedData = {
            ...data.inbox,
            ...data.requests,
            ...data.archived
        };

        return fs.promises.writeFile(path.join(outputFolder, 'thread-proportions.json'), JSON.stringify(mergedData), { encoding: 'utf8' })
    })
    .then(() => Lookup(conf)())
    .then(async (d) => {
        await Promise.all([
            fs.promises.writeFile(path.join(outputFolder, 'own-words-by-thread.json'), JSON.stringify(resolveIDS(d.idMap, d.perThreadOwnWords)), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'words-by-thread.json'), JSON.stringify(resolveIDS(d.idMap, d.perThreadWords)), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'types-by-thread.json'), JSON.stringify(resolveIDS(d.idMap, d.typesByThread)), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'words.json'), JSON.stringify(d.globalWords), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'own-words.json'), JSON.stringify(d.globalOwnWords), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'words-by-person.json'), JSON.stringify(d.perPersonWords), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'types.json'), JSON.stringify(d.globalTypes), { encoding: 'utf8' }),
            fs.promises.writeFile(path.join(outputFolder, 'participants.json'), JSON.stringify(d.participants), { encoding: 'utf8' }),
        ]);

        fs.writeFileSync('lookup.json', JSON.stringify(d), { encoding: 'utf8' });

        return Relationships(conf)(d);
    }).then(async (relations) => {
        const flattened = [];
        for (const [from, data] of Object.entries(relations)) {
            for (const [to, amount] of Object.entries(data)) {
                flattened.push({
                    from,
                    to,
                    strength: amount,
                })
                // flattened.push([from, to, amount]);
            }
        }

        await fs.promises.writeFile(path.join(outputFolder, 'chat-relations-flat-obj.json'), JSON.stringify(flattened), { encoding: 'utf8' });
        await fs.promises.writeFile(path.join(outputFolder, 'chat-relations-nested.json'), JSON.stringify(relations), { encoding: 'utf8' });
    }
);

// Size(conf).messageSizes().then((stats) => {
//     _.info(`[INBOX] Message Threads with Sizes`);
//     for (const [key, value] of Object.entries(stats.inbox)) {
//         _.info(`${key}: ${value.total} bytes`);
//
//         if (value.message !== 0) {
//             _.info(`    Message: ${Math.round((value.message / value.total) * 100)}% (${value.message} bytes)`);
//         }
//         if (value.audio !== 0) {
//             _.info(`    Audio: ${Math.round((value.audio / value.total) * 100)}% (${value.audio} bytes)`);
//         }
//         if (value.gifs !== 0) {
//             _.info(`    GIF: ${Math.round((value.gifs / value.total) * 100)}% (${value.gifs} bytes)`);
//         }
//         if (value.photos !== 0) {
//             _.info(`    Photo: ${Math.round((value.photos / value.total) * 100)}% (${value.photos} bytes)`);
//         }
//         if (value.videos !== 0) {
//             _.info(`    Video: ${Math.round((value.videos / value.total) * 100)}% (${value.videos} bytes)`);
//         }
//     }
// }).catch(console.error);
