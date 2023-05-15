[![NPM Package](https://badge.fury.io/js/inplate.svg)](https://www.npmjs.com/package/inplate)
![CI](https://github.com/vilic/inplate/workflows/CI/badge.svg)

# Inplate

Inplate is a command-line tool processing files with in-place template, currently it's using `handlebars` for template rendering.

Prettier is applied if it's installed and there is configuration file in some upper directory.

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

### Options

- `--config`

  Config files to `require()`.

- `--update`

  Update files.

- `--assert`

  Assert that files are up-to-date, otherwise exit with non-zero code.

- `--silent`

  Silence listed files and diffs.

- `--template <template-path>`

  Path to file template.

- `--data <module-path>`

  Module to load default template data.

- `--comment-styles <styles>`

  One or more of `#`, `//`, `/*`, `{/*`, `<!--`, comma-separated.

### Arguments

- `[file-pattern]`

  Glob pattern for target files, required if `--config` is not specified.

## Example

```bash
inplate '**/Dockerfile' --update
```

`Dockerfile.js` (template data module for `Dockerfile`)

```js
const Glob = require('glob');

module.exports = {
  data: {
    packageFilePaths: pad(
      Glob.sync('**/package.json', {
        ignore: '**/node_modules/**',
      }),
    ),
  },
};

function pad(values) {
  let maxLength = Math.max(...values.map(value => value.length));

  return values.map(value => {
    return {
      value,
      padding: value.padEnd(maxLength).slice(value.length),
    };
  });
}
```

`Dockerfile` (before)

```dockerfile
FROM node

# @inplate
# {{#each packageFilePaths}}
# COPY {{value}}{{padding}}  /app/{{value}}
# {{/each}}
# @plate
# @end
```

`Dockerfile` (after)

```dockerfile
FROM node

# @inplate
# {{#each packageFilePaths}}
# COPY {{value}}{{padding}}  /app/{{value}}
# {{/each}}
# @plate
COPY package.json               /app/package.json
COPY packages/foo/package.json  /app/packages/foo/package.json
COPY packages/bar/package.json  /app/packages/bar/package.json
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

# @inplate-line {{template}}
[generated content]
```

### Block comment

Take `/*` as an example:

```js
/* @inplate {{template}} */
[generated content]
/* @end */

/*
  @inplate
  {{multiline}}
  {{template}}
*/
[generated content]
/* @end */

/* @inplate-line {{template}} */
[generated content]
```

## Config files

Config file specified with option `--config`.

If both `--config` and `[file-pattern]` are not specified, it will load default config file (`inplate.config.js`/`inplate.config.json`) if exists.

```js
module.exports = {
  '<file-pattern>': {
    // Use file template, optional.
    // If true, it will load template from file `${fileName}.tpl` or `${fileName}.hbs`.
    // You can also specify a string as the template content directly.
    // By specifying this option, it will skip comment parsing and update the whole file directly.
    template: true,
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
        // Encode content string.
        encoder: raw => content;
      }
    ]
  },
  // Or default options.
  '<file-pattern>': true,
};
```

Template config module named after the target file (`.js`/`.json`). E.g., if the target file is `Dockerfile`, this template config module can be named either `Dockerfile.js` or `Dockerfile.json`.

```js
module.exports = {
  // Optional, see config file.
  template: true,
  // Optional, see config file.
  data: {},
  // Optional, see config file.
  commentStyles: [],
};
```

## License

MIT License.
