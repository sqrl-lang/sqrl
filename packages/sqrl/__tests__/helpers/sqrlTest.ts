import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

export function sqrlTest(name: string, sqrl: string) {
  test(name, () => runSqrlTest(sqrl));
}
