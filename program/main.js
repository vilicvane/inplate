#!/usr/bin/env node

const FS = require('fs');
const Path = require('path');

const Chalk = require('chalk');
const {program} = require('commander');
const Glob = require('glob');
const {main} = require('main-function');
const {Prettier} = require('./@prettier');

const {
  COMMENT_STYLE_KEYS,
  getCommentStylesByFileName,
  resolveConfigCommentStyles,
} = require('./@comment');
const {updateContent, generateContentWithTemplate} = require('./@inplate');
const {printDiffs} = require('./@utils');

const DEFAULT_CONFIG_FILE_NAMES = ['inplate.config.js', 'inplate.config.json'];
const DEFAULT_CONFIG_MODULE_EXTENSIONS = ['.js', '.json'];
const DEFAULT_TEMPLATE_EXTENSIONS = ['.tpl', '.hbs'];

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
  .option('--silent', 'silence listed files and diffs', false)
  .option('--template <template-path>', 'path to file template')
  .option('--data <module-path>', 'module to load default template data')
  .option(
    '--comment-styles <styles>',
    `one or more of ${COMMENT_STYLE_KEYS.map(key => JSON.stringify(key)).join(
      ', ',
    )}, comma-separated`,
  )
  .action((filePattern, options) => main(() => _main(filePattern, options)))
  .parse();

async function _main(
  cliFilePattern,
  {
    update: toUpdate,
    assert: toAssert,
    silent,
    config: configFilePath,
    template: cliTemplatePath,
    data: cliDataModulePath,
    commentStyles: cliCommentStylesString,
  },
) {
  if (!cliFilePattern && !configFilePath) {
    configFilePath = DEFAULT_CONFIG_FILE_NAMES.find(fileName =>
      FS.existsSync(fileName),
    );
  }

  let entries = [];

  if (configFilePath) {
    if (
      cliFilePattern ||
      cliTemplatePath ||
      cliDataModulePath ||
      cliCommentStylesString
    ) {
      console.warn(
        Chalk.yellow(
          'By specifying `--config` option, all of `[file-pattern]`/`--template`/`--data`/`--comment-styles` will be ignored.',
        ),
      );
    }

    let cwd = Path.dirname(configFilePath);
    let config = require(Path.resolve(configFilePath));

    entries.push(
      ...Object.entries(config).map(([key, value]) => {
        return {
          filePattern: key,
          cwd,
          ...(typeof value === 'object' ? value : undefined),
        };
      }),
    );
  } else {
    if (!cliFilePattern) {
      console.error(
        Chalk.red(
          'Argument [file-pattern] is required if no `--config` specified.',
        ),
      );
      process.exit(1);
    }

    entries.push({
      filePattern: cliFilePattern,
      template: cliTemplatePath && FS.readFileSync(cliTemplatePath, 'utf8'),
      data: cliDataModulePath && require(Path.resolve(cliDataModulePath)),
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
    let entryUpToDate = await inplate(filePattern, {
      ...options,
      silent,
      update: toUpdate,
    });

    if (upToDate && !entryUpToDate) {
      upToDate = false;
    }
  }

  process.exit(!upToDate && toAssert ? 1 : 0);
}

async function inplate(
  filePattern,
  {
    update: toUpdate,
    silent,
    template: defaultTemplate,
    data: defaultData,
    commentStyles: specifiedCommentStyles,
    cwd = process.cwd(),
  },
) {
  if (specifiedCommentStyles) {
    specifiedCommentStyles = resolveConfigCommentStyles(specifiedCommentStyles);
  }

  let filePaths = Glob.hasMagic(filePattern)
    ? Glob.sync(filePattern, {
        absolute: true,
        cwd,
        nodir: true,
        ignore: '**/node_modules/**',
      })
    : [Path.resolve(cwd, filePattern)];

  let upToDate = true;

  for (let filePath of filePaths) {
    let fileName = Path.basename(filePath);

    let configModulePath = DEFAULT_CONFIG_MODULE_EXTENSIONS.map(
      extension => `${filePath}${extension}`,
    ).find(path => FS.existsSync(path));

    let template;
    let data;
    let commentStyles;

    if (configModulePath) {
      let config = require(configModulePath);

      template = config.template;

      data = config.data;

      commentStyles =
        config.commentStyles &&
        config.commentStyles.length &&
        resolveConfigCommentStyles(config.commentStyles);
    }

    if (typeof template !== 'string' && template !== true) {
      template = defaultTemplate;
    }

    data = {
      fileName,
      ...defaultData,
      ...data,
    };

    if (!commentStyles) {
      commentStyles =
        specifiedCommentStyles || getCommentStylesByFileName(fileName);
    }

    if (template === true) {
      let templateFilePath = DEFAULT_TEMPLATE_EXTENSIONS.map(
        extension => `${filePath}${extension}`,
      ).find(path => FS.existsSync(path));

      if (templateFilePath) {
        template = FS.readFileSync(templateFilePath, 'utf8');
      } else {
        template = undefined;
      }
    }

    let relativeFilePath = Path.relative(cwd, filePath);

    let content = FS.existsSync(filePath)
      ? FS.readFileSync(filePath, 'utf8')
      : '';

    let updatedContent;

    try {
      if (typeof template === 'string') {
        updatedContent = generateContentWithTemplate(fileName, template, data);
      } else {
        updatedContent = updateContent(content, data, commentStyles);
      }

      let prettierOptions =
        Prettier && (await Prettier.resolveConfig(filePath));

      if (prettierOptions) {
        try {
          updatedContent = Prettier.format(updatedContent, {
            filepath: filePath,
            ...prettierOptions,
          });
        } catch (error) {
          // Ignore error.
        }
      }
    } catch (error) {
      console.error(Chalk.red(`error: ${relativeFilePath}`));
      console.error(error.message);
      process.exit(1);
    }

    if (updatedContent === content) {
      if (!silent) {
        console.info(`up-to-date: ${relativeFilePath}`);
      }
    } else {
      upToDate = false;

      if (toUpdate) {
        FS.writeFileSync(filePath, updatedContent);

        if (!silent) {
          console.info(Chalk.green(`updated: ${relativeFilePath}`));
        }
      } else {
        if (!silent) {
          console.info(Chalk.red(`outdated: ${relativeFilePath}`));
        }
      }

      if (!silent) {
        printDiffs(content, updatedContent);
      }
    }
  }

  return upToDate;
}
