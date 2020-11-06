/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import prettier = require("prettier/standalone");
import prettierBabel = require("prettier/parser-babel");

import invariant from "../jslib/invariant";

interface SourcePrintOptions {
  excludeSlotNumbers?: boolean;
  astHash?: boolean;
}

export default class SqrlSourcePrinter {
  private slotNames: string[];
  private slotJs: string[];

  constructor(props: { slotNames: string[]; slotJs: string[] }) {
    this.slotNames = props.slotNames;
    this.slotJs = props.slotJs;
  }

  getSlotJs(slot: number): string {
    invariant(
      slot >= 0 && slot < this.slotJs.length,
      "Invalid slot passed to getSlotJs"
    );
    if (this.slotJs[slot]) {
      return this.slotJs[slot];
    } else {
      throw new Error(
        "Slot does not have associated js (perhaps it is an input?)"
      );
    }
  }

  findSlotIndex(slotName: string): number {
    const slot = this.slotNames.indexOf(slotName);
    invariant(slot >= 0, "Could not find slot: %s", slotName);
    return slot;
  }
  hasSlot(slotName: string): boolean {
    return this.slotNames.includes(slotName);
  }

  getJsForSlotName(slotName: string): string {
    return this.getSlotJs(this.findSlotIndex(slotName));
  }
  getSourceForSlotName(slotName: string, props = {}) {
    return this.getHumanSlotSource(this.findSlotIndex(slotName), props);
  }
  getHumanSlotSource(slot, props = {}) {
    return this.transformSource(this.getSlotJs(slot), props);
  }

  printAllSource() {
    Object.entries(this.getHumanAllSource()).forEach(([slotName, source]) => {
      // tslint:disable-next-line
      console.log(`== ${slotName} ==`);
      // tslint:disable-next-line
      console.log(source);
      // tslint:disable-next-line
      console.log();
    });
  }

  getHumanAllSource(
    props: SourcePrintOptions = {}
  ): {
    [slotName: string]: string;
  } {
    const output = {};
    this.slotJs.forEach((source, slot?) => {
      const slotName = this.slotNames[slot] || null;

      let name: string;
      if (!slotName) {
        name = `slot[${slot}]`;
      } else if (props.excludeSlotNumbers) {
        name = `${slotName}`;
      } else {
        name = `slot[${slot}](${slotName})`;
      }

      if (source === null) {
        output[name] = "<input>";
      } else {
        output[name] = this.transformSource(source, props);
      }
    });
    return output;
  }

  private transformSource(
    source?: string,
    props: SourcePrintOptions = {}
  ): string {
    // Replace common references to slots with their named counter-parts
    // ** This does not produce valid javascript code and is intended for
    //    testing and debugging only!
    //
    const transformName = (slot) => {
      let source;
      if (!props.astHash && this.slotNames[slot].startsWith("ast:")) {
        source = this.getHumanSlotSource(slot, props);
      } else {
        return JSON.stringify(this.slotNames[slot]);
      }
      const escaped = source.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
      if (props.excludeSlotNumbers) {
        return `\`${slot}:${escaped}\``;
      } else {
        return `\`${escaped}\``;
      }
    };
    const replacedSource = source
      .replace(/this.slots\[([0-9]+)\]/g, (full, slot?) => {
        return `this.slots[${transformName(slot)}]`;
      })
      .replace(/this.fetch\(([0-9]+)\)/g, (full, slot?) => {
        return `this.fetch(${transformName(slot)})`;
      })
      .replace(
        /this.(build|load|prepare|wait)\((\[[0-9]+(?:,[0-9]+)*\])\)/g,
        (full, func, slotList) => {
          const slotNames = JSON.parse(slotList).map(transformName);
          return `this.${func}(${slotNames.join(",")})`;
        }
      );

    const formatted = prettier
      .format("(" + replacedSource + ")()", {
        parser: "babel",
        plugins: [prettierBabel],
      })
      .trim();
    return formatted.slice("(".length, formatted.length - ")();".length);
  }
}
