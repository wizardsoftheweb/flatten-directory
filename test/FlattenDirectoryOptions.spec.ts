// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

const should = chai.should();
chai.use(sinonChai);

import * as fs from "fs";
// import * as path from "path";
import * as winston from "winston";

import {
    IFlattenDirectoryOptions,
    IFlattenDirectoryOptionsValidated,
    keysOfIFlattenDirectoryOptions,
} from "../src/interfaces";

import {
    loggerStub,
    resetLoggerStub,
} from "./stubs/logger-singleton";

const baseLogger = "baseLogger";
const resolveStub = sinon.stub();

const FlattenDirectoryOptions = proxyquire("../src/FlattenDirectoryOptions", {
    "./logger-singleton": {
        DEFAULT_CONSOLE_TRANSPORT_NAME: baseLogger,
        logger: loggerStub,
    },
    /* tslint:disable-next-line:object-literal-key-quotes */
    "path": {
        "@noCallThru": true,
        resolve: resolveStub,
    },
}).FlattenDirectoryOptions;

describe("FlattenDirectoryOptions", (): void => {

    let optionsParser: any;
    let setupStub: sinon.SinonStub;
    let validateStub: sinon.SinonStub;
    let assignStub: sinon.SinonStub;

    beforeEach((): void => {
        setupStub = sinon
            .stub(FlattenDirectoryOptions.prototype as any, "setUpLogger");
        validateStub = sinon
            .stub(FlattenDirectoryOptions.prototype as any, "validateOptions")
            .returns({});
        assignStub = sinon
            .stub(FlattenDirectoryOptions.prototype as any, "assignOptions");
        optionsParser = new FlattenDirectoryOptions();
    });

    describe("constructor", (): void => {
        it("should set up the logger", (): void => {
            setupStub.should.be.calledOnce;
        });

        it("should assign and validate options", (): void => {
            assignStub.should.be.calledOnce;
            validateStub.should.be.calledAfter(assignStub);
        });
    });

    describe("setUpLogger", (): void => {
        const notALogLevel = "not a real log level";
        beforeEach((): void => {
            setupStub.restore();
            (loggerStub as any).transports = {};
            (loggerStub as any).transports[baseLogger] = {
                level: notALogLevel,
            };
            resetLoggerStub();
        });

        it("should remove the logger by default", (): void => {
            (optionsParser as any).setUpLogger();
            loggerStub.remove.should.have.been.calledOnce;
        });

        it("should remove the logger with the silent option", (): void => {
            (optionsParser as any).setUpLogger({ silent: true });
            loggerStub.remove.should.have.been.calledOnce;
        });

        it("should change the log level if one is passed in", (): void => {
            const logLevel = "qqq";
            (optionsParser as any).setUpLogger({ logLevel, silent: false });
            loggerStub.remove.should.not.have.been.called;
            (loggerStub as any).transports[baseLogger].level.should.equal(logLevel);
        });

        it("should do nothing with silent === true and no logLevel", (): void => {
            (optionsParser as any).setUpLogger({ silent: false });
            loggerStub.remove.should.not.have.been.called;
            (loggerStub as any).transports[baseLogger].level.should.equal(notALogLevel);
        });

        afterEach((): void => {
            delete (loggerStub as any).transports;
        });
    });

    describe("cleanOptions", (): void => {
        it("should assign defaults without input", (): void => {
            const options = (optionsParser as any).cleanOptions();
            for (const key of keysOfIFlattenDirectoryOptions) {
                options[key].should.deep.equal(FlattenDirectoryOptions.DEFAULT[key.toUpperCase()]);
            }
        });

        it("should use passed-in options when available", (): void => {
            const sampleOptions = { silent: false, maxdepth: 0 };
            const options = (optionsParser as any).cleanOptions(sampleOptions);
            for (const key of keysOfIFlattenDirectoryOptions) {
                if (sampleOptions.hasOwnProperty(key)) {
                    options[key].should.deep.equal((sampleOptions as any)[key]);
                } else {
                    options[key].should.deep.equal(FlattenDirectoryOptions.DEFAULT[key.toUpperCase()]);
                }
            }
        });
    });

    describe("assignOptions", (): void => {
        let cleanStub: sinon.SinonStub;

        beforeEach((): void => {
            assignStub.restore();
            cleanStub = sinon.stub(optionsParser as any, "cleanOptions");
        });

        it("should call cleanOptions on args that look like objects", (): void => {
            (optionsParser as any).assignOptions({ silent: false });
            cleanStub.should.have.been.calledOnce;
        });

        it("should call cleanOptions on null (not undefined) source", (): void => {
            (optionsParser as any).assignOptions(null);
            cleanStub.should.have.been.calledOnce;
        });

        it("should assign defaults without parameters", (): void => {
            const options = (optionsParser as any).assignOptions();
            options.source.should.deep.equal(FlattenDirectoryOptions.DEFAULT.SOURCE);
            options.target.should.deep.equal(FlattenDirectoryOptions.DEFAULT.TARGET);
            options.maxdepth.should.deep.equal(FlattenDirectoryOptions.DEFAULT.MAXDEPTH);
        });

        afterEach((): void => {
            cleanStub.restore();
        });
    });

    describe("validateMaxdepth", (): void => {
        beforeEach(resetLoggerStub);

        it("should throw when maxdepth is not a number", (): void => {
            (optionsParser as any).validateMaxdepth.bind(optionsParser, "not a number")
                .should.throw(FlattenDirectoryOptions.DEFAULT.INVALID_MAXDEPTH);
        });

        it("should do nothing when maxdepth is a number", (): void => {
            (optionsParser as any).validateMaxdepth(47);
            loggerStub.warn.should.not.have.been.called;
        });

        it("should warn on negative maxdepth", (): void => {
            (optionsParser as any).validateMaxdepth(-2);
            loggerStub.warn.should.have.been.calledOnce;
        });
    });

    describe("validatePath", (): void => {
        const isDirectory = sinon.stub();
        let lstatStub: sinon.SinonStub;
        let accessStub: sinon.SinonStub;

        const absolutePath = "/absolute";
        const badPath = "bad path";
        const goodPath = "good path";
        const notADirectory = "path/to/a/file";
        const isADirectory = "path/to/directory";
        const badPermissions = "no/i/o";
        const goodPermissions = "yes/i/o";

        beforeEach((): void => {
            validateStub.restore();
            resolveStub.reset();
            resolveStub.returns(absolutePath);
            resolveStub.withArgs(badPath).throws();
            isDirectory.reset();
            isDirectory.returns(true);
            lstatStub = sinon.stub(fs, "lstatSync");
            lstatStub.returns({ isDirectory });
            lstatStub.withArgs(notADirectory).throws();
            accessStub = sinon.stub(fs, "accessSync");
            accessStub.withArgs(badPermissions).throws();
        });

        it("should propogate Node errors", (): void => {
            // path doesn't resolve
            (optionsParser as any).validatePath.bind(optionsParser, "source", badPath)
                .should.throw();
            // lstat throws an error
            resolveStub.returns(notADirectory);
            (optionsParser as any).validatePath.bind(optionsParser, "source", goodPath)
                .should.throw();
            // access throws
            resolveStub.returns(badPermissions);
            (optionsParser as any).validatePath.bind(optionsParser, "source", goodPath)
                .should.throw();
        });

        it("should find the absolute path", (): void => {
            const returnedPath = (optionsParser as any).validatePath("source", goodPath);
            returnedPath.should.equal(absolutePath);
            resolveStub.should.have.been.calledOnce;
        });

        it("should ensure the path is a directory", (): void => {
            (optionsParser as any).validatePath("source", goodPath);
            lstatStub.should.have.been.calledOnce;
            isDirectory.should.have.been.calledOnce;
            isDirectory.returns(false);
            (optionsParser as any).validatePath.bind(optionsParser, "source", goodPath)
                .should.throw(`source${FlattenDirectoryOptions.ERROR_MESSAGES.INVALID_DIRECTORY}`);
        });

        it("should check read permissions for source", (): void => {
            (optionsParser as any).validatePath("source", goodPath);
            accessStub.should.have.been.calledOnce;
            accessStub.should.have.been.calledWith(absolutePath, fs.constants.R_OK);
        });

        it("should check write permissions for target", (): void => {
            (optionsParser as any).validatePath("target", goodPath);
            accessStub.should.have.been.calledOnce;
            accessStub.should.have.been.calledWith(absolutePath, fs.constants.W_OK);
        });

        afterEach((): void => {
            lstatStub.restore();
            accessStub.restore();
        });
    });

    describe("validateOptions", (): void => {
        let validateMaxdepthStub: sinon.SinonStub;
        let validatePathStub: sinon.SinonStub;

        const sourcePath = "path/to/source";
        const targetPath = "path/to/target";
        const absoluteSource = "/" + sourcePath;
        const absoluteTarget = "/" + targetPath;
        const directories = [
            {
                absolutePath: absoluteSource,
                path: sourcePath,
                target: "source",
            },
            {
                absolutePath: absoluteTarget,
                path: targetPath,
                target: "target",
            },
        ];

        beforeEach((): void => {
            validateStub.restore();
            validateMaxdepthStub = sinon.stub(optionsParser as any, "validateMaxdepth");
            validatePathStub = sinon.stub(optionsParser as any, "validatePath");
            validatePathStub.withArgs("source", sourcePath).returns(absoluteSource);
            validatePathStub.withArgs("target", targetPath).returns(absoluteTarget);
        });

        it("should validate the directories and return their absolute paths", (): void => {
            for (const directory of directories) {
                resolveStub.returns(directory.absolutePath);
                const mockOptions = {} as any;
                mockOptions[directory.target] = directory.path;
                const options = (optionsParser as any).validateOptions(mockOptions);
                options[directory.target].should.equal(directory.absolutePath);
            }
        });

        it("should validate maxdepth", (): void => {
            const maxdepth = 99999999999;
            const options = (optionsParser as any).validateOptions({ maxdepth });
            options.maxdepth.should.equal(maxdepth);
        });

        afterEach((): void => {
            validateMaxdepthStub.restore();
            validatePathStub.restore();
        });
    });

    afterEach((): void => {
        optionsParser = null as any;
        setupStub.restore();
        validateStub.restore();
        assignStub.restore();
    });
});
