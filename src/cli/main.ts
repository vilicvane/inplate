#!/usr/bin/env node

import * as FS from 'fs';
import {createRequire} from 'module';
import * as Path from 'path';
import * as URL from 'url';

import Chalk from 'chalk';
import {program} from 'commander';
import * as Glob from 'glob';
import {main} from 'main-function';

import type {CommentStyle} from '../library/index.js';
import {
  COMMENT_STYLE_KEYS,
  Prettier,
  generateContentWithTemplate,
  getCommentStylesByFileName,
  importDefaultFallback,
  printDiffs,
  resolveConfigCommentStyles,
  updateContent,
} from '../library/index.js';

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
  .option('--ignore <patterns>', 'file patterns to ignore', false)
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
  cliFilePattern: string,
  {
    ignore: cliIgnorePattern,
    update: toUpdate,
    assert: toAssert,
    silent,
    config: configFilePath,
    template: cliTemplatePath,
    data: cliDataModulePath,
    commentStyles: cliCommentStylesString,
  }: {
    ignore: string | undefined;
    update: boolean;
    assert: boolean;
    silent: boolean;
    config: string | undefined;
    template: string | undefined;
    data: string | undefined;
    commentStyles: string | undefined;
  },
): Promise<void> {
  if (!cliFilePattern && !configFilePath) {
    configFilePath = DEFAULT_CONFIG_FILE_NAMES.find(fileName =>
      FS.existsSync(fileName),
    );
  }

  const places: Place[] = [];

  if (configFilePath) {
    if (
      cliIgnorePattern ||
      cliFilePattern ||
      cliTemplatePath ||
      cliDataModulePath ||
      cliCommentStylesString
    ) {
      console.warn(
        Chalk.yellow(
          'By specifying `--config` option, all of `[file-pattern]`/`--ignore`/`--template`/`--data`/`--comment-styles` will be ignored.',
        ),
      );
    }

    const cwd = Path.dirname(configFilePath);
    const {places: placeConfigs, ignore} = await importGlobalConfig(
      Path.resolve(configFilePath),
    );

    places.push(
      ...Object.entries(placeConfigs).map(([key, value]) => {
        const {template, data, commentStyles} =
          typeof value === 'object' ? value : {};

        return {
          filePattern: key,
          ignore,
          cwd,
          template,
          data,
          commentStyles,
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

    places.push({
      filePattern: cliFilePattern,
      ignore: cliIgnorePattern,
      cwd: undefined,
      template: cliTemplatePath
        ? FS.readFileSync(cliTemplatePath, 'utf8')
        : undefined,
      data: cliDataModulePath
        ? await importDefaultFallback(Path.resolve(cliDataModulePath))
        : undefined,
      commentStyles: cliCommentStylesString
        ? cliCommentStylesString.split(',')
        : undefined,
    });
  }

  if (toUpdate && toAssert) {
    console.error(
      Chalk.red('Options `--update` and `--assert` can not co-exist.'),
    );
    process.exit(1);
  }

  let upToDate = true;

  for (const place of places) {
    const entryUpToDate = await inplate(place, {
      silent,
      update: toUpdate,
    });

    if (upToDate && !entryUpToDate) {
      upToDate = false;
    }
  }

  process.exit(!upToDate && toAssert ? 1 : 0);
}

type InplateOptions = {
  silent: boolean;
  update: boolean;
};

async function inplate(
  {
    filePattern,
    ignore,
    template: defaultTemplate,
    data: defaultData,
    commentStyles: specifiedCommentStyles,
    cwd = process.cwd(),
  }: Place,
  {silent, update: toUpdate}: InplateOptions,
): Promise<boolean> {
  const resolvedSpecifiedCommentStyles = specifiedCommentStyles
    ? resolveConfigCommentStyles(specifiedCommentStyles)
    : undefined;

  const filePatterns = filePattern.split(',');

  const filePaths = filePatterns.flatMap(filePattern =>
    Glob.hasMagic(filePattern)
      ? Glob.sync(filePattern, {
          absolute: true,
          cwd,
          nodir: true,
          ignore: ignore ?? '**/node_modules/**',
        })
      : [Path.resolve(cwd, filePattern)],
  );

  let upToDate = true;

  for (const filePath of filePaths) {
    const fileName = Path.basename(filePath);

    const configModulePath = DEFAULT_FILE_CONFIG_MODULE_EXTENSIONS.map(
      extension => `${filePath}${extension}`,
    ).find(path => FS.existsSync(path));

    let template: string | true | undefined;
    let data: object | undefined;
    let commentStyles: CommentStyle[] | undefined;

    if (configModulePath) {
      const config = await importDefaultFallback<PlaceConfig>(configModulePath);

      template = config.template;

      data = config.data;

      commentStyles =
        config.commentStyles && config.commentStyles.length > 0
          ? resolveConfigCommentStyles(config.commentStyles)
          : undefined;
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
        resolvedSpecifiedCommentStyles || getCommentStylesByFileName(fileName);
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
          updatedContent = await Prettier!.format(updatedContent, {
            filepath: filePath,
            ...prettierOptions,
          });
        } catch (error) {
          // Ignore error.
        }
      }
    } catch (error) {
      console.error(Chalk.red(`error: ${relativeFilePath}`));
      console.error((error as Error).message);
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

type Place = {
  filePattern: string;
  ignore: string | string[] | Glob.IgnoreLike | undefined;
  cwd: string | undefined;
  template: string | true | undefined;
  data: object | undefined;
  commentStyles: (string | CommentStyle)[] | undefined;
};

type GlobalConfig = {
  places: Record<string, PlaceConfig | true>;
  ignore?: string;
};

type PlaceConfig = {
  ignore?: string;
  template?: string | true;
  data?: object;
  commentStyles?: string[];
};

async function importGlobalConfig(path: string): Promise<GlobalConfig> {
  const module = await import(URL.pathToFileURL(path).href);

  return module.default
    ? {
        places: module.default,
        ignore: module.ignore,
      }
    : module.places
      ? {
          places: module.places,
          ignore: module.ignore,
        }
      : {
          places: module,
        };
}
