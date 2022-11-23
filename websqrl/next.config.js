// @ts-check

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const assert = require("assert");

module.exports = {
  reactStrictMode: true,
  webpack: (
    /** @type {import('webpack').Configuration} */
    config,
    { isServer }
  ) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      // the require for this module is wrapped in a try/catch, so it can fail without causing issues
      "sqrl-test-utils": false,
      "re2": false,
    };

    assert(config.module?.rules);
    config.module.rules.push({
      test: /\.sqrl$/,
      type: "asset/source",
    });

    // Disable code optimization, SQRL uses function names
    assert(config.optimization);
    config.optimization.minimize = false

    const oneOfRule = config.module.rules.find(
      /** @returns {rule is import('webpack').RuleSetRule} */
      (rule) => typeof rule === "object" && !!rule.oneOf
    );
    assert(oneOfRule?.oneOf);

    oneOfRule.oneOf.forEach((r) => {
      if (r.issuer?.and?.[0]?.toString().includes("_app")) {
        r.issuer = [
          { and: r.issuer.and },
          /[\\/]node_modules[\\/]monaco-editor[\\/]/,
        ];
      }
    });

    assert(config.plugins, "no plugins array");
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["cpp"],
          filename: "static/[name].worker.js",
          publicPath: "_next",
        })
      );
    }
    return config;
  },
};
