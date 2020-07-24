const {XmlEntities} = require('html-entities');

const COMMENT_STYLE_DICT = {
  '#': {opening: '#'},
  '//': {opening: '//'},
  '/*': {opening: '/*', closing: '*/'},
  '{/*': {opening: '{/*', closing: '*/}'},
  '<!--': {
    opening: '<!--',
    closing: '-->',
    decoder: content => XmlEntities.decode(content),
    encoder: content => XmlEntities.encode(content),
  },
};

exports.COMMENT_STYLE_DICT = COMMENT_STYLE_DICT;
exports.COMMENT_STYLE_KEYS = Object.keys(COMMENT_STYLE_DICT);

const COMMENTS = [
  {
    match: /\.(?:js|ts|json)$/,
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
    match: /\.ya?ml$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
  {
    match: /^Dockerfile$/,
    comments: [COMMENT_STYLE_DICT['#']],
  },
];

const DEFAULT_COMMENT_STYLES = [COMMENT_STYLE_DICT['#']];

exports.getCommentStylesByFileName = function (fileName) {
  for (let {match, comments: optionsArray} of COMMENTS) {
    if (match.test(fileName)) {
      return optionsArray;
    }
  }

  return DEFAULT_COMMENT_STYLES;
};
