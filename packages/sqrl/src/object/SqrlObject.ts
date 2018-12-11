/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { foreachObject } from "../jslib/foreachObject";
import hasConstructor from "../jslib/hasConstructor";
import invariant from "../jslib/invariant";
import isEmptyObject from "../jslib/isEmptyObject";
import mapObject from "../jslib/mapObject";
import chalk from "chalk";

export default class SqrlObject {
  getData() {
    throw new Error("not implemented.");
  }
  getBasicValue() {
    throw new Error("not implemented.");
  }
  tryGetFeatureType() {
    return null;
  }
  tryGetTimeMs() {
    return null;
  }
  tryGetOfClass(cls) {
    if (this instanceof cls) {
      return this;
    }
    return null;
  }

  getTimeMs() {
    const timeMs = this.tryGetTimeMs();
    invariant(timeMs !== null, "SqrlObject tryGetTimeMs not implemented");
    return timeMs;
  }

  renderText() {
    return chalk.grey(JSON.stringify(this.getData(), undefined, 2) + "\n");
  }

  static isTruthy(obj) {
    if (!obj) {
      // Any javascript falsy values are 'falsy'
      return false;
    } else if (typeof obj !== "object") {
      // Any truthy non-objects are 'truthy'
      return true;
    } else if (obj instanceof Buffer) {
      // Arrays/Buffers are truthy if their length>0
      return obj.length > 0;
    } else if (Array.isArray(obj)) {
      // Truthy arrays must contain at least one non null value.
      return obj.some(v => v !== null);
    } else if (obj instanceof Set) {
      // Sets are truthy if their size>0
      return obj.size > 0;
    } else {
      // @TODO: We should invariant on SqrlObject or simple object here, but
      // that is not enforcable (yet.)
      return !isEmptyObject(obj);
    }
  }

  static isBasic(val) {
    if (
      val instanceof SqrlObject ||
      val instanceof Buffer ||
      val instanceof Set
    ) {
      return false;
    } else if (Array.isArray(val)) {
      return val.every(SqrlObject.isBasic);
    } else if (val !== null && typeof val === "object") {
      if (hasConstructor(val)) {
        // @TODO: We should disallow these later
        return true;
      } else {
        let basic = true;
        foreachObject(val, subValue => {
          basic = basic && SqrlObject.isBasic(subValue);
        });
        return basic;
      }
    } else {
      return true;
    }
  }

  static ensureBasicTypeValue(value, expandData = false) {
    // @TODO: Arrays
    if (value === null) {
      return {
        type: null,
        value: null
      };
    } else {
      let type = "Any";
      if (value instanceof SqrlObject) {
        type = value.tryGetFeatureType() || "Any";
      }
      return {
        type,
        value: SqrlObject.ensureBasic(value, expandData)
      };
    }
  }

  static ensureBasic(val, expandData?) {
    // First do a quick scan to see if any of the values are actually SqrlObject
    // If not exit early with the original array
    if (SqrlObject.isBasic(val)) {
      return val;
    }

    if (val instanceof Set) {
      val = Array.from(val);
    }

    if (val instanceof SqrlObject) {
      if (expandData) {
        return SqrlObject.ensureBasic(val.getData(), expandData);
      } else {
        return val.getBasicValue();
      }
    } else if (val instanceof Buffer) {
      // @TODO: Perhaps we should have a StringBuffer, but for now be safe and
      //        return the hex encoded version
      // return val.toString('utf-8');
      return val.toString("hex");
    } else if (Array.isArray(val)) {
      return val.map(v => SqrlObject.ensureBasic(v, expandData));
    } else if (typeof val === "object" && !hasConstructor(val)) {
      // @TODO: We should disallow these later
      return mapObject(val, v => SqrlObject.ensureBasic(v, expandData));
    } else {
      return val;
    }
  }

  static ensureOfClass(val, cls) {
    invariant(
      val instanceof SqrlObject,
      "Could not ensureOfClass non-SqrlObject:: %s",
      val
    );
    const result = val.tryGetOfClass(cls);
    invariant(result, "Value was not of correct type for ensureOfClass", val);
    return result;
  }
}
