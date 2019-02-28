import chalk from "chalk";
import { FunctionRegistry, STANDARD_LIBRARY } from "sqrl";

interface FunctionDescriptions {
  [func: string]: string;
}

export function renderFunctionsHelp(functionRegistry: FunctionRegistry) {
  const stdlib: {
    [name: string]: FunctionDescriptions;
  } = {};
  const packages: {
    [name: string]: FunctionDescriptions;
  } = {};
  for (const [name, props] of Object.entries(
    functionRegistry._wrapped.functionProperties
  ).sort()) {
    if (!name.startsWith("_")) {
      let args = "";
      if (typeof props.argstring === "string") {
        args = `${chalk.yellow("(")}${props.argstring}${chalk.yellow(")")}`;
      }

      let docstring = chalk.gray("<no docstring provided>");
      if (props.docstring) {
        docstring = props.docstring.split("\n")[0];
      }

      const description = `${chalk.bold.yellow(name)}${args}${chalk.grey(
        ":"
      )} ${docstring}`;

      const group = props.package.startsWith(STANDARD_LIBRARY + ".")
        ? stdlib
        : packages;
      group[props.package] = group[props.package] || {};
      group[props.package][name] = description;
    }
  }

  const renderPackageHelp = (
    group: string,
    name: string,
    descs: FunctionDescriptions
  ) => {
    let output = chalk.bold.white(name) + " " + chalk.blue(`(${group})`) + "\n";
    for (const func of Object.keys(descs).sort()) {
      output += "  " + descs[func] + "\n";
    }
    return output.trimRight();
  };

  return [
    ...Object.keys(stdlib)
      .sort()
      .map(pkg => {
        return renderPackageHelp("stdlib", pkg, stdlib[pkg]);
      }),
    ...Object.keys(packages)
      .sort()
      .map(pkg => {
        return renderPackageHelp("package", pkg, packages[pkg]);
      })
  ].join("\n\n");
}
