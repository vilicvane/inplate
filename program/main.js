#!/usr/bin/env node

import * as FS from 'fs';
import * as Path from 'path';

import Chalk from 'chalk';
import {program} from 'commander';
import * as Glob from 'glob';
import {createRequire} from 'module';
import {main} from 'main-function';

import {
  COMMENT_STYLE_KEYS,
  getCommentStylesByFileName,
  resolveConfigCommentStyles,
} from './@comment.js';
import {updateContent, generateContentWithTemplate} from './@inplate.js';
import {Prettier} from './@prettier.js';
import {importDefaultFallback, printDiffs} from './@utils.js';

const require = createRequire(import.meta.url);

const DEFAULT_CONFIG_FILE_NAMES = [
  'inplate.config.js',
  'inplate.config.cjs',
  'inplate.config.json',
];
const DEFAULT_FILE_CONFIG_MODULE_EXTENSIONS = ['.js', '.cjs', '.json'];
const DEFAULT_TEMPLATE_EXTENSIONS = ['.tpl', '.hbs'];

const {version} = require('../package.json');

program
  .name('inplate')
  .version(version)
  .arguments('[file-pattern]')
  .option('--config <path>', 'config files to `import()`')
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
  .action((filePattern, options) => main(() => main_(filePattern, options)))
  .parse();

async function main_(
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

  const entries = [];

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

    const cwd = Path.dirname(configFilePath);
    const config = await importDefaultFallback(Path.resolve(configFilePath));

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
      data:
        cliDataModulePath &&
        (await importDefaultFallback(Path.resolve(cliDataModulePath))),
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

  for (const {filePattern, ...options} of entries) {
    const entryUpToDate = await inplate(filePattern, {
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

  const filePaths = Glob.hasMagic(filePattern)
    ? Glob.sync(filePattern, {
        absolute: true,
        cwd,
        nodir: true,
        ignore: '**/node_modules/**',
      })
    : [Path.resolve(cwd, filePattern)];

  let upToDate = true;

  for (const filePath of filePaths) {
    const fileName = Path.basename(filePath);

    const configModulePath = DEFAULT_FILE_CONFIG_MODULE_EXTENSIONS.map(
      extension => `${filePath}${extension}`,
    ).find(path => FS.existsSync(path));

    let template;
    let data;
    let commentStyles;

    if (configModulePath) {
      const config = await importDefaultFallback(configModulePath);

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
      const templateFilePath = DEFAULT_TEMPLATE_EXTENSIONS.map(
        extension => `${filePath}${extension}`,
      ).find(path => FS.existsSync(path));

      if (templateFilePath) {
        template = FS.readFileSync(templateFilePath, 'utf8');
      } else {
        template = undefined;
      }
    }

    const relativeFilePath = Path.relative(cwd, filePath);

    const content = FS.existsSync(filePath)
      ? FS.readFileSync(filePath, 'utf8')
      : '';

    let updatedContent;

    try {
      if (typeof template === 'string') {
        updatedContent = generateContentWithTemplate(fileName, template, data);
      } else {
        updatedContent = updateContent(content, data, commentStyles);
      }

      const prettierOptions =
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
