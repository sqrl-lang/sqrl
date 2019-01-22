title: Nodes
---

# Nodes

Nodes are a core concept of **SQRL**. They represent a single entity that we might want to label, count against, or track in any way. They are represented by the string &lt;type&gt;/&lt;key&gt;. For example `Ip/1.2.3.4`, `Email/josh@example.com`, or `User/1234`.

The first time we see a node, they are assigned a unique id based on the current time. Creating a node in the SQRL repl is as easy as running:

```
$ ./sqrl repl
sqrl> LET User := node('User', '1234')
node<User/1234> {
  uniqueId<2019-01-18T03:58:57.834Z@1>
}
'1234'
```

The value of the `node()` is the same as the string key, so in the example above `User="1234"` **however** they also have additional properties such as creation time. Running `iso8601(User)` above would give you the timestamp it was created: '2019-01-18T03:58:57.834Z'