#!/usr/bin/env python3
"""
Copyright 2019 Twitter, Inc.
Licensed under the Apache License, Version 2.0
http://www.apache.org/licenses/LICENSE-2.0
"""
"""
Generates initial documentation pages from SQRL function definitions

Usage: `./sqrl help functions --output=json | ./website/build_functions.py`
"""
import itertools
import json
import os
import re
import sys

website = os.path.dirname(__file__)

data = json.load(sys.stdin)
data.sort(key=lambda f: (not f["package"].startswith("sqrl."), f["package"]))


def read_intro(path):
    """
    Reads the introduction out of the documentation page so that we can
    maintain it when we rewrite the file
    """
    try:
        contents = open(path, "r").read()
    except FileNotFoundError:
        return ""

    match = re.search(r"\n# [^\n]*\n(.*?)\n## ", contents, re.MULTILINE | re.DOTALL)
    if match and match.group(1).strip():
        return match.group(1).strip() + "\n\n"
    else:
        return ""


def write_docs(folder, name, title, functions):
    path = os.path.join(website, "source/%s/%s.md" % (folder, name))
    intro = read_intro(path)

    with open(path, "w") as f:
        f.write("title: %s\n---\n\n# %s\n\n%s" % (title, title, intro))
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
        name = package[len("sqrl.") :]
        title = "%s Functions" % (name[:1].upper() + name[1:])
        write_docs("stdlib", name, title, functions)
    else:
        write_docs("packages", package, package, functions)
