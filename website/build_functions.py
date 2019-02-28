#!/usr/bin/env python3
'''
Generates initial documentation pages from SQRL function definitions

Usage: `./sqrl help functions --output=json | ./website/build_functions.py`
'''
import itertools
import json
import os
import sys

website = os.path.dirname(__file__)

data = json.load(sys.stdin)
data.sort(key=lambda f: (not f["package"].startswith("sqrl."), f["package"]))


def write_docs(folder, name, functions):
    title = "%s Functions" % (name[:1].upper() + name[1:])
    with open(os.path.join(website, "source/%s/%s.md" % (folder, name)), "w") as f:
        f.write("title: %s\n---\n\n# %s\n\n" % (title, title))
        for props in sorted(functions, key=lambda p: p["name"]):
            f.write(
                "## %(name)s\n\n**%(name)s**(%(argstring)s)\n\n%(docstring)s\n\n"
                % props
            )

    print("      - text: %s" % title)
    print("        type: link")
    print("        path: %s/%s.html" % (folder, name))


for package, functions in itertools.groupby(data, lambda f: f["package"]):
    if package.startswith("sqrl."):
        write_docs("stdlib", package[len("sqrl.") :], functions)
    else:
        write_docs("packages", package, functions)
