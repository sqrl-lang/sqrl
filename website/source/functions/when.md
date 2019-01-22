title: When Clause Functions
---

# When clause functions

### Functions on WHEN clauses

```
registry.registerStatement(
  "SqrlBlockStatements",
  async function blockAction(
    state: Execution,
    cause: WhenCause
  ) {
    // Mark the action as blocked somehow.
  },
  {
    args: [
      AT.state,
      AT.whenContext,
      /* your own arguments go here */
    ],
    allowNull: true
  }
);
```

Your `blockAction` function will be provided with additional context about why the action was blocked. For more information about exactly what is included see the [`WhenCause`](https://twitter.github.io/sqrl/reference/interfaces/_when_.whencause.html) reference documentation.