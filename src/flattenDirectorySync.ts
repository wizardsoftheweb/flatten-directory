import * as fs from "fs";
import * as path from "path";

import { IFlattenDirectoryOptions } from "./interfaces";
import { parseOptions } from "./parseOptions";

export function flattenDirectorySync(...args: any[]): void {
    const options: IFlattenDirectoryOptions = parseOptions(args);
    // do nothing
}
