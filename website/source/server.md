title: SQRL - Running as a Server
---

# Running SQRL as a Server

### Starting 

One way of running SQRL in production is by running it as a stateless server:

```
$ cat > ratelimit.sqrl
LET Ip := input();
LET SqrlMutate := true;
LET Remaining := rateLimit(BY Ip MAX 2 EVERY 30 SECONDS);

CREATE RULE BlockedByRateLimit WHERE Remaining = 0;
WHEN BlockedByRateLimit BLOCK ACTION;

$ ./sqrl serve --port=2288 samples/ratelimit.sqrl
Serving samples/ratelimit.sqrl on port 2288

Note that the server above will store all of its state in-memory. It is **highly** recommended to use a persistent database such as Redis for storing state.

```
$ curl -d '{"RequestIp": "1.2.3.4"}' 'localhost:2288/run?features=BlockedByRateLimit,Remaining&pretty'
{
  "allow": false,
  "verdict": {
    "blockRules": [
      "BlockedByRateLimit"
    ]
  },
  "features": {
    "BlockedByRateLimit": true,
    "Remaining": 0
  }
}
```