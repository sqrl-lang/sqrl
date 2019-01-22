title: REPL
---

# REPL

### Trying out the REPL

Once you start getting a feel for SQRL and want to try play around in realtime, a REPL is included

```
$ ./sqrl repl
sqrl> LET ActionData := {"name": "hi"};
{ name: 'hi' }
sqrl> LET ActionName := jsonValue(ActionData, "$.name")
'hi'
sqrl> printSource(ActionName);
function() {
  const f0 = () =>
    bluebird.resolve(functions.attr(this.slots["ActionData"].value(), "name"));
  return this.load("ActionData").then(f0);
}
```

### Run some rules on Wikipedia

To see a real life use case, check out the [next example](wikipedia.html)