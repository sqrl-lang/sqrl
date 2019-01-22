title: Statement Functions
---

# Statement functions

Statement functions allow you to register functions that can act as entire statements.

### Example statement definition

```
const writeFileAsync = util.promisify(fs.writeFile);

registry.registerStatement(
  "SqrlFileStatements",
  async function writeToFile(
    state: Execution,
    filename: string,
    contents: string
  ) {
    await fs.writeFileAsync(filename, contents);
  }
);
```

### Statement features

By default in a SQRL execution **no** statements are run.

In the example above `execution.fetchFeature('SqrlFileStatements')` will cause **all** writeToFile statements to be called. By default `SqrlExecutionComplete` includes all the special statement features, and that is loaded before any mutations are run.