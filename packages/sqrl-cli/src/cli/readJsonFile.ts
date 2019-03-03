/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { readFile, readFileSync } from "fs";
import { promisify } from "util";
import { CliError } from "./CliError";

const readFileAsync = promisify(readFile);

export async function readJsonFile(path: string) {
  let data: Buffer;
  try {
    data = await readFileAsync(path);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new CliError("Could not find file: " + path);
    } else {
      throw err;
    }
  }

  try {
    return JSON.parse(data.toString("utf-8"));
  } catch (err) {
    throw new CliError("File did not contain JSON-encoded data: " + path);
  }
}

export async function readJsonFileSync(path: string) {
  let data: Buffer;
  try {
    data = readFileSync(path);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new CliError("Could not find file: " + path);
    } else {
      throw err;
    }
  }

  try {
    return JSON.parse(data.toString("utf-8"));
  } catch (err) {
    throw new CliError("File did not contain JSON-encoded data: " + path);
  }
}
