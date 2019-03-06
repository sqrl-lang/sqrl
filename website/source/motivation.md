title: Motivation
----

# SQRL Motivation and Design Principles

Smyte was a company that prevented spam, abuse, and fraud on some of the world's largest websites and mobile apps. We were eventually purchased by Twitter and the service was shut down. By the end, SQRL -- the Smyte Query and Rules Language -- was protecting over 150m monthly active users. Tens of thousands of lines of SQRL were running on thousands of events per second and were maintained by almost 50 customers over the course of 3 years. It lives on today inside of Twitter at an even larger scale.

Like most startups, we began with the simplest and cheapest solution: we let our customers write their rules in JavaScript. This worked for a while, but led to a number of issues:
* **Maintainability.** Rules rapidly change and are often maintained by non-programmers, so the codebase quickly became a mess.
* **Auditability.** It was difficult to understand why a rule fired after the fact, since the JS code grew to be very complex.
* **Performance and cost.** The rules often had to query multiple databases and downstream services, and we couldn't control the latency vs cost trade-off without editing our customer's code (which we often didn't understand).
* **Safety.** It was easy for rule authors to make a mistake and exhaust CPU or storage resources.

A few of us are ex-Facebook, so we knew that [Haxl](https://github.com/facebook/Haxl), a Haskell dialect, solved some of these issues. However, we had to empower our customers -- many of whom barely knew SQL, much less JavaScript or Haskell -- to be able to write and maintain rules, so Haxl was out.

We eventually built a prototype of the language that became SQRL, and ported the tens of thousands of lines of JS written by our customers over to this new language. From day 1 we were eating our own dogfood.

**So why did we build SQRL?** There wasn't an existing solution that was powerful enough to solve the problems our customers had (for example, a lot of alternatives are stateless) and was safe enough to put in the hands of a bunch of nonprogrammers at third parties.

## Guiding principles

### 1. It should never take down the site.

* SQRL does not have loops or recursion and therefore does not have the halting problem.
* SQRL talks to downstream services and data stores in a declarative way, making it difficult -- if not impossible -- to overload dependent services.
* SQRL expressions may be eagerly or lazily evaluated as decided by the runtime, meaning that latency vs cost trade-offs can be tweaked over time without changing the rules.
* SQRL fails gracefully. When an error occurs in a subexpression, the rule can often still partially complete. In cases where it can't, SQRL fails open.
* SQRL can be given a latency budget and will stick to it.
* SQRL executes in a secure sandbox and is appropriate for multitenant applications.

### 2. It should look like SQL.

* SQRL should be readable by anyone. For example, lawyers often want to audit which rules are running, and customer success reps want to know why a particular transaction was declined or user was actioned.
* SQRL should be writable by anyone who barely knows SQL or Excel.
* SQRL is dynamically typed.
* Stateful features -- like counters, rate limiters, blacklists, etc -- should be expressed declaratively rather than imperatively.

### 3. It should be easy to understand why a rule fired.

* Rules have associated docstrings that can be rendered in a GUI.
* SQRL can be statically analyzed.
* SQRL is pure, which means you can replay rules later and capture the output as well as all of the side effects.
* SQRL does not have user-defined functions, nor does it have a call stack.

### 4. It needs to be "flexible enough".

* SQRL needs to fulfill the day-to-day needs of our spam, abuse, and fraud-fighting customers without changing the language or standard library.
* SQRL needs to be able to deployed quickly enough to mitigate an ongoing incident.
* It should take just a few minutes to wire up new event types.
* SQRL needs to be portable to other runtimes.
* Features defined in SQRL should be usable for machine learning and other applications.
* It should be easy for engineers to integrate new downstream services.
