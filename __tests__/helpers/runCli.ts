import { Writable, Readable } from "stream";
import invariant from "../../src/jslib/invariant";
import { cliMain, CliArgs } from "../../src/cli/CliMain";
import { CloseableGroup } from "../../src/jslib/Closeable";

class StringBuffer extends Writable {
  public string: string = "";
  _write(chunk: Buffer, enc, cb) {
    invariant(chunk instanceof Buffer, "expected buffer writes");
    this.string += chunk.toString("utf-8");
    cb();
  }
}

export async function runCli(args: CliArgs, stdinString: string) {
  const closeables = new CloseableGroup();
  const stdin = new Readable();
  stdin.push(stdinString);
  stdin.push(null);

  const stdout = new StringBuffer();

  try {
    await cliMain(args, closeables, {
      stdin,
      stdout
    });
  } finally {
    closeables.close();
  }

  return stdout.string;
}
