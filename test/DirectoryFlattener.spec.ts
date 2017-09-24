// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
import * as proxyquire from "proxyquire";
proxyquire.noPreserveCache();
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

const should = chai.should();
chai.use(sinonChai);

import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as winston from "winston";

import { TPromiseLikeCallback } from "../src/lib/interfaces";

import {
    loggerStub,
    resetLoggerStub,
} from "./stubs/logger-singleton";

const baseLogger = "baseLogger";
const resolveStub = sinon.stub();
const joinStub = sinon.stub();
const basenameStub = sinon.stub();

const optionsStub = sinon.stub();
const walkerStub = sinon.stub();

const dummyArgs = ["/path/to/source", "/path/to/target", -1];
const options = {
    maxdepth: ((dummyArgs[2] as number) - 10),
    source: dummyArgs[0] + "/qqq",
    target: dummyArgs[1] + "/qqq",
};

const DirectoryFlattener = proxyquire("../src/lib/DirectoryFlattener", {
    "./DirectoryFlattenerOptions": {
        DirectoryFlattenerOptions: optionsStub.returns({ options }),
    },
    "./DirectoryWalker": {
        DirectoryWalker: walkerStub,
    },
    "./logger-singleton": {
        DEFAULT_CONSOLE_TRANSPORT_NAME: baseLogger,
        logger: loggerStub,
    },
    /* tslint:disable-next-line:object-literal-key-quotes */
    "path": {
        "@noCallThru": true,
        basename: basenameStub,
        join: joinStub,
        resolve: resolveStub,
        sep: "/",
    },
}).DirectoryFlattener;



describe("DirectoryFlattener", (): void => {
    let flattener: any;
    let factoryStub: sinon.SinonStub;

    const dummyFactoryOutput = "cool";

    beforeEach((): void => {
        optionsStub.reset();
        walkerStub.reset();
        factoryStub = sinon.stub(DirectoryFlattener.prototype as any, "copierFactory");
        factoryStub.withArgs(options.target).returns(dummyFactoryOutput);
        optionsStub.callsFake(() => {
            return { options };
        });
        buildNewFlattener();
    });

    describe("constructor", (): void => {
        it("should initialize the options parser", (): void => {
            optionsStub.should.have.been.calledOnce;
            optionsStub.should.have.been.calledWith(...dummyArgs);
        });

        it("should initialize the walker", (): void => {
            walkerStub.should.have.been.calledOnce;
            walkerStub.should.have.been.calledWith({
                callback: dummyFactoryOutput,
                logger: loggerStub,
                maxdepth: options.maxdepth,
                root: options.source,
            });
        });
    });

    describe("flatten", (): void => {
        it("should call walk", (): PromiseLike<void> => {
            const walk = sinon.stub();
            walk.resolves();
            (flattener as any).walker = { walk };
            return flattener.flatten()
                .then(() => {
                    walk.should.have.been.calledOnce;
                });
        });
    });

    describe("copierFactory", (): void => {
        let readStub: sinon.SinonStub;
        let writeStub: sinon.SinonStub;
        let copyFunction: TPromiseLikeCallback;

        beforeEach((): void => {
            resetLoggerStub();
            factoryStub.restore();
            readStub = sinon.stub(flattener as any, "readFile").returns(Bluebird.resolve());
            writeStub = sinon.stub(flattener as any, "writeFile").returns(Bluebird.resolve());
            joinStub.reset();
            basenameStub.reset();
            copyFunction = (flattener as any).copierFactory(options.target);
        });

        it("should create a proper i/o chain", (): PromiseLike<void> => {
            return copyFunction("/path/to/input")
                .then(() => {
                    loggerStub.warn.should.not.have.been.called;
                    readStub.should.have.been.calledOnce;
                    writeStub.should.have.been.calledOnce;
                    writeStub.should.have.been.calledAfter(readStub);
                    joinStub.should.have.been.calledOnce;
                    basenameStub.should.have.been.calledTwice;
                });
        });

        it("should warn when files will be clobbered", (): PromiseLike<void> => {
            basenameStub.returns("input");
            (flattener as any).writtenFiles = { input: "/path/to/source" };
            return copyFunction("/path/to/input")
                .then(() => {
                    loggerStub.warn.should.have.been.calledOnce;
                });
        });

        afterEach((): void => {
            readStub.restore();
            writeStub.restore();
        });
    });

    afterEach((): void => {
        flattener = null as any;
        factoryStub.restore();
    });

    function buildNewFlattener(): void {
        flattener = new DirectoryFlattener(...dummyArgs);
    }
});
