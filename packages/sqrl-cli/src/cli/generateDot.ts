import { isValidFeatureName, Context, CompiledExecutable } from "sqrl";
import { DefaultDict } from "../jslib/DefaultDict";

interface Options {
  includeCost?: boolean;
  reverseEdges?: boolean;
  clusterRules?: boolean;
  clusterFeatures?: boolean;
  fillColor?: string;
  includeSlots?: boolean;
}
interface FeatureEdges {
  [feature: string]: Set<string>;
}
interface FeatureNode {
  name: string;
  feature: boolean;
  rule: boolean;
  cost: number;
  recursiveCost: number;
}

export function generateDotFile(
  ctx: Context,
  compiled: CompiledExecutable,
  features: string[] = [],
  depends: string[] = [],
  ignore: string[] = [],
  options: Options = {
    clusterFeatures: false,
    clusterRules: false,
    includeCost: false,
    reverseEdges: false,
    fillColor: "",
    includeSlots: false
  }
) {
  const {
    includeCost,
    includeSlots,
    reverseEdges,
    clusterRules,
    clusterFeatures
  } = options;
  const ignoreSet = new Set(ignore);
  const nodes: {
    [name: string]: FeatureNode;
  } = {};

  const forward: FeatureEdges = new DefaultDict(() => new Set());
  const reverse: FeatureEdges = new DefaultDict(() => new Set());

  // First add all the slots and dependencies
  const slotNames = compiled.getSlotNames();
  const slotLoad = compiled.getSlotLoad();
  slotNames.forEach((slotName, idx) => {
    slotLoad[idx].forEach(loadIdx => {
      const feature = slotNames[loadIdx];
      forward[slotName].add(feature);
      reverse[feature].add(slotName);
    });

    nodes[slotName] = {
      name: slotName,
      feature: false,
      rule: false,
      cost: 0,
      recursiveCost: 0
    };
  });

  // Add proper nodes for rules/features
  Object.entries(compiled.getFeatureDocs()).forEach(([name, doc]) => {
    nodes[name] = {
      name,
      feature: true,
      rule: false,
      cost: doc.cost,
      recursiveCost: doc.recursiveCost
    };
  });

  Object.entries(compiled.getRuleSpecs()).forEach(([name, spec]) => {
    nodes[name].rule = true;
  });

  function recurse(
    name: string,
    edges: FeatureEdges,
    recurseSeen: Set<string>
  ) {
    if (ignoreSet.has(name)) {
      return;
    } else if (!nodes.hasOwnProperty(name)) {
      // This is caused by everything that isn't a feature (SmyteWhenStatements/etc.)
      ctx.warn({}, "Missing node for dot file:: %s", name);
      return;
    }
    recurseSeen.add(name);
    edges[name].forEach(feature => recurse(feature, edges, recurseSeen));
  }

  const seen: Set<string> = new Set();
  const seenDepends: Set<string> = new Set();
  for (const feature of features) {
    recurse(feature, forward, seen);
  }
  for (const feature of depends) {
    recurse(feature, reverse, seenDepends);
  }

  const render = new Set([...seen, ...seenDepends]);

  let rv = `digraph features {\n`;

  const renderNodes = Array.from(render)
    .sort()
    .filter(name => !ignoreSet.has(name))
    .map(name => nodes[name]);

  /*
  const maxCost = Math.max(...renderNodes.map(node => node.recursiveCost));
  const minCost = Math.min(...renderNodes.map(node => node.recursiveCost));
  */
  function quoteName(name: string) {
    return isValidFeatureName(name) ? name : JSON.stringify(name);
  }
  function nodesToDot(
    filteredNodes: FeatureNode[],
    color: string,
    subgraph: string
  ) {
    let nodesDot = filteredNodes
      .map(node => {
        let label = node.name;

        if (!includeSlots && !isValidFeatureName(node.name)) {
          return `${quoteName(
            node.name
          )} [label="" style="filled" color="#aaaaaa" fillcolor="#eeeeee"];\n`;
        }

        if (includeCost) {
          label += "\n$" + node.recursiveCost.toFixed(2);
          label = label.trim();
        }
        const fill = "#ffffff";
        const style = "";
        /* @todo: Requires `color` module
        if (fillColor === "cost" && maxCost > 0) {
          // Go from red=>green on HSV scale
          const v = (node.recursiveCost - minCost) / (maxCost - minCost);
          style = "filled";
          fill = Color.hsv(120 * (1 - v), 100, 100).hex();
        } */
        return `${quoteName(node.name)} [label=${JSON.stringify(
          label
        )} color="${color}" style=${JSON.stringify(
          style
        )} fillcolor=${JSON.stringify(fill)}];\n`;
      })
      .join("");
    if (subgraph) {
      nodesDot = `subgraph ${subgraph} {\n${nodesDot}}\n`;
    }
    return nodesDot;
  }

  rv += nodesToDot(
    renderNodes.filter(node => node.rule),
    "red",
    clusterRules ? "cluster_rules" : null
  );
  rv += nodesToDot(
    renderNodes.filter(node => !node.rule),
    "blue",
    clusterFeatures ? "cluster_features" : null
  );

  renderNodes.forEach(node => {
    Array.from(forward[node.name])
      .sort()
      .forEach(feature => {
        if (render.has(feature) && !ignoreSet.has(feature)) {
          if (reverseEdges) {
            rv += `${quoteName(node.name)} -> ${quoteName(feature)};\n`;
          } else {
            rv += `${quoteName(feature)} -> ${quoteName(node.name)};\n`;
          }
        }
      });
  });
  rv += `}\n`;
  return rv;
}
