import { AbstractLogger } from "../../util/Logger";
import { LogProperties } from "../log";
import * as util from "util";

export class TestLogger extends AbstractLogger {
  readonly messages: {
    msg: string;
    level: string;
  }[] = [];

  countErrors() {
    let errorCount = 0;
    for (const { level } of this.messages) {
      if (level === "trace" || level === "debug" || level === "info") {
        continue;
      }
      errorCount += 1;
    }
    return errorCount;
  }

  popLatest(props: { level: string }) {
    const { level } = props;
    for (let idx = this.messages.length - 1; idx >= 0; idx--) {
      if (this.messages[idx].level === level) {
        return this.messages.splice(idx, 1)[0];
      }
    }
    throw new Error("No log line found");
  }

  log(level: string, props: LogProperties, format: string, ...param: any[]) {
    const message = util.format(format, ...param);
    // tslint:disable-next-line
    this.messages.push({
      msg: message,
      level
    });
    // tslint:disable-next-line:no-console
    console.error(message);
  }
}
