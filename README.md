# `@wizardsoftheweb/flatten-directory`

[![Build Status](https://travis-ci.org/wizardsoftheweb/flatten-directory.svg?branch=dev)](https://travis-ci.org/wizardsoftheweb/flatten-directory) [![Coverage Status](https://coveralls.io/repos/github/wizardsoftheweb/flatten-directory/badge.svg?branch=dev)](https://coveralls.io/github/wizardsoftheweb/flatten-directory?branch=dev)

This package takes a source directory, parses its contents, and moves everything (according to the options) to a target directory.

<!-- MarkdownTOC -->

- [Installation](#installation)
    - [Dev version](#devversion)
- [Tests](#tests)
- [Usage](#usage)
    - [`maxdepth`](#maxdepth)
        - [Brief Explanation](#briefexplanation)
        - [Detailed Explanation](#detailedexplanation)
            - [Setup](#setup)
            - [Example](#example)
- [Motivation](#motivation)
- [Roadmap](#roadmap)
    - [Main Features](#mainfeatures)
    - [Eventual features](#eventualfeatures)

<!-- /MarkdownTOC -->


## Installation

### Dev version
This is just until it's published.

```
npm install --save git+https://github.com/wizardsoftheweb/flatten-directory
```

## Tests

```bash
npm t
```
I've written a (currently small) integration test for `flattenDirectory`. It will run automatically with the rest of the tests. If you want to isolate its results, you can run the `test:integration-only` script.
```bash
npm run test:integration-only
```

## Usage

TODO: write documentation after the API is done

### `maxdepth`
#### Brief Explanation

All instances of `maxdepth` here follow the [`find` conventions](http://man7.org/linux/man-pages/man1/find.1.html). Either ctrl/cmd+f "-maxdepth levels" in the preceding doc link or run `man` through `less` (or whatever pager you want):
```bash
man --pager='less -p "-maxdepth levels"' find
```
`find`'s `maxdepth` works just a little bit differently than you might expect. The short version is that `-maxdepth 0` only searches the files passed in, while `-maxdepth 1` searches the files passed in and their children (if any).

#### Detailed Explanation

If you're comfortable with the man page, you can skip this entire section.

##### Setup

Create a directory tree with several nested subdirectories and files. Or, run this ( [`tree`](https://linux.die.net/man/1/tree) isn't usually a default install so it's guarded):
```
$ mkdir -pv $TMPDIR/depth0Directory/depth1Directory/depth2Directory \
    | awk -F "'" 'match($2, /([0-9])Directory$/, a) { print $2 "/depth" (a[1] + 1) "File"; }' \
    | xargs -n 1 touch; \
    which tree && tree $TMPDIR/depth0Directory

depth0Directory
├── depth1Directory
│   ├── depth2Directory
│   │   └── depth3File
│   └── depth2File
└── depth1File
```
* `mkdir`: creates the directory and all intermediate directories
* `(g)awk`:
    * `-F "'"`: `mkdir` uses [`quoteaf`](https://github.com/coreutils/coreutils/blob/master/src/mkdir.c#L113), which calls [`quotearg_style`](https://github.com/coreutils/coreutils/blob/master/src/system.h#L780), which uses [`quotearg_style` from `gnulib`](https://github.com/coreutils/gnulib/blob/master/lib/quotearg.c#L290). If you don't want to follow all those links (that was probably two hours of my life; I'm not great at navigating `c` repos), [this test from GNU `coreutils`](https://github.com/coreutils/coreutils/blob/master/tests/mkdir/p-v.sh) will have to serve as justification for changing the separator to `'`. If you've never seen `-F`/`FS =`, check out the following example:
        ```bash
        $ mkdir -vp foo/bar \
            | awk '{ \
                input = $0; \
                print "\nInitial input ($0): \"" input "\""; \
                split(input, a, FS); \
                print "Default separator (" FS "):"; \
                print "\t$1: \"" a[1] "\"\n\t$2: \"" a[2] "\""; \
                split(input, a, "'\''"); \
                print "Single quote separator ('\''): "; \
                print "\t$1: \"" a[1] "\"\n\t$2: \"" a[2] "\""; \
            }'; \
            rm -rf foo;

        Initial input ($0): "mkdir: created directory 'foo'"
        Default separator ( ):
             $1: "mkdir:"
             $2: "created"
        Single quote separator ('):
             $1: "mkdir: created directory "
             $2: "foo"

        Initial input ($0): "mkdir: created directory 'foo/bar'"
        Default separator ( ):
             $1: "mkdir:"
             $2: "created"
        Single quote separator ('):
             $1: "mkdir: created directory "
             $2: "foo/bar"
        ```
    * `match($2, /([0-9])Directory$/, a)`: find the last digit followed by `Directory`; store results in `a` (either ctrl/cmd+f [`match(s` here](https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html) or run `man --pager='less -p "match\(s"' awk`)
    * `print $2 "/depth" (a[1] + 1)`: `a[1]` contains the first capture group, so it prints `(other depths)/depth[n]Directory/depth[n+1]Directory`. If I weren't trying to do arithmetic, I'd just use `sed`.
    * I'm still pretty new to `awk`, so this might be a horrible way of doing things.
* `touch`: `xargs` passes the piped values to `touch`
* last line:
    * `which tree`: guards the `tree` call
    * `tree`: pretty-prints a directory structure

##### Example
```bash
# This assumes the setup above; if you didn't do it, use your imagination
$ cd $TMPDIR
$ find depth0Directory -name "depth*"

depth0Directory
depth0Directory/depth1Directory
depth0Directory/depth1Directory/depth2Directory
depth0Directory/depth1Directory/depth2Directory/depth3File
depth0Directory/depth1Directory/depth2File
depth0Directory/depth1File

$ find depth0Directory -maxdepth 1 -name "depth*"

depth0Directory
depth0Directory/depth1Directory
depth0Directory/depth1File

$ find depth0Directory -maxdepth 0 -name "depth*"

depth0Directory
```
The rest assumes you don't have any other files named `'depth*'` in `$TMPDIR`.
```bash
$ find . -name "depth*"

./depth0Directory
./depth0Directory/depth1Directory
./depth0Directory/depth1Directory/depth2Directory
./depth0Directory/depth1Directory/depth2Directory/depth3File
./depth0Directory/depth1Directory/depth2File
./depth0Directory/depth1File

$ find . -maxdepth 1 -name "depth*"

./depth0Directory

$ find . -maxdepth 0 -name "depth*"


```

## Motivation

I've got a couple of scripts at work that source content from some directories that keep changing. Rather than build some lengthy regex that would have to be regularly updated, I figured I could just flatten everything.

## Roadmap

These percentages are pretty arbitrary. Today's 47% could be tomorrow's 90% or vice versa.

### Main Features

Once all of these are finished, I'll release `v1`. Until then, `v0` should be used with caution, because it's not stable.

| Progess | Feature |
| ------: | ------- |
|    100% | Walk the initial directory, collecting files that aren't excluded by `maxdepth` |
|    100% | Link some internet version of `man find` |
|    100% | Finish `parseOptions` |
|    100% | Finish `flattenDirectory` |
|    100% | Add file encoding option because not everyone uses `utf8` |
|    100% | Check `basename` of filelist and warn that duplicates will be clobbered |
|     60% | Set up `index` properly |
|      0% | Export the full namespace |
|     80% | Compile declaration file |
|      0% | Compile docs from source |
|      0% | Incorporate `@todo`s somewhere prominent in the docs |
|      0% | Figure out where to insert [man find link](http://man7.org/linux/man-pages/man1/find.1.html) in the docs as `@see` |
|      0% | Switch defaults (branch, badges) from `dev` to `master` |
|      0% | Publish package on `npm` |

### Eventual features

These are things I'd like to add, but probably won't be included in `v1`. If not, they'll most likely constitute one or more minor version increments.

| Progess | Feature |
| ------: | ------- |
|      0% | Strip discovery from `DirectoryWalker` |
|      0% | Convert `DiscoveryWalker` to a function |
|      0% | [Greenkeeper](https://greenkeeper.io/) (or similar) integration |
|      0% | Add `include` options to `IWalkOptions` |
|      0% | Add some of the options from `DirectoryWalker` to `flattenDirectory` |
|      0% | Add destructive flattening option, e.g. `mv` instead of `cp` (currently just copying files) |
|      0% | Add clobber option |
|      0% | Production install |
|      0% | Dev install |
