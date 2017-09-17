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
import * as path from "path";
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

const FlattenDirectoryOptions = proxyquire("../src/FlattenDirectoryOptions", {
    "./logger-singleton": {
        DEFAULT_CONSOLE_TRANSPORT_NAME: baseLogger,
        logger: loggerStub,
    },
}).FlattenDirectoryOptions;

describe("FlattenDirectoryOptions", (): void => {

    let optionsParser: any;

    beforeEach((): void => {
        optionsParser = new FlattenDirectoryOptions();
    });

    describe("constructor", (): void => {
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

        it("should set up the logger", (): void => {
            setupStub.should.be.calledOnce;
        });

        it("should assign and validate options", (): void => {
            assignStub.should.be.calledOnce;
            validateStub.should.be.calledAfter(assignStub);
        });

        afterEach((): void => {
            setupStub.restore();
            validateStub.restore();
            assignStub.restore();
        });
    });

    describe("setUpLogger", (): void => {
        const notALogLevel = "not a real log level";
        beforeEach((): void => {
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

    afterEach((): void => {
        optionsParser = null as any;
    });
});
