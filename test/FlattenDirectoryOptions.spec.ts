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
} from "../src/interfaces";

import { loggerStub } from "./stubs/logger-singleton";

const FlattenDirectoryOptions = proxyquire("../src/FlattenDirectoryOptions", {
    "./logger-singleton": {logger: loggerStub},
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

    afterEach((): void => {
        optionsParser = null as any;
    });

});
