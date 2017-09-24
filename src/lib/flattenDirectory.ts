import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";

import { DirectoryFlattener } from "./DirectoryFlattener";

/**
 * Functional wrapper for `DirectoryFlattener.flatten`. Creates a new instance
 * and immediately calls `flatten`.
 *
 * @param  {any[]}             ...args
 * The args/options to pass to `DirectoryFlattener`
 * @return {PromiseLike<void>}
 * Resolves once the directory is flattened
 */
export function flattenDirectory(...args: any[]): PromiseLike<void> {
    return (new DirectoryFlattener(...args)).flatten();
}
