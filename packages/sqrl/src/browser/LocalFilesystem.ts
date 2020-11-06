import { Filesystem } from "../api/filesystem";

export class LocalFilesystem extends Filesystem {
  constructor() {
    super();
    throw new Error('LocalFilesystem is not supported in the browser.')
  }

  tryList(path: string): string[] {
    throw new Error('LocalFilesystem is not supported in the browser.')
  }

  tryRead(filename: string): Buffer {
    throw new Error('LocalFilesystem is not supported in the browser.')
  }
}

export function pathDirname(filePath: string) {
  throw new Error('Not implemented')
}
export function pathBasename(filePath: string) {
  throw new Error('Not implemented')
}
export function pathJoin(paths: string[]) {
  return paths.join('/');
}

export function splitPath(filePath: string): {
  dirname: string,
  basename: string
} {
  throw new Error('Filesystem functionality is not available in the browser.')
}