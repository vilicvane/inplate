import Chalk from 'chalk';
import * as HTMLEntities from 'html-entities';

const hasOwnProperty = Object.prototype.hasOwnProperty;

export type CommentStyle = {
  opening: string;
  closing?: string;
  decoder?: (content: string) => string;
  encoder?: (content: string) => string;
  escape?: boolean;
};

export const COMMENT_STYLE_DICT: Record<string, CommentStyle> = {
  '#': {opening: '#'},
  '//': {opening: '//'},
  '--': {opening: '--'},
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

export type Comment = {
  match: RegExp;
  comments: CommentStyle[];
};

const COMMENTS: Comment[] = [
  {
    match:
      /\.(?:[cm]?[jt]s|jsonc?|java|groovy|gradle|[ch](?:|pp|xx)?|cs|go|rs|swift|kts?|dart|sass|scss|less|styl)$/,
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
    match: /\.(?:p|post)?css$/,
    comments: [COMMENT_STYLE_DICT['/*']],
  },
  {
    match: /\.(?:html?|xht(?:ml)?|xml|svg)$/,
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
    match: /\.(?:ya?ml|toml|sh)$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
  {
    match: /^Dockerfile$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
  {
    match: /\.sql$/,
    comments: [COMMENT_STYLE_DICT['--'], COMMENT_STYLE_DICT['/*']],
  },
];

const DEFAULT_COMMENT_STYLES = [COMMENT_STYLE_DICT['#']];

export function getCommentStylesByFileName(fileName: string): CommentStyle[] {
  for (const {match, comments: optionsArray} of COMMENTS) {
    if (match.test(fileName)) {
      return optionsArray;
    }
  }

  return DEFAULT_COMMENT_STYLES;
}

export function resolveConfigCommentStyles(
  styles: (string | CommentStyle)[],
): CommentStyle[] {
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
