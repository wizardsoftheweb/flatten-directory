import * as minimatch from "minimatch";
import * as winston from "winston";


/**
 * Provides an array of the keys in `IFlattenDirectoryOptions`. TypeScript
 * doesn't provide access to all the keys without some serious extra work.
 * @type {Array}
 * @see [StackOverflow](https://stackoverflow.com/questions/30207661/in-typescript-is-there-a-compile-time-way-to-get-all-the-property-names-defin)
 */
export const IFlattenDirectoryOptionsKeys = ["source", "target", "depth"];

export interface IFlattenDirectoryOptions {
    source?: string;
    target?: string;
    depth?: number;
}

export type TNodeCallback = (filename: string, done: (...firstArgIsError: any[]) => void) => void;

export type TPromiseLikeCallback = (filename: string) => PromiseLike<void>;

export type TIncludeThisPathFunction = (filename: string) => boolean;

export interface IWalkOptions {
    root: string;
    callback: TNodeCallback | TPromiseLikeCallback;
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
