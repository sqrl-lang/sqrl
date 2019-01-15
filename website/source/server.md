
## HTTP API Server (using Docker databases)

```
$ source ./scripts/setup-sqrl-db-local-docker-env.sh
$ ./sqrl serve --port=2288 samples/ratelimit.sqrl
Serving samples/ratelimit.sqrl on port 2288

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