## title: REPL

# REPL

### Trying out the REPL

Once you start getting a feel for SQRL and want to try play around in realtime, a REPL is included

```
$ ./sqrl repl
sqrl> LET ActionData := {"name": "hi", "user_id": "1.2.3.4"};
{ name: 'hi', user_id: '1.2.3.4' }
sqrl> LET ActionName := jsonValue(ActionData, "$.name")
'hi'
sqrl> LET UserId := jsonValue(ActionData, "$.user_id")
'1234'
sqrl > LET User := entity('User', UserId)
entity<User/1234> {
  uniqueId<2019-01-18T03:58:57.834Z@1>
}
sqrl> printSource(ActionName);
function() {
  const f0 = () =>
    bluebird.resolve(functions.attr(this.slots["ActionData"].value(), "name"));
  return this.load("ActionData").then(f0);
}
```

### Run some rules on Wikipedia

To see a real life use case, check out the [next example](wikipedia.html)
