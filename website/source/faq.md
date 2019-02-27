title: FAQ
----

# FAQ

## Why build a new language? Why not just use JS, Haxl, SQL, etc?

See our [motivations and design principles] doc.

## Why does it run on Node.js? Why not compile to native code?

There are three reasons why we chose Node.js.
* SQRL does a lot of I/O and fairly little compute. Node.js shines at these applications.
* Node.js has a rich ecosystem of libraries
* We were already using Node.js for our JS-based rule system and we just built on top of what we already had.

We've been kicking around doing a golang runtime for a while. It's a good idea!

## Who's behind this?

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

## Who's using this?

Twitter, and before that Smyte (and ~40 of their customers).

## What could be better about it?

* The type system
