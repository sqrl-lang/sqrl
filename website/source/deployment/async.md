## title: Sync and Async

# Sync and Async

We recommend most production deployments to have **two** rule sets.

### The sync ruleset

The **sync** ruleset is used to affect live actions. It is evaluated while the user is still waiting for a response, and as such needs to be _fast_. Exactly how fast on what you want your response times to be. A social networks might want less than _100ms_, but in the case of payments even _5000ms_ is acceptable for improved accuracy. Results of rules firing here might mean blocked signups, displaying captchas or phone verification.

For this if your application is written in Node.js you could just `require('sqrl')` directly. For other applications SQRL comes with an out of the box [server deployment](server.html) that you can use as a micro-service.

### The async ruleset

A slower **async** ruleset is used especially when the required response time of the **sync** ruleset is very low. These rules scan events _after_ they have happened and do more complicated analysis. The actions that may be taken here are putting the content up for manual review, and adding labels that the **sync** ruleset may use to block future actions.

Most async implementations use a [message queue deployment](queue.html)
