import { stub } from "sinon";

const loggerStub = {
    error: stub(),
    info: stub(),
    remove: stub(),
    silly: stub(),
    verbose: stub(),
    warn: stub(),
};

function resetLoggerStub() {
    for (const key in loggerStub) {
        if (loggerStub.hasOwnProperty(key) && typeof (loggerStub as any)[key].reset !== "undefined") {
            (loggerStub as any)[key].reset();
        }
    }
}

export { loggerStub, resetLoggerStub };
