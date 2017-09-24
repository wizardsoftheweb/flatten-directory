import * as minimatch from "minimatch";
import * as winston from "winston";

/**
 * Simple container to hold default values
 */
export interface IDefaultContainer {
    [key: string]: any;
}

/**
 * Simple container to hold error messages
 */
export interface IErrorMessageContainer {
    [key: string]: string;
}

/**
 * Provides an array of the keys in `IDirectoryFlattenerOptions`. TypeScript
 * doesn't provide access to all the keys without some serious extra work.
 * @type {Array}
 * @see [StackOverflow](https://stackoverflow.com/q/30207661)
 */
export const keysOfIDirectoryFlattenerOptions = [
    "source",
    "target",
    "maxdepth",
    "silent",
    "logLevel",
    "encoding",
];

export interface IDirectoryFlattenerOptions {
    source?: string;
    target?: string;
    /**
     * The maximum depth this walker will descend
     * @type {number}
     * @see `man --pager='less -p "-maxdepth levels"' find`
     */
    maxdepth?: number;
    silent?: boolean;
    logLevel?: winston.NPMLoggingLevel;
    encoding?: string;
}

export interface IDirectoryFlattenerOptionsValidated {
    source: string;
    target: string;
    /**
     * The maximum depth this walker will descend
     * @type {number}
     * @see `man --pager='less -p "-maxdepth levels"' find`
     */
    maxdepth: number;
    encoding: string;
    [key: string]: any;
}

export type TPromiseLikeCallback = (filename: string) => PromiseLike<void>;

export type TIncludeThisPathFunction = (filename: string) => boolean;

export interface IWalkOptions {
    root: string;
    callback: TPromiseLikeCallback;
    logFile?: string;
    /**
     * The maximum depth this walker will descend
     * @type {number}
     * @see `man --pager='less -p "-maxdepth levels"' find`
     */
    maxdepth?: number;
    npmLogLevel?: winston.NPMLoggingLevel;
    exclude?: string[];
    minimatchOptions?: minimatch.IOptions;
    logger?: winston.LoggerInstance;
}
