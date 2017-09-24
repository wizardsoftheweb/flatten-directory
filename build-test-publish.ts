import * as Bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";
import * as shelljs from "shelljs";

import { logger } from "./src/lib/logger-singleton";

import * as util from "util";

/* tslint:disable-next-line:no-var-requires */
const config = require("./package.json");
const tmp = path.join(__dirname, ".flattenTmp");

shelljs.cd(__dirname);

if (!shelljs.which("git")) {
    logger.error("git required for publication");
    throw new Error("git not found");
}

logger.info("Cleaning up previous build(s)");

shelljs.rm("-rf", path.join(__dirname, "dist"));
shelljs.rm("-rf", tmp);
shelljs.mkdir("-p", tmp);

logger.info("Linting src/");
npmRun("lint");

logger.info("Building dist/");
npmRun("compile:npm");

logger.info("Starting declaration file bundle");

logger.verbose("Searching dist/ for declaration files");
const unbundledDeclarations = shelljs.find(path.join(__dirname, "dist", "lib"))
    .filter((filename: string) => {
        return filename.match(/\.d\.ts$/);
    });

logger.verbose("Loading declarations");
let functionDeclaration = "";
let declaration = "";
for (const filename of unbundledDeclarations) {
    logger.silly(`Loading and cleaning ${filename}`);
    const contents = fs.readFileSync(filename, "utf8")
        // remove leading exports or full line exports
        .replace(/^(\s*)?export ?(?:\{.*\}.*;)?/gmi, "$1");
    if (filename.match(/flattenDirectory\.d\.ts$/)) {
        logger.silly("Creating main function declaration");
        functionDeclaration = contents;
    } else {
        logger.silly("Appending to namespace declarations");
        declaration += contents.replace(/^(\s*)declare ?/gmi, "$1");
    }
}

let match: any;
// Move references
const references = [];
const refRegExp = /^\s*(\/\/\/ <.*)\s*$/gm;
logger.verbose("Searching for references");
/* tslint:disable-next-line:no-conditional-assignment */
while (match = refRegExp.exec(declaration)) {
    const reference = match[1];
    if (references.indexOf(reference) === -1) {
        logger.silly(`Found ${reference}`);
        references.push(reference);
    }
}

interface IImports {
    [source: string]: {
        mask: string;
        components: string[];
    };
}

// Condense imports
const imports: IImports = {};
const importRegExp = /^\s*import (\{ ?(.*) ?\}|(\* as \w+)) from ("[^\"]*");$/gmi;
logger.verbose("Searching for imports");
/* tslint:disable-next-line:no-conditional-assignment */
while (match = importRegExp.exec(declaration)) {
    if (/^"\w/y.test(match[4])) {
        logger.silly(`Found external import ${match[0]}`);
        const found: any = imports[match[4]] || {
            components: [],
            mask: match[3] || "",
            source: match[4],
        };
        const components = (match[2] || "").trim().split(",");
        for (const component of components) {
            const trimmedComponent = component.trim();
            if (trimmedComponent.length > 0 && found.components.indexOf(trimmedComponent) === -1) {
                found.components.push(trimmedComponent);
                found.components.sort();
            }
        }
        imports[match[4]] = found;
    } else {
        logger.silly(`Found local import ${match[0]}`);
    }
}
logger.verbose("Compiling import header");
let importString = "";
const sources = Object.keys(imports);
sources.sort();
for (const source of sources) {
    if (imports.hasOwnProperty(source)) {
        importString += `\
import \
${
            imports[source].components.length > 0
                ? "{\n    " + imports[source].components.join(",\n    ") + ",\n}"
                : ""
            }\
${imports[source].mask.length > 0 ? imports[source].mask : ""}\
 from ${source.replace("./", "./dist/lib/")};
`;
    }
}

logger.verbose("Tidying declaration body");
declaration = declaration
    // remove references
    .replace(refRegExp, "")
    // remove imports
    .replace(importRegExp, "")
    // remove empty lines
    .replace(/\n\s*\n/g, "\n")
    // indent declarations
    .replace(/\n/g, "\n    ")
    // remove final newline
    .replace(/^([\s\S]*)\n\s*$/gy, "$1");

logger.verbose("Filling and tidying index.d.ts template");
const declarationFile = `\
// Type definitions for flattenDirectory ${config.version.replace(/\.\d+$/, "")}
// Project: ${config.repository.url.replace(/^\w+:(.+?(?=\.git$))(\.git)?$/i, "https:$1")}
// Definitions by: CJ Harries <https://github.com/thecjharries>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

${references.join("\n") + "\n\n"}\
${importString}\

${functionDeclaration}\
declare namespace flattenDirectory {
    ${declaration}
}

export = flattenDirectory;
`
    // replace tabs with spaces
    .replace(/\t/, "    ")
    // remove trailing whitespace
    .replace(/\s*\n$/m, "\n");

logger.verbose("Removing unbundled definition files");
shelljs.rm(unbundledDeclarations);

const outFile = path.join(__dirname, "dist", "index.d.ts");
logger.verbose(`Writing ${outFile}`);
fs.writeFileSync(outFile, declarationFile, "utf8");

logger.info("Finished declaration file bundle");

logger.info("Packing");
exec("npm pack");
const packedTarballName = `wizardsoftheweb-flatten-directory-${config.version}.tgz`;

logger.info("Checking build");
logger.verbose(`Installing in ${tmp}`);
shelljs.cd(tmp);
shelljs.cp(path.join(__dirname, packedTarballName), path.join(tmp, packedTarballName));
exec("npm init -y");
exec(`npm install ${packedTarballName} --no-save --silent`);
shelljs.mkdir("-p", path.join(tmp, "target"));

logger.verbose("Creating test file");
fs.writeFileSync(path.join(tmp, "test.ts"), `\
import * as flattenDirectory from "@wizardsoftheweb/flatten-directory";

flattenDirectory({
    source: "node_modules/@wizardsoftheweb/flatten-directory",
    target: "target",
    silent: false,
})
.then(() => {
    process.exit(0);
});
`, "utf8");

logger.verbose("Running test file");
shelljs.exec(`${path.join(__dirname, "node_modules", ".bin", "ts-node")} test`);
const filesInNodeModules = shelljs.ls("-R", path.join(tmp, "node_modules", "@wizardsoftheweb", "flatten-directory"))
    .filter((filename: string) => {
        return filename.match(/\.\w+$/y);
    });
const filesInTarget = shelljs.ls(path.join(tmp, "target"));
for (const originalFile of filesInNodeModules) {
    if (filesInTarget.indexOf(originalFile) === -1) {
        throw new Error(`Failed to copy ${originalFile}`);
    }
}
shelljs.cd(__dirname);

logger.verbose("Build appears to be working");

logger.info("Preparing to publish");
const branch = execResult("git rev-parse --abbrev-ref HEAD");
if (branch !== "master") {
    const errorMessage = "Publication must happen on the master branch";
    logger.error(errorMessage);
    throw new Error(errorMessage);
}

const currentTag = execResult("git describe --abbrev=0 --tags");
logger.silly(`Most recent tag: ${currentTag}`);
const currentTagHash = execResult(`git rev-list -n 1 ${currentTag}`);
logger.silly(`Tag commit hash (not ref): ${currentTagHash}`);
const masterHash = execResult("git rev-parse HEAD");
logger.silly(`Master hash: ${masterHash}`);
if (masterHash !== currentTagHash) {
    const errorMessage = `${currentTag} and master are on different commits; did you forget to increment the version?`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
}

logger.info("Cleaning up generated files");
shelljs.rm("-rf", path.join(__dirname, packedTarballName));
shelljs.rm("-rf", tmp);

function execResult(command: string): string {
    return (shelljs.exec(command, {silent: true}).stdout as string).trim();
}

function exec(command: string, errorMessage: string = ""): void {
    const child = shelljs.exec(command, { silent: true }) as shelljs.ExecOutputReturnValue;
    if ((child.stderr as string).length > 0 || child.code !== 0) {
        // Apparently some processes log error to stdout. Others don't log.
        const messageWithFallbacks = (
            (child.stderr || child.stdout)
            || errorMessage
        )
            || "Someone was too lazy to write a message for this";
        logger.error(child.stderr || child.stdout);
        throw new Error(errorMessage || messageWithFallbacks);
    }
    if ((child.stdout as string).trim().length > 0) {
        logger.verbose(`Results:\n${child.stdout as string}`);
    }
}

function npmRun(script: string): void {
    exec(
        config.scripts[script],
        `Unable to complete ${script}; please fix and check 'npm run ${script}' before continuing`,
    );
}
