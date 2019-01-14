import { runSqrlTest } from "../../src/simple/runSqrlTest";

export function sqrlTest(name: string, sqrl: string) {
  test(name, () => runSqrlTest(sqrl));
}
