#!/usr/bin/env node

const FS = require('fs');
const Path = require('path');

const Chalk = require('chalk');
const {program} = require('commander');
const Glob = require('glob');

const {updateContent} = require('./@inplate');
const {
  COMMENT_STYLE_KEYS,
  COMMENT_STYLE_DICT,
  getCommentStylesByFileName,
} = require('./@comment');

const hasOwnProperty = Object.prototype.hasOwnProperty;

const DEFAULT_TEMPLATE_MODULE_EXTENSIONS = ['.js', '.json'];

program
  .name('inplate')
  .version(require('../package').version)
  .arguments('[file-pattern]')
  .option('--config <path>', 'config files to `require()`')
  .option('--update', 'update files', false)
  .option(
    '--assert',
    'assert that files are up-to-date, otherwise exit with non-zero code',
    false,
  )
  .option('--data <module-path>', 'module to load default template data')
  .option(
    '--comment-styles <styles>',
    `one or more of ${COMMENT_STYLE_KEYS.map(key => JSON.stringify(key)).join(
      ', ',
    )}, comma-separated`,
  )
  .action((filePattern, options) => main(filePattern, options))
  .parse();

function main(
  cliFilePattern,
  {
    update: toUpdate,
    assert: toAssert,
    config: configFilePath,
    data: cliDataModulePath,
    commentStyles: cliCommentStylesString,
  },
) {
  let entries = [];

  if (configFilePath) {
    if (cliFilePattern || cliDataModulePath || cliCommentStylesString) {
      console.warn(
        Chalk.yellow(
          'By specifying `--config` option, all of `[file-pattern]`/`--data`/`--comment-styles` will be ignored.',
        ),
      );
    }

    let config = require(Path.resolve(configFilePath));

    entries.push(
      ...Object.entries(config).map(([key, value]) => {
        return {
          filePattern: key,
          ...(typeof value === 'object' ? value : undefined),
        };
      }),
    );
  } else {
    if (!cliFilePattern) {
      console.error(
        Chalk.red(
          'Argument [file-pattern] is required if no `--config` specified',
        ),
      );
      process.exit(1);
    }

    entries.push({
      filePattern: cliFilePattern,
      data: require(Path.resolve(cliDataModulePath)),
      commentStyles:
        cliCommentStylesString && cliCommentStylesString.split(','),
    });
  }

  if (toUpdate && toAssert) {
    console.error(
      Chalk.red('Options `--update` and `--assert` can not co-exist.'),
    );
    process.exit(1);
  }

  let upToDate = true;

  for (let {filePattern, ...options} of entries) {
    let entryUpToDate = inplate(filePattern, {
      ...options,
      update: toUpdate,
    });

    if (upToDate && !entryUpToDate) {
      upToDate = false;
    }
  }

  process.exit(!upToDate && toAssert ? 1 : 0);
}

function inplate(
  filePattern,
  {update: toUpdate, data: defaultData, commentStyles: specificCommentStyles},
) {
  if (specificCommentStyles) {
    specificCommentStyles = specificCommentStyles.map(style => {
      if (typeof style === 'string') {
        if (!hasOwnProperty.call(COMMENT_STYLE_DICT, style)) {
          console.error(
            Chalk.red(
              `Unknown comment style ${JSON.stringify(
                style,
              )}, use one of ${COMMENT_STYLE_KEYS.map(key =>
                JSON.stringify(key),
              ).join(', ')}.`,
            ),
          );
          process.exit(1);
        }

        return COMMENT_STYLE_DICT[style];
      } else if (
        typeof style === 'object' &&
        style &&
        typeof style.opening === 'string'
      ) {
        return style;
      } else {
        console.error(
          Chalk.red(`Invalid comment style ${JSON.stringify(style)}.`),
        );
        process.exit(1);
      }
    });
  }

  let filePaths = Glob.sync(filePattern, {
    nodir: true,
    ignore: '**/node_modules/**',
  });

  let upToDate = true;

  for (let filePath of filePaths) {
    let fileName = Path.basename(filePath);

    let dataModulePath = DEFAULT_TEMPLATE_MODULE_EXTENSIONS.map(extension =>
      Path.resolve(`${filePath}${extension}`),
    ).find(path => FS.existsSync(path));

    let data = dataModulePath ? require(dataModulePath) : defaultData;

    let commentStyles =
      specificCommentStyles || getCommentStylesByFileName(fileName);

    let content = FS.readFileSync(filePath, 'utf8');

    let updatedContent = updateContent(
      content,
      {
        fileName,
        ...data,
      },
      commentStyles,
    );

    if (updatedContent === content) {
      console.info(Chalk.green(`up-to-date: ${filePath}`));
    } else {
      upToDate = false;

      if (toUpdate) {
        FS.writeFileSync(filePath, updatedContent);
        console.info(Chalk.cyan(`updated: ${filePath}`));
      } else {
        console.info(Chalk.yellow(`outdated: ${filePath}`));
      }
    }
  }

  return upToDate;
}
