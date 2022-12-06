## title: Statement Functions

# Statement functions

By default SQRL functions cannot be used as statements. They need to either be used in calculating a feature or a rule.

Statement functions allow you to register functions that can act as entire statements. For example you might want to implement a statement that writes out a file during SQRL execution:

```
writeFile("last-username.txt", Username);
```

### Execution of statements

By default when you start up a SQRL execution _nothing_ is run. Calling `execution.fetchFeature` will start calculating that feature and any dependant ones.

Running statements uses special _Statement Features_ such as `SqrlFileStatements` below. These features **always** evaluate to `true`, however their promise will only be resolved once all the statements have been run. If you want an execution to run _all_ statements you can fetch the magic feature `SqrlExecutionComplete`.

### Example statement definition

```
const writeFileAsync = util.promisify(fs.writeFile);

registry.registerStatement(
  "SqrlFileStatements",
  async function writeFile(
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
