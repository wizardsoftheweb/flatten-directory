import * as fs from "fs";
import * as path from "path";

import { DEFAULT_MAXDEPTH } from "./DirectoryWalker";
import {
    IFlattenDirectoryOptions,
    IFlattenDirectoryOptionsValidated,
    keysOfIFlattenDirectoryOptions,
} from "./interfaces";
import {
    DEFAULT_LOG_LEVEL,
    logger,
} from "./logger-singleton";

interface IDefaultContainer {
    [key: string]: any;
}

interface IErrorMessageContainer {
    [key: string]: string;
}

export class FlattenDirectoryOptions {
    public static DEFAULT: IDefaultContainer = {
        LOGLEVEL: DEFAULT_LOG_LEVEL,
        MAXDEPTH: DEFAULT_MAXDEPTH,
        SILENT: true,
        SOURCE: process.cwd(),
        TARGET: process.cwd(),
    };
    public static ERROR_MESSAGES: IErrorMessageContainer = {
        INVALID_DIRECTORY: " must be a directory",
        INVALID_MAXDEPTH: "maxdepth must be a number",
    };

    public options: IFlattenDirectoryOptionsValidated;

    constructor(args: any = {}) {
        this.setUpLogger(args);
        logger.info("Parsing options");
        this.options = this.validateOptions(this.assignOptions([].concat(args)));
        logger.info("Options successfully parsed");
    }

    private setUpLogger(args: any): void {
        if (typeof args.silent === "undefined" || args.silent === true) {
            logger.remove("baseLogger" as any);
        } else {
            if (typeof args.logLevel !== "undefined") {
                // It's not actually object access via string literals, but whatever
                /* tslint:disable-next-line:no-string-literal */
                logger.transports["baseLogger"].level = args.logLevel;
                logger.verbose(`Changed log level to ${args.logLevel}`);
            }
        }
    }

    private cleanOptions(args: any): IFlattenDirectoryOptions {
        const cleanedOptions = {} as any;
        for (const key of keysOfIFlattenDirectoryOptions) {
            if (typeof args[key] !== "undefined") {
                logger.silly(`Found option ${key} with value ${args[key]}`);
                cleanedOptions[key] = args[key] as any;
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

export function parseOptions(args: any): IFlattenDirectoryOptionsValidated {
    const optionsParser = new FlattenDirectoryOptions(args);
    return optionsParser.options;
}
