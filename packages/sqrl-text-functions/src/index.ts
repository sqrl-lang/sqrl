import * as SQRL from "sqrl";

export function register(registry: SQRL.FunctionRegistry) {
  registry.registerSync(function simhash(text: string) {
    return "00000000";
  });
}
