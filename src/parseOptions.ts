import { FlattenDirectoryOptions } from "./FlattenDirectoryOptions";
import { IFlattenDirectoryOptionsValidated } from "./interfaces";

export function parseOptions(args?: any): IFlattenDirectoryOptionsValidated {
    const optionsParser = new FlattenDirectoryOptions(args);
    return optionsParser.options;
}
