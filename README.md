# `@wizardsoftheweb/flatten-directory`

[![Build Status](https://travis-ci.org/wizardsoftheweb/flatten-directory.svg?branch=dev)](https://travis-ci.org/wizardsoftheweb/flatten-directory) [![Coverage Status](https://coveralls.io/repos/github/wizardsoftheweb/flatten-directory/badge.svg?branch=dev)](https://coveralls.io/github/wizardsoftheweb/flatten-directory?branch=dev)

This package takes a source directory, parses its contents, and moves everything (according to the options) to a target directory.

<!-- MarkdownTOC -->

- [Installation](#installation)
    - [Dev version](#devversion)
- [Usage](#usage)
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

## Usage

TODO: write documentation after the API is done

## Motivation

I've got a couple of scripts at work that source content from some directories that keep changing. Rather than build some lengthy regex that would have to be regularly updated, I figured I could just flatten everything.

## Roadmap

These percentages are pretty arbitrary. Today's 47% could be tomorrow's 90% or vice versa.

### Main Features

Once all of these are finished, I'll release `v1`. Until then, `v0` should be used with caution, because it's not stable.

| Progess | Feature |
| ------: | ------- |
|      0% | Add `include` options to `IWalkOptions` |
|     80% | Walk the initial directory, collecting files that aren't excluded within `maxdepth` |
|      0% | Link some internet version of `man find` |
|    100% | Finish `parseOptions` |
|      5% | Finish `flattenDirectory` |
|      0% | Set up `index` properly |
|      0% | Compile docs from source |
|      0% | Publish package on `npm` |
|      0% | Switch defaults (branch, badges) from `dev` to `master` |

### Eventual features

These are things I'd like to add, but probably won't be included in `v1`. If not, they'll most likely constitute one or more minor version increments.

| Progess | Feature |
| ------: | ------- |
|      0% | Strip discovery from `DirectoryWalker` |
|      0% | Convert `DiscoveryWalker` to a function |
|      0% | [Greenkeeper](https://greenkeeper.io/) (or similar) integration |
