import * as SQRL from "sqrl";
import { registerPatternFunctions } from "./PatternFunctions";
import { InProcessPatternService } from "./InProcessPatternService";

export function register(registry: SQRL.FunctionRegistry) {
  registry.registerSync(function simhash(text: string) {
    return "00000000";
  });

  registerPatternFunctions(registry, new InProcessPatternService());
}
