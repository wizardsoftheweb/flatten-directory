// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
/* tslint:disable-next-line:no-var-requires */
const mlog = require("mocha-logger");

const should = chai.should();

import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

const rmrf = Bluebird.promisify(rimraf);

const fsBluebird: any = Bluebird.promisifyAll(fs, { suffix: "Bluebird" });

import { flattenDirectory } from "../src/flattenDirectory";

// @todo test other files
describe("Verbose flattenDirectory Integration", (): void => {
    const tmpDirectory: string = path.join(__dirname, ".flattenTmp");
    const sourceDirectory: string = path.join(tmpDirectory, "source");
    const children = ["one", "two", "three", "four"];
    const directories: string[] = [];
    for (let count = 1; count <= children.length; count++) {
        directories.push(path.join(sourceDirectory, ...children.slice(0, count)));
    }
    const sourceFiles: string[] = directories.reduce((files: string[], directory: string) => {
        const newFiles = [1, 2, 3].map((value: number) => {
            const filename = `${path.basename(directory)}File${value}`;
            // could store target file here too, but I wanted to separate the logic
            return path.join(directory, filename);
        });
        newFiles.push(path.join(directory, `.${path.basename(directory)}Dotfile`));
        return files.concat(newFiles);
    }, []);
    const targetDirectory: string = path.join(tmpDirectory, "target");
    const targetFiles: string[] = sourceFiles.map((filename: string) => {
        return path.join(targetDirectory, path.basename(filename));
    });
    const targetValues: { [key: string]: string } = {};

    before((): Bluebird<any> => {
        mlog.pending("Starting setup");
        return clean()
            .then(() => {
                return Bluebird.each(
                    [tmpDirectory, sourceDirectory, targetDirectory].concat(directories),
                    (directory: string) => {
                        mlog.log(`Creating ${directory.replace(__dirname + path.sep, "") + path.sep}`);
                        return fsBluebird.mkdirBluebird(directory);
                    },
                );
            })
            .then(() => {
                return Bluebird.each(sourceFiles, writeRandom);
            })
            .then(() => {
                mlog.success("Finished setup");
            });
    });

    it("should copy all source files to the target directory", (): Bluebird<any> => {
        return (flattenDirectory(sourceDirectory, targetDirectory) as any)
            .then(() => {
                return fsBluebird.readdirBluebird(targetDirectory);
            })
            .map((filename: string) => {
                return path.join(targetDirectory, filename);
            })
            .each((filename: string) => {
                return fsBluebird.readFileBluebird(filename, "utf8")
                    .then((contents: string) => {
                        mlog.log(`Found ${contents} in ${filename.replace(__dirname + path.sep, "")}`);
                        contents.should.equal(targetValues[filename]);
                    });
            })
            .then((files: string[]) => {
                for (const filename of targetFiles) {
                    files.indexOf(filename).should.be.above(-1);
                }
            });
    }).timeout(5000);

    after((): Bluebird<void> => {
        mlog.pending("Starting teardown");
        return clean()
            .then(() => {
                mlog.success("Finished teardown");
                return Bluebird.resolve();
            });
    });

    function writeRandom(filename: string): Bluebird<void> {
        const contents = Math.random().toFixed(5);
        mlog.log(`Writing ${contents} to ${filename.replace(__dirname + path.sep, "")}`);
        targetValues[path.join(targetDirectory, path.basename(filename))] = contents;
        return fsBluebird.writeFileBluebird(filename, contents, "utf8");
    }

    function clean(): Bluebird<void> {
        mlog.log(`Removing ${tmpDirectory.replace(__dirname + path.sep, "") + path.sep} (if exists)`);
        return rmrf(tmpDirectory)
            .then(() => {
                return Bluebird.resolve();
            });
    }
});
