import { AT, FunctionRegistry, Execution } from "sqrl";

export function register(registry: FunctionRegistry) {
  registry.register(
    // @todo: Add type for name once it's required
    async function sayHello(state: Execution, name) {
      return "Hello, " + name + "!";
    },
    {
      // @todo: Add argument documentation
      args: [AT.state, AT.any]
    }
  );
}
