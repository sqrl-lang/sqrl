import { cliMain, getCliOutput, defaultCliArgs } from "../src/cli/CliMain";
import { CloseableGroup } from "../src/jslib/Closeable";
import { Readable, Writable } from "stream";
import invariant from "../src/jslib/invariant";

class StringBuffer extends Writable {
  public string: string = "";
  _write(chunk: Buffer, enc, cb) {
    invariant(chunk instanceof Buffer, "expected buffer writes");
    this.string += chunk.toString("utf-8");
    cb();
  }
}

test("repl works", async () => {
  const output = getCliOutput(defaultCliArgs);
  const closeables = new CloseableGroup();
  closeables.add(output);

  const stdin = new Readable(); // new empty stream.Readable
  stdin.push("LET X := 5;");
  stdin.push(null);

  const stdout = new StringBuffer();

  try {
    await cliMain(
      {
        ...defaultCliArgs,
        repl: true
      },
      output,
      closeables,
      {
        stdin,
        stdout
      }
    );
  } finally {
    closeables.close();
  }

  expect(stdout.string).toEqual("sqrl> 5\nsqrl> ");
});
