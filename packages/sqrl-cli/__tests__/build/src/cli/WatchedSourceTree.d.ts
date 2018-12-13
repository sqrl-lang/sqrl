/// <reference types="node" />
import { Filesystem } from "sqrl/lib/api/filesystem";
export declare class WatchedSourceTree extends Filesystem {
    private pwd;
    private watcher;
    private fs;
    constructor(pwd: string);
    on(event: "change", callback: () => void): void;
    private watch;
    tryList(path: string): string[];
    tryRead(path: string): Buffer;
}
