import { DirectoryFlattenerOptions } from "./DirectoryFlattenerOptions";
import { IDirectoryFlattenerOptionsValidated } from "./interfaces";

/**
 * Hides `DirectoryFlattenerOptions` creation and parsing within a simple method.
 *
 * @param  {any}                               args
 * Options passed to `flattenDirectory`
 * @return {IDirectoryFlattenerOptionsValidated}
 * Validated options ready for use
 * @see flattenDirectory
 */
function parseOptions(...args: any[]): IDirectoryFlattenerOptionsValidated {
    const optionsParser = new (DirectoryFlattenerOptions as any)(...args);
    return optionsParser.options;
}

export { parseOptions };
