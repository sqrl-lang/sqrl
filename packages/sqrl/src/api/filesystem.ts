/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { join } from "path";
import { readFileSync, readdirSync } from "fs";

/**
 * This class represents a tree of source code rooted at a single script.
 * Each method returns null if the target was not the correct file type, or did not exist
 */
export abstract class Filesystem {
  /**
   * Read a file at the given path, returns the file contents as a binary
   * buffer if the file exists, otherwise null.
   */
  abstract tryRead(filename: string): Buffer | null;
  /**
   * Return a directory listing for a given path, or null if the folder does not
   * exist.
   */
  abstract tryList(path: string): string[] | null;
}

export class EmptyFilesystem extends Filesystem {
  tryRead(filename: string) {
    return null;
  }
  tryList() {
    return null;
  }
}

export class LocalFilesystem extends Filesystem {
  constructor(private pwd: string) {
    super();
  }

  tryList(path: string) {
    try {
      return readdirSync(join(this.pwd, path)).filter(filename =>
        filename.endsWith(".sqrl")
      );
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  tryRead(filename: string) {
    const path = join(this.pwd, filename);
    return readFileSync(path);
  }
}
