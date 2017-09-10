import * as fs from "fs";
import * as minimatch from "minimatch";
import * as path from "path";
import * as winston from "winston";

import { IWalkOptions, TFileCallback, TIncludeThisPathFunction } from "./interfaces";

export class DirectoryWalker {
    /** @type {string[]} Default files/directories to exclude */
    public static DEFAULT_EXCLUDE = ["node_modules"];
    /** @type {number} Default depth */
    public static DEFAULT_DEPTH: number = 47;
    /** @type {string} Error message to throw when `options.minimatchOptions.noglobstar` is used */
    public static ERROR_NOGLOBSTAR = "DirectoryWalker depends on glob stars; please remove the noglobstar option";
    /** @type {string} Error message to throw when `options.Logger` is not a `winston.Logger` */
    public static ERROR_NOT_A_WINSTON = `\
logger must be an instance of winston.Logger (i.e. logger instanceof winston.Logger === true)`;

    /** @type {TFileCallback} Callback to run on each file */
    private callback: TFileCallback;
    /** @type {number} The maximum depth this walker will descend */
    private maxDepth: number;
    /** @type {string} The normalized root path */
    private rootDirectory: string;
    /** @type {winston.LoggerInstance} The logger to use */
    private logger: winston.LoggerInstance;

    /** @type {minimatch.IMinimatch[]} The array (possibly empty) of all minimatch patterns */
    private excluded: minimatch.IMinimatch[] = [];
    /**
     * Checks whether or not an individual path should be included.
     * @param {string} filename
     * Path to run against `excluded`
     * @returns {boolean}
     * False if the file matches anything in `excluded`; true otherwise
     */
    private includeThisFile: TIncludeThisPathFunction;

    /**
     * [constructor description]
     * @param {IWalkOptions} options [description]
     */
    constructor(options: IWalkOptions) {
        this.validateOrCreateLogger(options);
        this.logger.info("Preparing DirectoryWalker");
        this.rootDirectory = path.normalize(options.root);
        this.callback = options.callback;
        this.maxDepth = options.maxDepth || DirectoryWalker.DEFAULT_DEPTH;
        this.includeThisFile = this.includeThisFileMethodFactory(options);
    }

    /**
     * Public convenience method to walk the directory.
     * @see `recursiveWalkAndCall`
     */
    /* istanbul ignore next */
    public walk(): void {
        this.logger.info(`Walking ${this.rootDirectory}`);
        this.recursiveWalkAndCall(this.rootDirectory);
        this.logger.info(`Finished walking ${this.rootDirectory}`);
    }

    /**
     * Validates the injected walker by running `instanceof`. If extra log
     * options are set, warns that they will be ignored
     * @param {IWalkOptions} options
     * `IWalkOptions` from the `constructor`
     */
    private validateInjectedLogger(options: IWalkOptions): void {
        if (options.logger instanceof winston.Logger) {
            this.logger = options.logger;
            if (typeof options.logFile !== "undefined" || typeof options.npmLogLevel !== "undefined") {
                this.logger.warn(
                    "Log files (logFile) and levels (npmLogLevel) are ignored when an instance is passed in",
                );
            }
        } else {
            throw new Error(DirectoryWalker.ERROR_NOT_A_WINSTON);
        }
    }

    /**
     * Simple switch method to either validate a passed-in `logger` or create a
     * new instance.
     *
     * @param {IWalkOptions} options
     * `IWalkOptions` from the `constructor`
     */
    private validateOrCreateLogger(options: IWalkOptions) {
        if (typeof options.logger !== "undefined") {
            this.validateInjectedLogger(options);
        } else {
            this.logger = this.buildLoggerInstance(options);
        }
    }

    /**
     * Constructs a `winston.Logger` instance using the given options.
     *
     * @param  {IWalkOptions}           options
     * `IWalkOptions` from the `constructor`
     * @return {winston.LoggerInstance}
     * A new `winstonLogger` with the specified transports
     */
    private buildLoggerInstance(options: IWalkOptions): winston.LoggerInstance {
        const winstonOptions: winston.LoggerOptions = {};
        winstonOptions.transports = [];
        if (typeof options.logFile !== "undefined") {
            winstonOptions.transports.push(
                new (winston.transports.File)({
                    filename: options.logFile,
                    silent: true,
                    timestamp: true,
                }),
            );
        }
        if (typeof options.npmLogLevel !== "undefined") {
            winstonOptions.level = options.npmLogLevel;
            winstonOptions.transports.push(
                new (winston.transports.Console)({
                    colorize: true,
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    timestamp: true,
                }),
            );
        }
        return new (winston.Logger)(winstonOptions);
    }

    /**
     * Accepts any filename as an included file.
     *
     * @param  {string}  filename
     * The path of the file to check
     * @return {boolean}
     * Always true
     */
    private includeThisFileAlwaysTrue(filename: string): boolean {
        return true;
    }

    /**
     * Checks the given filename against the list of exclusions.
     *
     * @param {string} filename
     * The path of the file to check
     * @return {boolean}
     * True if the file is not excluded; false otherwise
     */
    private includeThisFilePosix(filename: string): boolean {
        return !this.isExcluded(filename);
    }

    /**
     * Converts the given Windows path to a dummy Posix path and checks it
     * against the list of exclusions.
     *
     * @param  {string}  filename
     * The path of the file to check
     * @return {boolean}
     * True if the file is not excluded; false otherwise
     */
    private includeThisFileWindows(filename: string): boolean {
        return this.includeThisFilePosix(this.createDummyPosixPath(filename));
    }

    /**
     * Returns the correct `includeThisFile` method based on the options.
     *
     * @param  {IWalkOptions}             options [description]
     * `IWalkOptions` from the `constructor`
     * @return {TIncludeThisPathFunction}
     * The correct inclusion method
     */
    private includeThisFileMethodFactory(options: IWalkOptions): TIncludeThisPathFunction {
        const exclude = options.exclude || [];
        if (exclude.length < 1) {
            this.logger.verbose("No excludes found; all files included");
            return this.includeThisFileAlwaysTrue;
        }
        this.logger.verbose("Generating minimatch pattern from excludes");
        const minimatchOptions = options.minimatchOptions || {};
        if (minimatchOptions.noglobstar === true) {
            this.logger.error(DirectoryWalker.ERROR_NOGLOBSTAR);
            throw new Error(DirectoryWalker.ERROR_NOGLOBSTAR);
        }
        if (minimatchOptions.dot !== true) {
            this.logger.warn("Dotfiles will be included as they are not checked in minimatch (dot is false/undefined)");
        }
        // Prepends the root directory (with glob stars) to each exclude
        this.generateExcludePatterns(exclude, minimatchOptions);
        if (/win/.test(process.platform)) {
            return this.includeThisFileWindows;
        }
        return this.includeThisFilePosix;
    }

    /**
     * Populates the `excluded` array with `minimatch` instances corresponding
     * to each element of the passed-in array.
     *
     * @param {string[]}           exclude
     * Array of patterns to exclude
     * @param {minimatch.IOptions} options
     * Options to pass through to each `minimatch` instance
     */
    private generateExcludePatterns(exclude: string[], options?: minimatch.IOptions): void {
        this.logger.verbose("Prepending **/ to all excluded paths");
        this.excluded = exclude.map((value: string) => {
                return new minimatch.Minimatch(`**/${value}`);
        });
    }

    private isExcluded(filename: string): boolean {
        for (const pattern of this.excluded) {
            this.logger.debug(`Testing ${pattern.pattern} against ${filename}`);
            if (pattern.match(filename)) {
                return true;
            }
        }
        return false;
    }

    private checkDepth(depth: number): boolean {
        return depth <= this.maxDepth;
    }

    private createDummyPosixPath(windowsPath: string): string {
        windowsPath = windowsPath
            // strip leading drive letter and remove root designator
            .replace(/^.*:\\+/, "")
            // convert to Posix directory separator
            .replace(/\\+/g, "/");
        this.logger.silly(`Dummy posix path: ${windowsPath}`);
        return windowsPath;

    }

    private recursiveWalkAndCall(initialPath: string, depth: number = -1): void {
        if (this.checkDepth(depth)) {
            if (this.includeThisFile(initialPath)) {
                const stats = fs.lstatSync(initialPath);
                if (stats.isDirectory()) {
                    this.logger.verbose(`${initialPath} is a directory; recursing`);
                    // Force a synchronous read in case the callback does something wonky
                    const contents = fs.readdirSync(initialPath);
                    for (const file of contents) {
                        this.recursiveWalkAndCall(path.join(initialPath, file), depth + 1);
                    }
                } else if (stats.isFile()) {
                    this.logger.verbose(`Executing the callback on ${initialPath}`);
                    this.callback(initialPath);
                } else {
                    this.logger.warning(`${initialPath} is neither a directory nor a file`);
                }
            } else {
                this.logger.verbose(`${initialPath} is excluded`);
            }
        } else {
            this.logger.verbose(`${initialPath} is outside the maximum depth`);
        }
        return;
    }

}
