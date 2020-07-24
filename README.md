[![NPM Package](https://badge.fury.io/js/inplate.svg)](https://www.npmjs.com/package/inplate)
![CI](https://github.com/makeflow/inplate/workflows/CI/badge.svg)

# Inplate

Inplate is a command-line tool processing files with in-place template, currently it's using `handlebars` for template rendering.

## Installation

```bash
yarn add --dev inplate
# or
npm install --save-dev inplate
```

## Usage

```bash
inplate [options] [file-pattern]
```

### Arguments

- `[file-pattern]`
  Glob pattern for target files, required if `--config` is not specified.

### Options

- `--config`
  Config files to `require()`.
- `--update`
  Update files.
- `--assert`
  Assert that files are up-to-date, otherwise exit with non-zero code.
- `--data <module-path>`
  Module to load default template data.
- `--comment-styles <styles>`
  One or more of `#`, `//`, `/*`, `{/*`, `<!--`, comma-separated.

## Example

```bash
inplate '**/Dockerfile' --update
```

`Dockerfile.js` (template data module for `Dockerfile`)

```js
module.exports = {
  paths: ['program/main.js', 'program/@utils.js'],
};
```

`Dockerfile` (before)

```dockerfile
FROM node

# @inplate
# {{#each paths}}
# COPY {{this}} /app/{{this}}
# {{/each}}
# @plate
# @end
```

`Dockerfile` (after)

```dockerfile
FROM node

# @inplate
# {{#each paths}}
# COPY {{this}} /app/{{this}}
# {{/each}}
# @plate
COPY program/main.js /app/program/main.js
COPY program/@utils.js /app/program/@utils.js
# @end
```

## Syntax

### Single-line comment

Take `#` as an example, please pay attention to the `@plate` comment for multiline template:

```bash
# @inplate {{template}}
[generated content]
# @end

# @inplate
# {{multiline}}
# {{template}}
# @plate
[generated content]
# @end
```

### Block comment

Take `/*` as an example:

```js
/* @inplate {{template}} */
[generated content]
/* @end */

/* @inplate
  {{multiline}}
  {{template}}
 */
[generated content]
/* @end */
```

## Config file

Config file specified with option `--config`.

```js
module.exports = {
  '<file-pattern>': {
    // Template data, optional.
    data: {},
    // Comment styles, optional.
    commentStyles: [
      // Built-in comment style key.
      '#',
      // Or a custom one.
      {
        // Opening, required.
        opening: '/*',
        // Closing, optional. Behave as a block comment if specified.
        closing: '*/',
        // Decode template string, e.g.: `&lt;` -> `<`.
        decoder: raw => template;
        // Encode content string
        encoder: raw => content;
      }
    ]
  },
  // Or default options.
  '<file-pattern>': true,
};
```

## License

MIT License.
