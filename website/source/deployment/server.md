title: Running as a Server
---

# Running SQRL as a Server

### Starting 

One way of running SQRL in production is by running it as a stateless server:

```
$ cat > ratelimit.sqrl
LET Ip := input();
LET Remaining := rateLimit(BY Ip MAX 2 EVERY 30 SECONDS);

CREATE RULE BlockedByRateLimit WHERE Remaining = 0;
WHEN BlockedByRateLimit BLOCK ACTION;

$ ./sqrl serve --port=2288 examples/ratelimit.sqrl
Serving examples/ratelimit.sqrl on port 2288
```

Once your server is up and running, it will serve traffic over HTTP. You can test it out with the `curl` command line tool, sending it a sample request from the IP address **1.2.3.4**:

```
$ curl -d '{"RequestIp": "1.2.3.4"}' \
    -H "Content-Type: application/json" \
    'localhost:2288/run?features=BlockedByRateLimit,Remaining&pretty'
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

### State storage and scalability
 
By default the command line tool stores all state in memory. Enabling [Redis](../examples/redis.html) (or any external database) state storage will give you a stateless server that you can scale horizontally.

### Sync and Async Paths
 
We recommend running every event through two separate SQRL configurations. Read our [Async](async.html) deployment documentation for more information.