import { SqrlTest } from "../testing/SqrlTest";

export {
  buildTestServices,
  buildTestFunctionRegistry
} from "../testing/runSqrlTest";

export { runSqrlTest } from "../simple/runSqrlTest";
export { SimpleBlockService } from "../simple/SimpleBlockService";
export { SimpleLogService } from "../simple/SimpleLogService";
export { SimpleManipulator } from "../simple/SimpleManipulator";
export { TestLogger } from "../simple/TestLogger";

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
