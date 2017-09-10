import {IFlattenDirectoryOptions} from "./interfaces";

function assignOptions(args: any): IFlattenDirectoryOptions {
    if (args.length === 1) {
        if (typeof args === "string") {
            return { source: args };
        }
        return args;
    }
}

function validateOptions(options: IFlattenDirectoryOptions): IFlattenDirectoryOptions {
    // do nothing
    return {};
}

export function parseOptions(args: any): IFlattenDirectoryOptions {
    return validateOptions(assignOptions(args));
}
