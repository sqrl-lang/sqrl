# How to Contribute

We'd love to get patches from you!

## Getting Started

Once you've got a copy of the source, running `npm i` will install all the dependencies.

## Building the Project

`npm run build` will build the entire project.

To assist in development `npm run watch` will continually update as any changes
are made.

## Workflow

We follow the [GitHub Flow Workflow](https://guides.github.com/introduction/flow/)

### TODO: Below is an Example

1.  Fork the project
2.  Check out the `master` branch
3.  Create a feature branch
4.  Write code and tests for your change
5.  From your branch, make a pull request against `sqrl-lang/sqrl/master`
6.  Work with repo maintainers to get your change reviewed
7.  Wait for your change to be pulled into `sqrl-lang/sqrl/master`
8.  Delete your feature branch

## Testing

We use the `jest` test runner. `npm run test` will run all of our test cases.

There are additional integration tests which require additional services. These
test cases can be run with `npm run test:integration` and require several
environment variables to be set up to complete successfully:

- TEST_REDIS: Address of a redis server for use by the test run

## Style

All of our source files are automatically formatted using `prettier`. To format
all files simply run `npm run format`.

There are additional rules that are taken care of by `tslint`. `npm run lint`
will alert you to any style issues on that front.

## Issues

When creating an issue please try to ahere to the following format:

    module-name: One line summary of the issue (less than 72 characters)

    ### Expected behavior

    As concisely as possible, describe the expected behavior.

    ### Actual behavior

    As concisely as possible, describe the observed behavior.

    ### Steps to reproduce the behavior

    List all relevant steps to reproduce the observed behavior.

## Pull Requests

Comments should be formatted to a width no greater than 80 columns.

Files should be exempt of trailing spaces.

We adhere to a specific format for commit messages. Please write your commit
messages along these guidelines. Please keep the line width no greater than 80
columns (You can use `fmt -n -p -w 80` to accomplish this).

    module-name: One line description of your change (less than 72 characters)

    Problem

    Explain the context and why you're making that change.  What is the problem
    you're trying to solve? In some cases there is not a problem and this can be
    thought of being the motivation for your change.

    Solution

    Describe the modifications you've done.

    Result

    What will change as a result of your pull request? Note that sometimes this
    section is unnecessary because it is self-explanatory based on the solution.

Some important notes regarding the summary line:

- Describe what was done; not the result
- Use the active voice
- Use the present tense
- Capitalize properly
- Do not end in a period — this is a title/subject
- Prefix the subject with its scope

## Documentation

We also welcome improvements to the project documentation or to the existing
docs. Please file an [issue](https://github.com/sqrl-lang/sqrl/issues).

# License

By contributing your code, you agree to license your contribution under the
terms of the APLv2: https://github.com/sqrl-lang/sqrl/blob/master/LICENSE

# Code of Conduct

Read our [Code of Conduct](CODE_OF_CONDUCT.md) for the project.
