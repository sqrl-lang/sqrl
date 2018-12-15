import { runSqrlTest } from "../../src/testing/runSqrlTest";

export function sqrlTest(name: string, sqrl: string) {
  test(name, () => runSqrlTest(sqrl));
}
