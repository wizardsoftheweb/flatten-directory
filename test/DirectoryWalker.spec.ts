// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
import * as sinon from "sinon";

const expect = chai.expect;
const should = chai.should();

import * as minimatch from "minimatch";
import * as path from "path";
import * as winston from "winston";

import { DirectoryWalker } from "../src/DirectoryWalker";
import { IWalkOptions, TFileCallback, TIncludeThisPathFunction } from "../src/interfaces";

interface IStubObject {
    [key: string]: sinon.SinonStub;
}

describe("DirectoryWalker", (): void => {
    let normalizeStub: sinon.SinonStub;
    let joinStub: sinon.SinonStub;

    const error: sinon.SinonStub = sinon.stub();
    const warn: sinon.SinonStub = sinon.stub();
    const info: sinon.SinonStub = sinon.stub();
    const verbose: sinon.SinonStub = sinon.stub();
    const debug: sinon.SinonStub = sinon.stub();
    const silly: sinon.SinonStub = sinon.stub();
    const mockLogger: { [key: string]: sinon.SinonStub }
        = { error, warn, info, verbose, debug, silly };
    const realLogger = new (winston.Logger)();

    let prototypeLoggerStub: sinon.SinonStub;

    let validateStub: sinon.SinonStub;
    let includeStub: sinon.SinonStub;

    const callback: sinon.SinonStub = sinon.stub();

    const basicOptions: IWalkOptions = {
        callback,
        root: "root/directory",
    };
    let specificWalkOptions: IWalkOptions;
    const exclusions = ["file1/to/exclude", "file2/to/exclude"];

    let walker: DirectoryWalker;

    beforeEach((): void => {
        stubLogger();
        validateStub = sinon
            .stub(DirectoryWalker.prototype as any, "validateOrCreateLogger");
        includeStub = sinon
            .stub(DirectoryWalker.prototype as any, "includeThisFileMethodFactory");
        newDirectoryWalker();
        specificWalkOptions = {} as any;
        Object.assign(specificWalkOptions, basicOptions);
    });

    describe("constructor", (): void => {
        beforeEach((): void => {
            stubPath();
            newDirectoryWalker();
        });

        it("should assign its logger", (): void => {
            validateStub.called.should.be.true;
        });

        it("should generate its inclusion factory", (): void => {
            includeStub.called.should.be.true;
        });

        it("should assign normalize the root path", (): void => {
            normalizeStub.called.should.be.true;
        });

        it("should assign default maxDepth with nothing passed in", (): void => {
            (walker as any).maxdepth.should.equal(DirectoryWalker.DEFAULT_MAXDEPTH);
        });

        afterEach((): void => {
            restorePath();
        });
    });

    describe("validateInjectedLogger", (): void => {
        it("should ensure the logger is a winston.Logger", (): void => {
            specificWalkOptions.logger = "" as any;
            (walker as any).validateInjectedLogger.bind(walker, specificWalkOptions)
                .should.throw(DirectoryWalker.ERROR_NOT_A_WINSTON);
            specificWalkOptions.logger = realLogger;
            (walker as any).validateInjectedLogger.bind(walker, specificWalkOptions)
                .should.not.throw;
        });

        it("should warn if a log path is passed in", (): void => {
            specificWalkOptions.logFile = "qqq";
            specificWalkOptions.logger = realLogger;
            (walker as any).validateInjectedLogger(specificWalkOptions);
            warn.called.should.be.true;
        });

        it("should warn if a log level is passed in", (): void => {
            specificWalkOptions.npmLogLevel = "silly";
            specificWalkOptions.logger = realLogger;
            (walker as any).validateInjectedLogger(specificWalkOptions);
            warn.called.should.be.true;
        });
    });

    describe("validateOrCreateLogger", (): void => {
        let validateLoggerStub: sinon.SinonStub;
        let buildStub: sinon.SinonStub;

        beforeEach((): void => {
            validateStub.restore();
            validateLoggerStub = sinon.stub(walker as any, "validateInjectedLogger");
            buildStub = sinon
                .stub(walker as any, "buildLoggerInstance")
                .returns(realLogger);
        });

        it("should ensure the logger is a winston.Logger", (): void => {
            specificWalkOptions.logger = realLogger;
            (walker as any).validateOrCreateLogger(specificWalkOptions);
            validateLoggerStub.called.should.be.true;
        });

        it("should warn if other log options are set", (): void => {
            (walker as any).validateOrCreateLogger(specificWalkOptions);
            buildStub.called.should.be.true;
        });

        afterEach((): void => {
            validateStub.restore();
            buildStub.restore();
        });
    });

    describe("buildLoggerInstance", (): void => {
        let constructorStub: sinon.SinonStub;
        let fileStub: sinon.SinonStub;
        let consoleStub: sinon.SinonStub;
        let loggerStub: sinon.SinonStub;

        beforeEach((): void => {
            constructorStub = sinon.stub()
                .callsFake((input: any) => {
                    /* tslint:disable-next-line:no-construct */
                    return { from: input.filename || "Console" };
                });
            fileStub = sinon.stub(winston.transports as any, "File")
                .get(() => {
                    return constructorStub;
                });
            consoleStub = sinon.stub(winston.transports as any, "Console")
                .get(() => {
                    return constructorStub;
                });
            loggerStub = sinon.stub(winston, "Logger")
                .returns({});
        });

        it("should default to an empty logger", (): void => {
            (walker as any).buildLoggerInstance(specificWalkOptions);
            constructorStub.called.should.be.false;
            loggerStub.calledOnce.should.be.true;
            const call = loggerStub.getCall(0);
            call.args.should.be.an("array").that.is.not.empty;
            const args = call.args[0];
            args.transports.should.be.an("array").that.is.empty;
        });

        it("should add a file transport if a path is included", (): void => {
            specificWalkOptions.logFile = "File";
            (walker as any).buildLoggerInstance(specificWalkOptions);
            loggerStub.calledOnce.should.be.true;
            const call = loggerStub.getCall(0);
            call.args.should.be.an("array").that.is.not.empty;
            const args = call.args[0];
            args.transports.should.be.an("array").of.length(1);
            args.transports[0].should.deep.equal({ from: "File" });
        });

        it("should add a console transport if a level is included", (): void => {
            specificWalkOptions.npmLogLevel = "silly";
            (walker as any).buildLoggerInstance(specificWalkOptions);
            loggerStub.calledOnce.should.be.true;
            const call = loggerStub.getCall(0);
            call.args.should.be.an("array").that.is.not.empty;
            const args = call.args[0];
            args.transports.should.be.an("array").of.length(1);
            args.transports[0].should.deep.equal({ from: "Console" });
        });

        afterEach((): void => {
            fileStub.restore();
            consoleStub.restore();
            loggerStub.restore();
        });
    });

    describe("includeThisFile", (): void => {
        let excludedStub: sinon.SinonStub;
        let posixPath: sinon.SinonStub;

        let posixInclude: sinon.SinonStub;
        let windowsInclude: sinon.SinonStub;
        let alwaysInclude: sinon.SinonStub;

        beforeEach((): void => {
            excludedStub = sinon.stub(walker as any, "isExcluded");
            posixPath = sinon.stub(walker as any, "createDummyPosixPath")
                .returns("posix");
        });

        describe("AlwaysTrue", (): void => {
            it("should always be true", (): void => {
                (walker as any).includeThisFileAlwaysTrue()
                    .should.be.true;
                (walker as any).includeThisFileAlwaysTrue(Math.random())
                    .should.be.true;
                (walker as any).includeThisFileAlwaysTrue("qqq")
                    .should.be.true;
            });
        });

        describe("Posix", (): void => {
            it("should check exclusions", (): void => {
                (walker as any).includeThisFilePosix("posix");
                excludedStub.calledOnce.should.be.true;
                excludedStub.calledWith("posix").should.be.true;
            });
        });

        describe("Windows", (): void => {
            beforeEach((): void => {
                posixInclude = sinon.stub(walker as any, "includeThisFilePosix");
            });

            it("should convert to a dummy posix path", (): void => {
                (walker as any).includeThisFileWindows("windows");
                posixPath.calledOnce.should.be.true;
                posixPath.calledWith("windows").should.be.true;
            });

            it("should check exclusions", (): void => {
                (walker as any).includeThisFileWindows("windows");
                posixInclude.calledOnce.should.be.true;
                posixInclude.calledWith("posix").should.be.true;
            });

            afterEach((): void => {
                posixInclude.restore();
            });
        });

        describe("MethodFactory", (): void => {
            let platformStub: sinon.SinonStub;
            let generateStub: sinon.SinonStub;

            const filename = "input/filename";

            beforeEach((): void => {
                includeStub.restore();
                platformStub = sinon.stub(process as any, "platform")
                    .get((): string => {
                        return "linux";
                    });
                generateStub = sinon.stub(walker as any, "generateExcludePatterns");
                posixInclude = sinon.stub(walker as any, "includeThisFilePosix")
                    .get(() => {
                        return (): string => {
                            return "posix";
                        };
                    });
                windowsInclude = sinon.stub(walker as any, "includeThisFileWindows")
                    .get(() => {
                        return (): string => {
                            return "windows";
                        };
                    });
                alwaysInclude = sinon.stub(walker as any, "includeThisFileAlwaysTrue")
                    .get(() => {
                        return (): string => {
                            return "always";
                        };
                    });
                specificWalkOptions.exclude = exclusions;
            });

            it("should return AlwaysTrue without exclusions", (): void => {
                specificWalkOptions.exclude = null as any;
                const include = (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                (include as any)(filename).should.equal("always");
            });

            it("should generate exclude patterns with exclusions", (): void => {
                (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                generateStub.calledOnce.should.be.true;
                generateStub.calledWith(exclusions).should.be.true;
            });

            it("should return the Posix method for most systems", (): void => {
                const include = (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                include(filename).should.equal("posix");
            });

            it("should return the Windows method for Windows machines", (): void => {
                platformStub.get((): string => {
                    return "win32";
                });
                const include = (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                include(filename).should.equal("windows");
            });

            it("should throw an error if globstars are switched off", (): void => {
                specificWalkOptions.minimatchOptions = {
                    noglobstar: true,
                };
                (walker as any).includeThisFileMethodFactory
                .bind(walker, specificWalkOptions)
                .should.throw(DirectoryWalker.ERROR_NOGLOBSTAR);
            });

            it("should warn if dotfiles are not checked", (): void => {
                specificWalkOptions.minimatchOptions = {
                    dot: true,
                };
                (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                warn.called.should.be.false;
                specificWalkOptions.minimatchOptions.dot = false;
                (walker as any).includeThisFileMethodFactory(specificWalkOptions);
                warn.calledOnce.should.be.true;
            });

            afterEach((): void => {
                platformStub.restore();
                generateStub.restore();
                posixInclude.restore();
                windowsInclude.restore();
                alwaysInclude.restore();
            });
        });

        afterEach((): void => {
            excludedStub.restore();
            posixPath.restore();
        });
    });

    describe("generateExcludePatterns", (): void => {
        it("should create a minimatch for each exclusion", (): void => {
            (walker as any).generateExcludePatterns(exclusions);
            const excluded = (walker as any).excluded;
            excluded.should.be.an("array").of.length(2);
            excluded.should.deep.equal(exclusions.map((value: string) => {
                return new minimatch.Minimatch(`**/${value}`);
            }));
        });
    });

    describe("isExcluded", (): void => {
        it("should return true for excluded files", (): void => {
            (walker as any).excluded = exclusions.map((value: string) => {
                return new minimatch.Minimatch(`**/${value}`);
            });
            (walker as any).isExcluded(exclusions[0]).should.be.true;
        });

        it("should return false for files that are not excluded", (): void => {
            (walker as any).isExcluded(exclusions[0]).should.be.false;
        });
    });

    describe("checkDepth", (): void => {
        it("should check depth against maxdepth", (): void => {
            let depth = DirectoryWalker.DEFAULT_MAXDEPTH - 10;
            (walker as any).checkDepth(depth).should.be.true;
            depth = DirectoryWalker.DEFAULT_MAXDEPTH + 1;
            (walker as any).checkDepth(depth).should.be.false;
        });
    });

    describe("createDummyPosixPath", (): void => {
        const windowsPath = "C:\\directory\\subdirectory\\file.ext";
        const desiredPath = path.posix.parse("directory/subdirectory/file.ext");

        it("should strip the drive designator if it exists", (): void => {
            const dummy = (walker as any).createDummyPosixPath(windowsPath);
            /^directory/.test(dummy).should.be.true;
        });

        it("should replace forward slashes with back slashes", (): void => {
            const dummy = (walker as any).createDummyPosixPath(windowsPath);
            dummy.split("/").length.should.equal(3);
        });

        it("should parse to the desired path", (): void => {
            const dummy = (walker as any).createDummyPosixPath(windowsPath);
            path.parse(dummy).should.deep.equal(desiredPath);
        });
    });

    afterEach((): void => {
        restoreLogger();
        validateStub.restore();
        includeStub.restore();
        walker = null as any;
    });

    function stubLogger(): void {
        for (const stub in mockLogger) {
            if (mockLogger.hasOwnProperty(stub)) {
                (mockLogger[stub] as any).reset();
            }
        }
        prototypeLoggerStub = sinon
            .stub(DirectoryWalker.prototype as any, "logger")
            .get(() => {
                return mockLogger;
            })
            .set((value: any) => {
                // do nothing
            });
    }

    function restoreLogger(): void {
        prototypeLoggerStub.restore();
    }

    function stubPath(pathToReturn: string = "qqq"): void {
        normalizeStub = sinon.stub(path, "normalize").returns(pathToReturn);
        joinStub = sinon.stub(path, "join").returns(pathToReturn);
    }

    function restorePath(): void {
        normalizeStub.restore();
        joinStub.restore();
    }

    function newDirectoryWalker(options: IWalkOptions = basicOptions): void {
        callback.reset();
        walker = new DirectoryWalker(options);
    }
});
