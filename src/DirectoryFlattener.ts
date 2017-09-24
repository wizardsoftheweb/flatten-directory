import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";

import { DirectoryFlattenerOptions } from "./DirectoryFlattenerOptions";
import { DirectoryWalker } from "./DirectoryWalker";
import {
    IDirectoryFlattenerOptionsValidated,
    IWalkOptions,
    TPromiseLikeCallback,
} from "./interfaces";
import { logger } from "./logger-singleton";

/**
 * This class glues together the primary options and the `DirectoryWalker`
 * options while providing a greatly reduced API.
 *
 * @class DirectoryFlattener
 *
 * @aside `DirectoryWalker` was originally written as a separate module. It's
 * got way more bells and whistles than `flattenDirectory`/`DirectoryFlattener`.
 * I'd like to get some of those in, but it hasn't happened yet.
 * CJH 2017-09-23
 */
export class DirectoryFlattener {
    /** @type {DirectoryFlattenerOptions} Holds the options parser */
    private flattenerOptions: DirectoryFlattenerOptions;
    /** @type {DirectoryWalker} Holds the directory walker */
    private walker: DirectoryWalker;
    /** Promisified `readFile`, exposable for testing */
    private readFile: any = Bluebird.promisify(fs.readFile);
    /** Promisified `writeFile`, exposable for testing */
    private writeFile: any = Bluebird.promisify(fs.writeFile);
    /** Contains (target basename, original path) pairs */
    private writtenFiles: { [basename: string]: string } = {};

    /**
     * Parses the passed-in `flattenDirectory` options and sets up a directory
     * walker.
     *
     * @param {any[]} ...args
     * The passed-in array, hopefully of the form
     * ```
     * [IDirectoryFlattenerOptions]
     * ```
     * or
     * ```
     * [string?, string?, number?]
     * ```
     * @see `DirectoryFlattenerOptions`
     */
    public constructor(...args: any[]) {
        this.flattenerOptions = new (DirectoryFlattenerOptions as any)(...args);
        this.walker = new DirectoryWalker({
            callback: this.copierFactory(this.flattenerOptions.options.target),
            logger,
            maxdepth: this.flattenerOptions.options.maxdepth,
            root: this.flattenerOptions.options.source,
        });
    }

    /**
     * Convenience method to copy the files.
     *
     * @return {PromiseLike<void>}
     * Resolves when the files are copied
     */
    public flatten(): PromiseLike<void> {
        return this.walker.walk();
    }

    /**
     * Creates a simple file I/O `Bluebird` chain to read a file in its source
     * location and copy it to the flattened target location.
     *
     * @param  {string}               target
     * Final file resting place
     * @return {TPromiseLikeCallback}
     * A function that takes a filename as its only argument
     * @todo expose file encoding
     */
    private copierFactory(target: string): TPromiseLikeCallback {
        return (filename: string) => {
            const basename = path.basename(filename);
            if (typeof this.writtenFiles[basename] === "string") {
                logger.warn(`${target}${path.sep}${basename} already written; overwriting with ${filename}`);
            }
            this.writtenFiles[basename] = filename;
            return (this.readFile as any)(filename, "utf8")
                .then((data: any) => {
                    return (this.writeFile as any)(
                        path.join(target, path.basename(filename)),
                        data,
                        "utf8",
                    );
                });
        };
    }
}
