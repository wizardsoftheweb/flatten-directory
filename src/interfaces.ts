import * as minimatch from "minimatch";
import * as winston from "winston";

export interface IFlattenDirectoryOptions {
    source?: string;
    target?: string;
    depth?: number;
}

export type TFileCallback = (filename: string) => void;

export type TIncludeThisPathFunction = (filename: string) => boolean;

export interface IWalkOptions {
    root: string;
    callback: TFileCallback;
    logFile?: string;
    maxDepth?: number;
    npmLogLevel?: winston.NPMLoggingLevel;
    exclude?: string[];
    minimatchOptions?: minimatch.IOptions;
    logger?: winston.LoggerInstance;
}
