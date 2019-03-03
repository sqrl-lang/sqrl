/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export class CliError extends Error {
  readonly suggestion: string | null;
  constructor(
    message: string,
    options: {
      suggestion?: string;
    } = {}
  ) {
    super(message);
    this.suggestion = options.suggestion || null;
  }
}

export function cliInvariant(condition: boolean, message: string) {
  if (!condition) {
    throw new CliError(message);
  }
}
