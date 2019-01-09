import { SqrlTest } from "../testing/SqrlTest";

export {
  buildTestServices,
  buildTestFunctionRegistry
} from "../testing/runSqrlTest";

/**
 * A SQRL Executable is the compiled verison of SQRL source files. It can be
 * cheaply executed for new events.
 */
export class Test {
  constructor(
    /**
     * @internal
     */
    public _wrapped: SqrlTest
  ) {}
}
