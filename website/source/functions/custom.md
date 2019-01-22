title: Custom Functions
---

# Custom functions

### Example custom function

Once you're comfortable creating simple functions you can create a function with custom syntax. We use this functionality to provide our counters that have their own syntax.

You can view our [`sqrl-redis-functions`](https://github.com/twitter/sqrl/tree/master/packages/sqrl-redis-functions) package for examples on how they were defined.

```
  registry.registerCustom(function count(
    state: CompileState,
    ast: CustomCallAst
  ): Ast {
      /*
        In here `ast.source` is the raw source of the argumets to the count() call.
        For example count(BY Id) will give you `ast.source === "BY Id"`.
      */
  }
```

You are responsible for parsing the features and any values inside the provided argument source.
  