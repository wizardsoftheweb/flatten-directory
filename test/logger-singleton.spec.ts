// Things like ...be.true; or ...be.rejected; dont play nice with TSLint
/* tslint:disable:no-unused-expression */
import * as chai from "chai";
// Needed for describe, it, etc.
import { } from "mocha";
import * as sinon from "sinon";

const expect = chai.expect;
const should = chai.should();

import * as Bluebird from "bluebird";
import * as winston from "winston";

import { logger } from "../src/logger-singleton";

describe("DirectoryWalker", (): void => {
    it("should be a instance of winston Logger", (): void => {
        logger.should.be.an.instanceof(winston.Logger);
    });
});
