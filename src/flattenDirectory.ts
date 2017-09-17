import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";

import { IFlattenDirectoryOptions } from "./interfaces";
import { parseOptions } from "./parseOptions";

export function flattenDirectory(...args: any[]): Bluebird<any> {
    const options: IFlattenDirectoryOptions = parseOptions(args);
    // do nothing
    return Bluebird.resolve();
}
