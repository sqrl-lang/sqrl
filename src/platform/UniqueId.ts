/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export abstract class UniqueId {
  abstract getTimeMs(): number;
  abstract getRemainder(): number;
  abstract getBuffer(): Buffer;
  abstract getNumberString(): string;

  equals(other: UniqueId): boolean {
    return (
      this.getTimeMs() === other.getTimeMs() &&
      this.getRemainder() === other.getRemainder()
    );
  }
  greaterThan(other: UniqueId): boolean {
    let diff = this.getTimeMs() - other.getTimeMs();
    if (diff === 0) {
      diff = this.getRemainder() - other.getRemainder();
    }
    return diff > 0;
  }

  getHexString() {
    return this.getBuffer().toString("hex");
  }
}
