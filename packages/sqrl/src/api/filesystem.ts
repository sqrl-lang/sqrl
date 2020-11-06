/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

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

export class VirtualFilesystem extends Filesystem {
  constructor(
    private source: {
      [path: string]: string;
    }
  ) {
    super();
  }

  tryList(folder: string) {
    // Return null if the path pointed to a file
    if (this.source[folder]) {
      return null;
    }
    return Object.keys(this.source)
      .filter((path) => path.startsWith(folder + "/"))
      .map((path) => path.substring((folder + "/").length));
  }
  tryRead(path: string) {
    if (this.source[path]) {
      return Buffer.from(this.source[path]);
    }
    return null;
  }
  tryResolve(path: string) {
    return path;
  }
}
