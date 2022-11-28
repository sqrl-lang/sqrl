## title: Queue consumer

# Deploying SQRL as a queue consumer

If you're already using a queue such as [Kafka](https://kafka.apache.org), [Amazon SQS](https://aws.amazon.com/sqs/) or one of hundreds of similar products you can link SQRL directly to that.

Running off a queue your SQRL execution is [asynchronous](async.html) — meaning the event is not blocked waiting for the result of the execution. This means you can afford to do a much deeper analysis without holding up the client waiting to post their comment or signup. These executions can take as long as they want, though the average we've seen is five to thirty seconds.

Many queueing systems, like Kafka, function best when your messages are very quick to process and can't divvy up work effectively given the long runtimes SQRL often sees. The solution we found at Smyte was to have a separate consumer (we called the "Action Scheduler") that reads a batch of messages from Kafka and divides them among a number of worker machines. This scheduler is then responsible for committing the batch of results to Kafka, and handling timeouts where appropriate.
