title: Cost Optimisation
---

# Cost Optimisation

In order to reduce cost SQRL allows you to optimize `AND` and `OR` conditions. The function cost data can be generated
in your production environment and passed into the instance.

```
import { createInstance } from "sqrl";
const instance = createInstance({
    functionCost: {
        expensiveFunction: 10000,
        cheapFunction: 35
    },
})
```

Using this data SQRL will calculate a cost for each feature based on the recursive cost of everything it depends on.

For example, in the following code:
```
LET X := expensiveFunction();
LET Y := X + cheapFunction();
LET Z := Y + X;
```

* The cost of `X` will be `10,000` (using the `functionCost`) data above.
* The cost of `Y` will be `10,036` (the cost of the add function defaults to `1`).
* The cost of `Z` will be `10,037`. Depending twice on `X` does not affect its cost, but there is an additional addition that adds `1`.

This data is then used when ordering `AND` or `OR` conditions. Since the order of the parameters does not affect the result in SQRL, we can safely re-order to make the code cheaper and/or faster to run.

For example, given the above code `expensiveFunction() OR cheapFunction()` will be re-ordered to calculate `cheapFunction()` first and _only_ calculate the value of `expensiveFunction()` if it was not truthy.

### Calculating costs in production

It is up to you to determine how much each function costs. One way to do this is to figure out how many requests/day a backend service processes and divide it by the total daily cost of running that service. Functions that are purely CPU-bound can be measured and use an average.