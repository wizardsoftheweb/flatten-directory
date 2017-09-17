import * as fs from "fs";
import * as path from "path";

import { DEFAULT_MAXDEPTH } from "./DirectoryWalker";
import {
    IDefaultContainer,
    IErrorMessageContainer,
    IFlattenDirectoryOptions,
    IFlattenDirectoryOptionsValidated,
    keysOfIFlattenDirectoryOptions,
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
 * @class FlattenDirectoryOptions
 */
export class FlattenDirectoryOptions {
    /**
     * Holds default values
     * @type {IDefaultContainer}
     */
    public static DEFAULT: IDefaultContainer = {
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
     * @type {IFlattenDirectoryOptionsValidated}
     */
    public options: IFlattenDirectoryOptionsValidated;

    /**
     * Initializes the logger, assigns options, and validates input.
     *
     * The object has two signatures:
     * ```javascript
     * new FlattenDirectoryOptions(options: IFlattenDirectoryOptions)
     * ```
     * or
     * ```javascript
     * new FlattenDirectoryOptions([source: string[, target: string[, maxdepth: number]]])
     * ```
     * An empty call will load defaults.
     *
     * @param {string | IFlattenDirectoryOptions} source
     * Either the options to use or the path to the source directory
     * @param {string}    target
     * The path to the target directory
     * @param {number}    maxdepth
     * The `maxdepth` to use
     */
    constructor(source?: string | IFlattenDirectoryOptions, target?: string, maxdepth?: number) {
        this.setUpLogger(source);
        logger.info("Parsing options");
        this.options = this.validateOptions(this.assignOptions([source, target, maxdepth]));
        logger.info("Options successfully parsed");
    }

    /**
     * Checks the input for logger options.
     *
     * @param {any} args
     * Either an objecting containing logger options from
     * `IFlattenDirectoryOptions` or something else
     */
    private setUpLogger(args: any = {}): void {
        if (typeof args.silent === "undefined" || args.silent === true) {
            logger.remove("baseLogger" as any);
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
     * @return {IFlattenDirectoryOptions}
     * A complete `IFlattenDirectoryOptions` with default values
     */
    private cleanOptions(options: any = {}): IFlattenDirectoryOptions {
        const cleanedOptions = {} as any;
        for (const key of keysOfIFlattenDirectoryOptions) {
            if (typeof options[key] !== "undefined") {
                logger.silly(`Found option ${key} with value ${options[key]}`);
                cleanedOptions[key] = options[key] as any;
            } else {
                logger.silly(`Using default option ${key} ${FlattenDirectoryOptions.DEFAULT[key.toUpperCase()]}`);
                cleanedOptions[key] = (FlattenDirectoryOptions.DEFAULT[key.toUpperCase()] as any);
            }
        }
        return cleanedOptions;
    }

    private assignOptions(args: any[]): IFlattenDirectoryOptions {
        logger.verbose("Parsing options");
        const options: IFlattenDirectoryOptions = {};
        if (args.length === 1 && typeof args[0] !== "string") {
            return this.cleanOptions(args[0]);
        }
        options.source = args[0] || process.cwd();
        options.target = args[1] || process.cwd();
        options.maxdepth = args[2] || FlattenDirectoryOptions.DEFAULT.MAXDEPTH;
        return options;
    }

    private validateMaxdepth(maxdepth: any): void {
        if (typeof maxdepth !== "number") {
            logger.error(FlattenDirectoryOptions.ERROR_MESSAGES.INVALID_MAXDEPTH);
            throw new TypeError(FlattenDirectoryOptions.ERROR_MESSAGES.INVALID_MAXDEPTH);
        }
    }

    private validatePath(target: string, directory: any): string {
        const absolutePath = path.resolve(directory);
        logger.silly(`Absolute ${target} path is ${absolutePath}`);
        if (fs.lstatSync(absolutePath).isDirectory()) {
            logger.verbose(`Checking ${target === "source" ? "read" : "write"} permission on ${target}`);
            fs.accessSync(
                absolutePath,
                target === "source" ? fs.constants.R_OK : fs.constants.W_OK,
            );
            return absolutePath;
        } else {
            logger.error(target + FlattenDirectoryOptions.ERROR_MESSAGES.INVALID_DIRECTORY);
            throw new Error(target + FlattenDirectoryOptions.ERROR_MESSAGES.INVALID_DIRECTORY);
        }
    }

    private validateOptions(options: IFlattenDirectoryOptions): IFlattenDirectoryOptionsValidated {
        logger.verbose("Validating options");
        this.validateMaxdepth(options.maxdepth);
        options.source = this.validatePath("source", options.source!);
        options.target = this.validatePath("target", options.target!);
        return options as IFlattenDirectoryOptionsValidated;
    }
}
