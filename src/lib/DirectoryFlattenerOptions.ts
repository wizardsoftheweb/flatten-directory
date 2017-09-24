import * as fs from "fs";
import * as path from "path";

import { DEFAULT_MAXDEPTH } from "./DirectoryWalker";
import {
    IDefaultContainer,
    IDirectoryFlattenerOptions,
    IDirectoryFlattenerOptionsValidated,
    IErrorMessageContainer,
    keysOfIDirectoryFlattenerOptions,
} from "./interfaces";
import {
    DEFAULT_CONSOLE_TRANSPORT_NAME,
    DEFAULT_LOG_LEVEL,
    logger,
} from "./logger-singleton";

/**
 * This class exists solely to wrap options methods into a test instance without
 * exposing all the individual components.
 *
 * @class DirectoryFlattenerOptions
 */
export class DirectoryFlattenerOptions {
    /**
     * Holds default values
     * @type {IDefaultContainer}
     */
    public static DEFAULT: IDefaultContainer = {
        ENCODING: "utf8",
        LOGLEVEL: DEFAULT_LOG_LEVEL,
        MAXDEPTH: DEFAULT_MAXDEPTH,
        SILENT: true,
        SOURCE: process.cwd(),
        TARGET: process.cwd(),
    };
    /**
     * Holds error messages
     * @type {IErrorMessageContainer}
     */
    public static ERROR_MESSAGES: IErrorMessageContainer = {
        INVALID_DIRECTORY: " must be a directory",
        INVALID_MAXDEPTH: "maxdepth must be a number",
    };

    /**
     * Holds the final options after validation
     * @type {IDirectoryFlattenerOptionsValidated}
     */
    public options: IDirectoryFlattenerOptionsValidated;

    /**
     * Initializes the logger, assigns options, and validates input.
     *
     * The object has two signatures:
     * ```javascript
     * new DirectoryFlattenerOptions(options: IDirectoryFlattenerOptions)
     * ```
     * or
     * ```javascript
     * new DirectoryFlattenerOptions([source: string[, target: string[, maxdepth: number]]])
     * ```
     * An empty call will load defaults.
     *
     * @param {string | IDirectoryFlattenerOptions} source
     * Either the options to use or the path to the source directory
     * @param {string}    target
     * The path to the target directory
     * @param {number}    maxdepth
     * The `maxdepth` to use
     */
    constructor(source?: string | IDirectoryFlattenerOptions, target?: string, maxdepth?: number) {
        this.setUpLogger(source);
        logger.info("Parsing options");
        this.options = this.validateOptions(this.assignOptions(source, target, maxdepth));
        logger.info("Options successfully parsed");
    }

    /**
     * Checks the input for logger options.
     *
     * @param {any} args
     * Either an objecting containing logger options from
     * `IDirectoryFlattenerOptions` or something else
     */
    private setUpLogger(args: any = {}): void {
        if (typeof args.silent === "undefined" || args.silent === true) {
            // ensure transport wasn't previously removed
            /* istanbul ignore else */
            if (typeof logger.transports[DEFAULT_CONSOLE_TRANSPORT_NAME] !== "undefined") {
                logger.remove("baseLogger" as any);
            }
        } else {
            if (typeof args.logLevel !== "undefined") {
                // It's not actually object access via string literals, but whatever
                /* tslint:disable-next-line:no-string-literal */
                logger.transports[DEFAULT_CONSOLE_TRANSPORT_NAME].level = args.logLevel;
                logger.verbose(`Changed log level to ${args.logLevel}`);
            }
        }
    }

    /**
     * Cleans a set of passed-in options, filling in with defaults where
     * necessary.
     *
     * @param  {any}        options
     * The potential options to clean
     * @return {IDirectoryFlattenerOptions}
     * A complete `IDirectoryFlattenerOptions` with default values
     */
    private cleanOptions(options: any = {}): IDirectoryFlattenerOptions {
        const cleanedOptions = {} as any;
        for (const key of keysOfIDirectoryFlattenerOptions) {
            if (typeof options[key] !== "undefined") {
                logger.silly(`Found option ${key} with value ${options[key]}`);
                cleanedOptions[key] = options[key] as any;
            } else {
                logger.silly(`Using default option ${key} ${DirectoryFlattenerOptions.DEFAULT[key.toUpperCase()]}`);
                cleanedOptions[key] = (DirectoryFlattenerOptions.DEFAULT[key.toUpperCase()] as any);
            }
        }
        return cleanedOptions;
    }

    /**
     * Either chooses to clean the options input or assigns defaults
     * @param  {any[]}                    ...args
     * The options or possible input
     * @return {IDirectoryFlattenerOptions}
     * A complete `IDirectoryFlattenerOptions` with default values
     */
    private assignOptions(...args: any[]): IDirectoryFlattenerOptions {
        logger.verbose(`Parsing input and assigning defaults`);
        logger.silly(`Received input "${JSON.stringify(args)}"`);
        const options: IDirectoryFlattenerOptions = {};
        if (typeof args[0] === "object") {
            return this.cleanOptions(args[0]);
        }
        options.source = args[0] || DirectoryFlattenerOptions.DEFAULT.SOURCE;
        options.target = args[1] || DirectoryFlattenerOptions.DEFAULT.TARGET;
        options.maxdepth = args[2] || DirectoryFlattenerOptions.DEFAULT.MAXDEPTH;
        // If we've made it this far, the encoding wasn't specified
        options.encoding = DirectoryFlattenerOptions.DEFAULT.ENCODING;
        return options;
    }

    /**
     * Ensures `maxdepth` is a number. Warns if negative.
     *
     * @param {any} maxdepth
     * Value to validate
     * @throws TypeError if `maxdepth` is not a number
     */
    private validateMaxdepth(maxdepth: any): void {
        if (typeof maxdepth !== "number") {
            logger.error(DirectoryFlattenerOptions.ERROR_MESSAGES.INVALID_MAXDEPTH);
            throw new TypeError(DirectoryFlattenerOptions.ERROR_MESSAGES.INVALID_MAXDEPTH);
        }
        if (maxdepth < 0) {
            logger.warn(`Negative maxdepth (${maxdepth}) will find zero files`);
        }
    }

    /**
     * Validates the `directory` path for the `target`. Returns the absolute
     * path via `path.resolve`.
     *
     * @param  {"source" | "target"} target
     * Is this running on the source or target input?
     * @param  {any}    directory
     * A path, not necessarily absolute, to a directory
     * @return {string}
     * The absolute path to the target directory
     * @see `path.resolve`
     * @see [lstat errors](http://man7.org/linux/man-pages/man2/lstat.2.html#ERRORS)
     * @todo test if `lstat` catches i/o access on a `chmod`able system
     */
    private validatePath(target: "source" | "target", directory: any): string {
        const absolutePath = path.resolve(directory);
        logger.silly(`Absolute ${target} path is ${absolutePath}`);
        if (fs.lstatSync(absolutePath).isDirectory()) {
            logger.verbose(`Checking ${target === "source" ? "read" : "write"} permission on ${target}`);
            // lstat contains a check for search permissions, but maybe not i/o
            fs.accessSync(
                absolutePath,
                target === "source" ? fs.constants.R_OK : fs.constants.W_OK,
            );
            return absolutePath;
        } else {
            logger.error(target + DirectoryFlattenerOptions.ERROR_MESSAGES.INVALID_DIRECTORY);
            throw new Error(target + DirectoryFlattenerOptions.ERROR_MESSAGES.INVALID_DIRECTORY);
        }
    }

    /**
     * Validates the given options and returns only the options necessary to
     * execute `flattenDirectory`.
     *
     * @param  {IDirectoryFlattenerOptions}          options
     * Parsed options, either those passed in or the defaults
     * @return {IDirectoryFlattenerOptionsValidated}
     * A validated set of options that may immediately be used in
     * `flattenDirectory`
     * @see `flattenDirectory`
     */
    private validateOptions(options: IDirectoryFlattenerOptions): IDirectoryFlattenerOptionsValidated {
        logger.verbose("Validating options");
        this.validateMaxdepth(options.maxdepth);
        options.source = this.validatePath("source", options.source!);
        options.target = this.validatePath("target", options.target!);
        return options as IDirectoryFlattenerOptionsValidated;
    }
}
