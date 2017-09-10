export interface IFlattenDirectoryOptions {
    source?: string;
    target?: string;
    depth?: number;
}

export type IFileCallback = (filePath: string) => void;

export interface IWalkOptions {
    directoryPath: string;
    callback: IFileCallback;
    maxDepth?: number;
    exclude?: string[];
}
