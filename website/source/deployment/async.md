title: Async Queues
---

# Running on an async queue

### Recommendations

You'll often want to rule sets. One for blocking live actions (for example stopping a user from signing up at all), and one for processing actions asynchronously. Since the asynchronous queue will not block the user, you can do a lot more complicated work.

### Creating a Kafka Consumer

It is possible to run SQRL inside a standard queue consumer with Kafka, however you may see issues with this approach as often processing single actions take a large amount of time.

Our recommendation here is to have a separate consumer that farms actions out to individual works and gathers their responses (or timeouts) before committing the messages as processed in Kafka.