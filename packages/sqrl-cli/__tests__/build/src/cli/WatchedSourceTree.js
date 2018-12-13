"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filesystem_1 = require("sqrl/lib/api/filesystem");
const chokidar = require("chokidar");
const path_1 = require("path");
class WatchedSourceTree extends filesystem_1.Filesystem {
    constructor(pwd) {
        super();
        this.pwd = pwd;
        this.fs = new filesystem_1.LocalFilesystem(pwd);
        this.watcher = chokidar.watch([], {
            ignoreInitial: true,
            persistent: false,
            usePolling: true
        });
    }
    on(event, callback) {
        this.watcher.on("all", callback);
    }
    watch(path) {
        this.watcher.add(path_1.join(this.pwd, path));
    }
    tryList(path) {
        this.watch(path);
        return this.fs.tryList(path);
    }
    tryRead(path) {
        this.watch(path);
        return this.fs.tryRead(path);
    }
}
exports.WatchedSourceTree = WatchedSourceTree;
