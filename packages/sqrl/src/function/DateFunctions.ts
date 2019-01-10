/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { Ast, CallAst } from "../ast/Ast";

import { default as AT } from "../ast/AstTypes";
import SqrlAst from "../ast/SqrlAst";
import { SqrlObject } from "../object/SqrlObject";
import Moment = require("moment");
import MomentTimezone = require("moment-timezone");

import { SqrlParserState } from "../compile/SqrlParserState";
import { buildSqrlError, sqrlInvariant } from "../api/parse";
import invariant from "../jslib/invariant";
import SqrlDateTime from "../object/SqrlDateTime";
import { Execution } from "../api/execute";

const VALID_TIMESPANS = {
  MS: 1,
  SECOND: 1000.0,
  MINUTE: 60 * 1000.0,
  HOUR: 60 * 60 * 1000.0,
  DAY: 24 * 60 * 60 * 1000.0,
  WEEK: 7 * 24 * 60 * 60 * 1000.0
};

const ISO_8601_DURATION_REGEXES = [
  /^P([0-9]+Y)?([0-9]+M)?([0-9]+W)?([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+(\\.[0-9]+)?S)?)?$/,
  /^P([^T]+|.*T.+)$/
];

export function registerDateFunctions(registry: SqrlFunctionRegistry) {
  registry.save(null, {
    name: "dateDiff",
    args: [AT.any, AT.any, AT.any.optional],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      const timeUnitAst = ast.args[0];

      if (
        timeUnitAst.type !== "constant" ||
        !VALID_TIMESPANS.hasOwnProperty(timeUnitAst.value)
      ) {
        throw buildSqrlError(
          ast,
          `invalid time unit for dateDiff. Expected one of ${JSON.stringify(
            Object.keys(VALID_TIMESPANS)
          )}`
        );
      }

      const startDateAst = ast.args[1];
      const endDateAst = ast.args[2] || null;
      sqrlInvariant(
        ast,
        endDateAst === null || endDateAst.type === "feature",
        "dateDiff expects an optional feature as second arg"
      );

      return SqrlAst.call("_dateDiff", [
        SqrlAst.constant(VALID_TIMESPANS[timeUnitAst.value]),
        startDateAst,
        endDateAst || SqrlAst.call("nowMs", [])
      ]);
    }
  });

  registry.save(
    function _dateDiff(msConversion: number, start, end) {
      if (start instanceof SqrlObject) {
        start = start.tryGetTimeMs();
      }
      if (end instanceof SqrlObject) {
        end = end.tryGetTimeMs();
      }
      if (typeof start !== "number" || typeof end !== "number") {
        return null;
      }
      return (end - start) / msConversion;
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.save(
    function _formatDate(timeMs, format) {
      if (timeMs instanceof SqrlObject) {
        timeMs = timeMs.tryGetTimeMs();
      }
      if (typeof timeMs !== "number") {
        return null;
      }
      return Moment(timeMs, "x")
        .utcOffset(0)
        .format(format);
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.save(null, {
    name: "formatDate",
    args: [AT.any, AT.any.optional],
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      let formatAst;
      if (ast.args.length === 1) {
        formatAst = SqrlAst.constant("dddd, MMMM Do YYYY, h:mm:ss a");
      } else {
        formatAst = ast.args[1];
        sqrlInvariant(
          ast,
          formatAst.type === "constant",
          "Expecting string format"
        );
        sqrlInvariant(
          ast,
          Moment(Moment().format(formatAst.value), formatAst.value).isValid(),
          "Invalid format string."
        );
      }
      return SqrlAst.call("_formatDate", [ast.args[0], formatAst]);
    }
  });

  registry.save(
    function _dateAdd(time, duration) {
      if (time instanceof SqrlObject) {
        time = time.tryGetTimeMs();
      }
      invariant(typeof time === "number", "Expected numeric timeMs");
      const value = Moment.utc(time)
        .add(Moment.duration(duration))
        .valueOf();
      if (!value) {
        throw new Error("Got null timeMs value from moment");
      }
      return new SqrlDateTime(value);
    },
    {
      allowSqrlObjects: true
    }
  );

  registry.save(null, {
    name: "dateAdd",
    transformAst(state: SqrlParserState, ast: CallAst): Ast {
      sqrlInvariant(
        ast,
        ast.args.length === 2,
        "Expected two arguments for dateAdd"
      );
      const durationAst = ast.args[1];

      // Allow non-constant durations, but check constants for valid values
      sqrlInvariant(
        durationAst,
        durationAst.type !== "constant" ||
          ISO_8601_DURATION_REGEXES.every(regex => {
            return regex.test(durationAst.value);
          }),
        "Expected a valid ISO8601 duration for dateAdd second parameter"
      );

      return SqrlAst.call("_dateAdd", ast.args);
    }
  });

  registry.save(
    function date(value) {
      // Value can be iso8601 or timeMs
      if (value instanceof SqrlObject) {
        value = value.tryGetTimeMs() || value.getBasicValue();
      }
      const ms = new Date(value).getTime() || null;
      return ms && new SqrlDateTime(ms);
    },
    {
      allowSqrlObjects: true,
      args: [AT.any]
    }
  );

  registry.save(
    function timeMs(state: Execution, timeMs, timezone) {
      if (timeMs === null) {
        return null;
      }

      if (timeMs instanceof SqrlObject) {
        timeMs = timeMs.tryGetTimeMs();
      }

      if (typeof timeMs === "string") {
        const moment = Moment(timeMs, Moment.ISO_8601);
        if (moment.isValid()) {
          timeMs = moment.valueOf();
        }
      }
      if (typeof timeMs !== "number") {
        throw new Error("Invalid time value passed to timeMs");
      }

      if (!timezone) {
        return timeMs;
      }
      const unixTime = MomentTimezone(timeMs)
        .tz(timezone)
        .unix();
      return unixTime ? unixTime * 1000 : null;
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any.optional.string]
    }
  );
}
