// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
import * as sinon from "sinon";

const expect = chai.expect;
const should = chai.should();

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

        it("should assign its logger", (): any => {
            validateStub.called.should.be.true;
        });

        it("should generate its inclusion factory", (): any => {
            includeStub.called.should.be.true;
        });

        it("should assign normalize the root path", (): any => {
            normalizeStub.called.should.be.true;
        });

        it("should assign default maxDepth with nothing passed in", (): any => {
            (walker as any).maxDepth.should.equal(DirectoryWalker.DEFAULT_DEPTH);
        });

        afterEach((): void => {
            restorePath();
        });
    });

    describe("validateInjectedLogger", (): void => {
        it("should ensure the logger is a winston.Logger", (): any => {
            specificWalkOptions.logger = "" as any;
            (walker as any).validateInjectedLogger.bind(walker, specificWalkOptions)
                .should.throw(DirectoryWalker.ERROR_NOT_A_WINSTON);
            specificWalkOptions.logger = realLogger;
            (walker as any).validateInjectedLogger.bind(walker, specificWalkOptions)
                .should.not.throw;
        });

        it("should warn if a log path is passed in", (): any => {
            specificWalkOptions.logFile = "qqq";
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

        it("should ensure the logger is a winston.Logger", (): any => {
            specificWalkOptions.logger = realLogger;
            (walker as any).validateOrCreateLogger(specificWalkOptions);
            validateLoggerStub.called.should.be.true;
        });

        it("should warn if other log options are set", (): any => {
            (walker as any).validateOrCreateLogger(specificWalkOptions);
            buildStub.called.should.be.true;
        });

        afterEach((): void => {
            validateStub.restore();
            buildStub.restore();
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
