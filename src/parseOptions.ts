import { FlattenDirectoryOptions } from "./FlattenDirectoryOptions";
import { IFlattenDirectoryOptionsValidated } from "./interfaces";

/**
 * Hides `FlattenDirectoryOptions` creation and parsing within a simple method.
 *
 * @param  {any}                               args
 * Options passed to `flattenDirectory`
 * @return {IFlattenDirectoryOptionsValidated}
 * Validated options ready for use
 * @see flattenDirectory
 */
function parseOptions(...args: any[]): IFlattenDirectoryOptionsValidated {
    const optionsParser = new (FlattenDirectoryOptions as any)(...args);
    return optionsParser.options;
}

export { parseOptions };
