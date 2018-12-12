/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Filesystem, LocalFilesystem } from "sqrl/lib/api/filesystem";
import * as chokidar from "chokidar";
import { join } from "path";

export class WatchedSourceTree extends Filesystem {
  private watcher: chokidar.FSWatcher;
  private fs: LocalFilesystem;
  constructor(private pwd: string) {
    super();
    this.fs = new LocalFilesystem(pwd);
    this.watcher = chokidar.watch([], {
      ignoreInitial: true,
      persistent: false,

      // @todo: This is not ideal, but on OSX changes are not picked up without it.
      usePolling: true
    });
  }

  // Expose a super-simple `on('change')` handler for now
  on(event: "change", callback: () => void) {
    this.watcher.on("all", callback);
  }
  private watch(path: string) {
    this.watcher.add(join(this.pwd, path));
  }

  tryList(path: string) {
    this.watch(path);
    return this.fs.tryList(path);
  }
  tryRead(path: string) {
    this.watch(path);
    return this.fs.tryRead(path);
  }
}
