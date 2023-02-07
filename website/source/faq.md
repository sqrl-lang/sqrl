title: FAQ
----

# FAQ

### Why build a new language? Why not just use JS, Haxl, SQL, etc?

See our [motivations and design principles](motivation.html) doc.

### Why does it run on Node.js? Why not compile to native code?

There are three reasons why we chose Node.js.
* SQRL does a lot of I/O and fairly little compute. Node.js shines at these applications.
* Node.js has a rich ecosystem of libraries.
* We were already using Node.js for our JS-based rule system and we just built on top of what we already had.

We've been kicking around doing a golang runtime for a while. It's a good idea!

### Is this production ready?

**Yes**, and **no**. The compiler and language implementation was built and Smyte and battle-tested for a couple of years. There were some changes in order to extract it from the Smyte source code, but in general we are confident on the stability of that piece.

The **sqrl-redis-functions** package on the other hand was rewritten for this release and has not seen production testing. At Smyte we had separate databases based on RocksDB that powered `count()`, `countUnique()` and `rateLimit()`. The new implementations on top of redis were primarily intended as proof of concept and there is a lot of room for improvement. That said they do _work_ and are a good starting point.

## How do I run this?

If your project already uses Node.js you can simply `require('sqrl')`. You could then use SQRL to decide whether to accept/reject comments, signups, payments or anything you want really.

We have included a [micro-service server](deployment/server.html) that you can call out to from any other language, and for asynchronous processing we recommend running SQRL as a [event stream consumer](deployment/queue.html).

### Who's behind this?

SQRL was designed and implemented by:
* Josh Yudaken
* Pete Hunt
* Julian Tempelsman
* Paul Mou
* Yunjing Xu
* David Newman

It would not have come together without lots of dogfooding and suggestions from:
* Jonathan Root
* Alana Glassco
* Jason Wu

We also want to thank Twitter Engineering for helping us get this project released.

### Who's using this?

Twitter, and before that Smyte (and ~40 of their customers).

### What could be better about it?

* The type system
