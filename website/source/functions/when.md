title: When Cause Functions
---

# When cause functions

One of the advantages of using a rules language like **SQRL** is that the actions taken by the system can easily be explained and understood.

```
CREATE RULE SimilarTextIpSpam WHERE
  rateLimited(BY TextSimhash MAX 10 EVERY MINUTE)
  WITH REASON "Used similar text (${TextSimhash}) more than ten times in a single minute.";

WHEN SimilarTextIpSpam THEN addUserToReviewQueue("spam");
```

The function `addUserToReviewQueue` does not exist in the standard library, but if you were implementing it you can access the rules that triggered the call and their reasons.

In the case above the cause may be:
```
{
  "firedRules": [{
    "name": "SimilarTextIpSpam",
    "reason": "Used similar text (cf112e11) more than ten times in a single minute."
  }]
}
```

### Creating Statements with WHEN causes

```
registry.registerStatement(
  "SqrlReviewQueueStatements",
  async function addUserToReviewQueue(
    state: Execution,
    cause: WhenCause,
    queue: string
  ) {
    // Add to the queue somehow, and save the rule reason string.
  },
  {
    args: [
      AT.state,
      AT.whenCause,
      AT.any.string
    ],
    allowNull: true
  }
);
```

Your `addUserToReviewQueue` function will be provided with additional context about why it was triggered. For more information about exactly what is included see the [`WhenCause`](https://twitter.github.io/sqrl/reference/interfaces/_when_.whencause.html) reference documentation.