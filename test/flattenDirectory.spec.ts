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

describe("flattenDirectory", (): void => {
    const flattenStub = sinon.stub();
    const walkStub = sinon.stub().returns(Bluebird.resolve());
    flattenStub.returns({
        flatten: walkStub,
    });
    let flattenDirectory: any;

    before((): void => {
        flattenDirectory = proxyquire("../src/flattenDirectory", {
            "./DirectoryFlattener": { DirectoryFlattener: flattenStub },
        }).flattenDirectory;
    });

    it("should create a DirectoryFlattenerOptions object", (): PromiseLike<void> => {
        const dummyArgs = ["/path/to/source", "/path/to/target", -1];
        return flattenDirectory(...dummyArgs)
            .then(() => {
                flattenStub.should.have.been.calledWithNew;
                flattenStub.should.have.been.calledWith(...dummyArgs);
                walkStub.should.have.been.calledOnce;
                walkStub.should.have.been.calledAfter(flattenStub);
            });
    });
});
