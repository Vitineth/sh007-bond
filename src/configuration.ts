import { LogFacade } from "./cli-out";

export type Configuration = {
    dataDir: string,
    start: number,
    end: number,
    ignoreCache?: string,
    name: string,
}
