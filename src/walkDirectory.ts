import * as fs from "fs";
import * as path from "path";

import {IFileCallback, IWalkOptions} from "./interfaces";

const MAX_DEPTH = 100;

// function walkDirectoryRecursively()

export function walkDirectory(options: IWalkOptions): void {
    const {directoryPath, callback, maxDepth = MAX_DEPTH, exclude = []} = options;

    function checkDepth(depth: number) {
        return depth <= maxDepth;
    }
}
