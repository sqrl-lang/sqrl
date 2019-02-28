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
