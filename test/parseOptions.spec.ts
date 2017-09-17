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

import { logger } from "../src/logger-singleton";

describe("parseOptions", (): void => {
    const flattenStub = sinon.stub();
    let parseOptions: any;

    before((): void => {
        parseOptions = proxyquire("../src/parseOptions", {
            "./FlattenDirectoryOptions": { FlattenDirectoryOptions: flattenStub },
        }).parseOptions;
    });

    it("should create a FlattenDirectoryOptions object", (): void => {
        parseOptions({ silent: false });
        flattenStub.should.have.been.calledWithNew;
    });
});
