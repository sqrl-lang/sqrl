title: Async Queues
---

# Running on an async queue

Production deployments of rule systems often have **two** rule sets.

The **sync** ruleset is used to affect live actions. It is evaluated while the user is still waiting for a response, and as such needs to be *fast*. Exactly how fast on what you want your response times to be. A social networks might want less than *100ms*, but in the case of payments even *5000ms* is acceptable for improved accuracy. Results of rules firing here might mean blocked signups, displaying captchas or phone verification.

A slower **async** ruleset is used especially when the required response time of the **sync** ruleset is very low. These rules scan events *after* they have happened and do more complicated analysis. The actions that may be taken here are putting the content up for manual review, and adding labels that the **sync** ruleset may use to block future actions.

### SQRL Kafka Consumers

It is possible to run SQRL inside a standard queue consumer with Kafka, however you may see issues with this approach as often processing single actions take a large amount of time. Our recommendation here is to have a separate event scheduler that consumes from Kafka, farms the work out to a number of different workers and then gathers their responses (or timeouts) before committing the results back to Kafka.