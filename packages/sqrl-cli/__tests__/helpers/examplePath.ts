import { join } from "path";

export function examplePath(filename: string) {
  return join(__dirname, "../../../../examples", filename);
}
