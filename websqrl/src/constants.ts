import { EXPERIMENTAL_makeCustomProperties } from "jsxstyle";

// `makeCustomProperties` generates a JS object of CSS variables that can be used in place of style values.
// Variable values can be optionally overridden for each style variant.
export const styleConstants = EXPERIMENTAL_makeCustomProperties({
  boxShadowColor: "#333",
  pageForeground: "#000",
  secondary: "#888",
  pageBackground: "#EEE",
  insetBackground: "#FFF",
  containerOutlineColor: "rgba(0,0,0,0.15)",
  containerRadius: "6px",
})
  .addVariant("darkMode", {
    mediaQuery: "screen and (prefers-color-scheme: dark)",
    boxShadowColor: "#AAA",
    pageForeground: "#FFF",
    secondary: "#AAA",
    pageBackground: "#000",
    insetBackground: "#333",
    containerOutlineColor: "rgba(255,255,255,0.2)",
  })
  .build();

// if we're in dev mode, we'll need to dispose of accumulated styles when this module is hot reloaded
if (process.env.NODE_ENV !== "production") {
  module.hot?.dispose(styleConstants.reset);
}
