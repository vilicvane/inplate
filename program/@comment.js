import Chalk from 'chalk';
import * as HTMLEntities from 'html-entities';

const hasOwnProperty = Object.prototype.hasOwnProperty;

export const COMMENT_STYLE_DICT = {
  '#': {opening: '#'},
  '//': {opening: '//'},
  '/*': {opening: '/*', closing: '*/'},
  '{/*': {opening: '{/*', closing: '*/}'},
  '<!--': {
    opening: '<!--',
    closing: '-->',
    decoder: content => HTMLEntities.decode(content),
    escape: true,
  },
};

export const COMMENT_STYLE_KEYS = Object.keys(COMMENT_STYLE_DICT);

const COMMENTS = [
  {
    match: /\.(?:js|ts|jsonc?)$/,
    comments: [COMMENT_STYLE_DICT['//'], COMMENT_STYLE_DICT['/*']],
  },
  {
    match: /\.(?:jsx|tsx)$/,
    comments: [
      COMMENT_STYLE_DICT['//'],
      COMMENT_STYLE_DICT['/*'],
      COMMENT_STYLE_DICT['{/*'],
    ],
  },
  {
    match: /\.(?:html?)$/,
    comments: [
      COMMENT_STYLE_DICT['//'],
      COMMENT_STYLE_DICT['/*'],
      COMMENT_STYLE_DICT['<!--'],
      COMMENT_STYLE_DICT['{/*'],
    ],
  },
  {
    match: /\.mdx?$/,
    comments: Object.values(COMMENT_STYLE_DICT),
  },
  {
    match: /\.(?:ya?ml|toml)$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
  {
    match: /^Dockerfile$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
];

const DEFAULT_COMMENT_STYLES = [COMMENT_STYLE_DICT['#']];

export function getCommentStylesByFileName(fileName) {
  for (const {match, comments: optionsArray} of COMMENTS) {
    if (match.test(fileName)) {
      return optionsArray;
    }
  }

  return DEFAULT_COMMENT_STYLES;
}

export function resolveConfigCommentStyles(styles) {
  return styles.map(style => {
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
