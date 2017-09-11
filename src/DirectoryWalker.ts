import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as minimatch from "minimatch";
import * as path from "path";
import * as winston from "winston";

import {
    IWalkOptions,
    TIncludeThisPathFunction,
    TNodeCallback,
    TPromiseLikeCallback,
} from "./interfaces";

export class DirectoryWalker {
    /** @type {string[]} Default files/directories to exclude */
    public static DEFAULT_EXCLUDE = ["node_modules"];
    /** @type {number} Default depth */
    public static DEFAULT_MAXDEPTH: number = 47;
    /** @type {string} Error message to throw when `options.minimatchOptions.noglobstar` is used */
    public static ERROR_NOGLOBSTAR = "DirectoryWalker depends on glob stars; please remove the noglobstar option";
    /** @type {string} Error message to throw when `options.Logger` is not a `winston.Logger` */
    public static ERROR_NOT_A_WINSTON = `\
logger must be an instance of winston.Logger (i.e. logger instanceof winston.Logger === true)`;

    /** @type {TPromiseLikeCallback} Callback to run on each file */
    private callback: TPromiseLikeCallback;
    /**
     * The maximum depth this walker will descend
     * @type {number}
     * @see `man --pager='less -p "-maxdepth levels"' find`
     */
    private maxdepth: number;
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
     * Validates and assigns options.
     *
     * @param {IWalkOptions} options
     * The `IWalkOptions` object to parse
     * @todo Warn on `maxdepth === 0`
     */
    constructor(options: IWalkOptions) {
        this.validateOrCreateLogger(options);
        this.logger.info("Preparing DirectoryWalker");
        this.rootDirectory = path.normalize(options.root);
        this.callback = Bluebird.promisify(options.callback);
        this.maxdepth = options.maxdepth || DirectoryWalker.DEFAULT_MAXDEPTH;
        this.includeThisFile = this.includeThisFileMethodFactory(options);
    }

    /**
     * Public convenience method to walk the directory and execute the callback.
     * @see `discoverFilesAndExecuteCallback`
     */
    /* istanbul ignore next */
    public walk(): PromiseLike<void> {
        this.logger.info(`Walking ${this.rootDirectory}`);
        return this.discoverFilesAndExecuteCallback()
            .then(() => {
                this.logger.info(`Finished walking ${this.rootDirectory}`);
            })
            .catch((error: any) => {
                this.logger.error(error);
                throw error;
            });
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
            // Don't care about the else option; it's default
            /* istanbul ignore else */
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
            this.logger.warn("Dotfiles will be included as they are ignored in minimatch (dot is false/undefined)");
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

    /**
     * Checks a filename against all the excluded patterns.
     *
     * @param  {string}  filename
     * The path of the file to check
     * @return {boolean}
     * True if there's a hit from `excluded`; false otherwise
     */
    private isExcluded(filename: string): boolean {
        for (const pattern of this.excluded) {
            this.logger.debug(`Testing ${pattern.pattern} against ${filename}`);
            // The else branch is covered outside the for loop
            /* istanbul ignore else */
            if (pattern.match(filename)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Convenience method to check if the provided `depth` is less than or
     * equal to the maximum depth.
     *
     * @param  {number}  depth
     * Directory depth
     * @return {boolean}
     * @see `man --pager='less -p "-maxdepth levels"' find`
     */
    private checkDepth(depth: number): boolean {
        return depth <= this.maxdepth;
    }

    /**
     * Given a Windows path, strip the drive letter (leaving the path relative)
     * and replace all forward slashes with back slashes
     * @param  {string} windowsPath
     * The path to process
     * @return {string}
     * A path that can be interpreted as a relative Posix path.
     */
    private createDummyPosixPath(windowsPath: string): string {
        windowsPath = windowsPath
            // strip leading drive letter and remove root designator
            .replace(/^[^:]*:\\+/, "")
            // convert to Posix directory separator
            .replace(/\\+/g, "/");
        this.logger.silly(`Dummy posix path: ${windowsPath}`);
        return windowsPath;
    }

    /**
     * Combines `checkDepth` and `includeThisFile` into a single return.
     *
     * @param  {string}  filename
     * The path of the file to check
     * @param  {number}  depth
     * The depth of the file to check
     * @return {boolean}
     * True if depth is valid and file is not excluded; false otherwise
     */
    private includeThisFileAtDepth(filename: string, depth: number): boolean {
        return (this.checkDepth(depth)) && this.includeThisFile(filename);
    }

    /**
     * Runs `discoverFiles` on all the files inside `initialPath`.
     *
     * @param  {string}             initialPath
     * The path of the directory to check
     * @param  {number}             depth
     * The depth of the directory to check
     * @return {Bluebird<string[]>}
     * An array containing all the files inside `initialPath`, out to `maxdepth`
     */
    private parseIncludedDirectory(initialPath: string, depth: number): Bluebird<string[]> {
        let foundFiles: string[] = [];
        // Force a synchronous read in case the callback does something wonky
        const contents = fs.readdirSync(initialPath);
        return Bluebird.each(contents, (value: string) => {
            return this
                .discoverFiles(path.join(initialPath, value), depth + 1)
                .then((newFiles: string[]) => {
                    foundFiles = foundFiles.concat(newFiles);
                });
        })
            .then((): string[] => {
                return foundFiles;
            });
    }

    /**
     * Checks to determine the path's type and either parses the directory's
     * contents or returns the filename itself.
     *
     * @param  {string}             initialPath
     * The path of the file to check
     * @param  {number}             depth
     * The depth of the file to check
     * @return {Bluebird<string[]>}
     * If `initialPath` is a directory, an array containing all the files inside
     * `initialPath`, out to `maxdepth`. If `initialPath` is a file, an array
     * containing only `initialPath`. If `initialPath` is neither, returns an
     * empty array.
     */
    private parseIncludedPath(initialPath: string, depth: number): Bluebird<string[]> {
        const stats = fs.lstatSync(initialPath);
        if (stats.isFile()) {
            return Bluebird.resolve([initialPath]);
        } else if (stats.isDirectory()) {
            return this.parseIncludedDirectory(initialPath, depth);
        } else {
            this.logger.warn(`${initialPath} is neither a directory nor a file`);
        }
        return Bluebird.resolve([]);
    }

    private discoverFiles(initialPath: string, depth: number = 0): Bluebird<string[]> {
        if (this.includeThisFileAtDepth(initialPath, depth)) {
            return this.parseIncludedPath(initialPath, depth);
        }
        return Bluebird.resolve([]);
    }

    private executeCallbackOnAllDiscoveredFiles(files: string[]): Bluebird<void> {
        return Bluebird.each(files, this.callback)
            .then((initialFiles: string[]) => {
                // Bluebird.each resolves with the initial array
                return Bluebird.resolve();
            });
    }

    private discoverFilesAndExecuteCallback(): Bluebird<void> {
        return this.discoverFiles(this.rootDirectory)
            .then((discoveredFiles: string[]) => {
                return this.executeCallbackOnAllDiscoveredFiles(discoveredFiles);
            });
    }
}
