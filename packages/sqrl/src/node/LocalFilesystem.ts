import * as path from "path";
import { readFileSync, readdirSync } from "fs";
import { Filesystem } from "../api/filesystem";

export class LocalFilesystem extends Filesystem {
  constructor(private pwd: string) {
    super();
  }

  tryList(dirPath: string) {
    try {
      return readdirSync(path.join(this.pwd, dirPath)).filter(filename =>
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
    const filePath = path.resolve(this.pwd, filename);
    return readFileSync(filePath);
  }
}

export function pathDirname(filePath: string) {
    return path.dirname(filePath);
}
export function pathBasename(filePath: string) {
    return path.basename(filePath);
}
export function pathJoin(...paths: string[]) {
    return path.join(...paths);
}

export function splitPath(filePath: string): {
    dirname: string,
    basename: string
} {
    return {
        dirname: path.dirname(filePath),
        basename: path.basename(filePath)
    };
}