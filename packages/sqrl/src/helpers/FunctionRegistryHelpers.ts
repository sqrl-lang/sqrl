import { SqrlFunctionRegistry } from "../function/FunctionRegistry";
import {
  registerAllFunctions,
  FunctionServices
} from "../function/registerAllFunctions";

export function buildFunctionRegistryForServices(services?: FunctionServices) {
  const registry = new SqrlFunctionRegistry();
  registerAllFunctions(registry, services);
  return registry;
}
