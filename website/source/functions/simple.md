title: Simple Functions
---

# Defining simple functions

### Creating a package that uses SQRL

We recommend developing SQRL functions using [TypeScript](https://www.typescriptlang.org). Getting set up with TypeScript is out of scope for this tutorial, but as a prerequisite you should be comfortable running TypeScript code on the command line.

First install the `sqrl` package. We'll also install the `sqrl-cli` package which makes it easy to create a command line application to test with.

```
npm install --save sqrl sqrl-cli
```

Once the packages are installed you can create a basic registration function

```
import {Instance, Execution, AT } from "sqrl-engine"

function registerFunctions(instance: Instance) => {
    instance.register(async function sayHello(state: Execution, name) {
        return 'Hello, ' + name + '!';
    }, {
        args: [AT.state, AT.any]
    })
}
```

Finally `sqrl-cli` exposes a run method that makes testing this out far easier:
```
import { run } from "sqrl-cli";
run({ registerFunctions });
```

Now if you run your TypeScript file, you should get the standard SQRL command line interface with your function included. We use [ts-node](https://github.com/TypeStrong/ts-node) so that you don't have to recompile each time.

```
$ ts-node src/cli.ts repl
sqrl> sayHello("Josh")
'Hello, Josh!'
```