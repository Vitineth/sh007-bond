import Blessed from 'blessed';
import * as fs from "fs";

export type LogFacade = {
    logStatus: (id: string, status: 'waiting' | 'running' | 'done') => void,
    registerStep: (id: string, text: string, status: 'waiting' | 'running' | 'done') => void,
    logMessage: (id: string, message: string) => void,
}

export default function setup(): LogFacade {
    type LogManager = {
        order: string[],
        entries: {
            [key: string]: {
                status: 'waiting' | 'running' | 'done',
                text: string,
                logs: string[],
            }
        },
        blessings: {
            [key: string]: {
                logElement: Blessed.Widgets.Log,
                titleElement: Blessed.Widgets.TextElement,
                logLength: number,
            },
        }
    }

    const log: LogManager = {
        blessings: {},
        entries: {},
        order: [],
    }

// Create a screen object.
    const screen = Blessed.screen({
        smartCSR: true,
        title: 'Facebook Data Analyser',
        fullUnicode: true,
        forceUnicode: true,
    });

    function logStatus(id: string, status: 'waiting' | 'running' | 'done') {
        if (!log.order.includes(id)) throw new Error('Invalid log ID');
        log.entries[id].status = status;
        render();
    }

    function registerStep(id: string, text: string, status: 'waiting' | 'running' | 'done') {
        log.entries[id] = {
            status,
            text,
            logs: [],
        }
        log.order.push(id);
        render();
    }

    function logMessage(id: string, message: string) {
        if (!log.order.includes(id)) throw new Error('Invalid log ID');
        log.entries[id].logs.push(message);
        render();
    }

    function getState(state: 'waiting' | 'running' | 'done') {
        switch (state) {
            case "done":
                return `{green-fg}\u{2705}{/}`;
            case "running":
                return `{cyan-fg}\u{1F3C3}{/}`;
            case "waiting":
                return `{red-fg}\u{23F0}{/}`
        }
    }

    function render() {
        try {
            let currentY = 0;
            for (const entry of log.order) {
                const properties = log.entries[entry];
                if (!log.blessings.hasOwnProperty(entry)) {
                    // Does not have a blessed log entry, need to create one
                    log.blessings[entry] = {
                        logElement: Blessed.log({
                            hidden: true,
                            top: currentY,
                            left: 2,
                            height: 0,
                            style: {
                                bg: 'black',
                                fg: 'white',
                            },
                            width: '100%',
                            tags: true,
                        }),
                        titleElement: Blessed.text({
                            content: `[${getState(properties.status)}]: ${properties.text}`,
                            left: 0,
                            top: currentY,
                            height: 1,
                            style: {
                                bg: 'black',
                                fg: 'cyan',
                                bold: true,
                            },
                            width: '100%',
                            tags: true,
                        }),
                        logLength: 0,
                    };

                    screen.append(log.blessings[entry].titleElement);
                    screen.append(log.blessings[entry].logElement);
                }

                const blessings = log.blessings[entry];

                // Now we need to update the blessing properties
                if (properties.logs.length > 0 && properties.status === 'running') {
                    blessings.logElement.height = 4;
                    blessings.logElement.hidden = false;

                    if (blessings.logLength !== properties.logs.length) {
                        // Then we need to insert more logs
                        for (let i = blessings.logLength; i < properties.logs.length; i++) {
                            blessings.logElement.log(properties.logs[i]);
                            blessings.logLength++;
                        }
                    }
                }

                if (properties.status === 'done') {
                    blessings.logElement.height = 0;
                    blessings.logElement.hidden = true;
                }

                // Now update the status in case it changes
                blessings.titleElement.setText(`[${getState(properties.status)}]: ${properties.text}`);

                // And finally update the y values and indexes
                blessings.titleElement.top = currentY;
                currentY++;
                if (blessings.logLength > 0 && properties.status === 'running') {
                    blessings.logElement.top = currentY;
                    currentY += 4;
                }
            }

            // fs.writeFileSync('why', 'i rendered!', { encoding: 'utf8' });
            screen.render();
        } catch (e) {
            fs.writeFileSync('failed.txt', e.message, { encoding: 'utf8' });
        }
    }

    render()

    return {
        registerStep,
        logMessage,
        logStatus,
    };
}
