import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";

import { parseOptions } from "./FlattenDirectoryOptions";
import { IFlattenDirectoryOptions } from "./interfaces";

export function flattenDirectory(...args: any[]): Bluebird<any> {
    const options: IFlattenDirectoryOptions = parseOptions(args);
    // do nothing
    return Bluebird.resolve();
}
