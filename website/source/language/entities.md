## title: Entities

# Entities

Entities are a core concept of **SQRL**. They represent a single entity that we might want to label, count against, or track in any way. They are represented by the string `<type>/<key>`. For example `Ip/1.2.3.4`, <code>Email/josh&#64;example.com</code>, or `User/1234`.

The first time we see an entity, they are assigned a unique id based on the current time. Creating an entity in the SQRL repl is as easy as running:

```
$ ./sqrl repl
sqrl> LET User := entity('User', '1234')
entity<User/1234> {
  uniqueId<2019-03-01T06:28:44.925Z@1>
}
'1234'
sqrl> User='1234'
true
sqrl> str(date(User))
'2019-03-01T06:28:44.925Z'
```

The value of the `entity()` is the same as the string key, so in the example above `User="1234"` **however** they also have additional properties such as creation time. Running `date(User)` above would give you the timestamp it was created: '2019-03-01T06:28:44.925Z'
