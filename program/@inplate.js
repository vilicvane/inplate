const escapeStringRegexp = require('escape-string-regexp');
const Handlebars = require('handlebars');

const {removeIndent, addIndent} = require('./@utils');

const S = '[ \\t]*';
const SS = '[ \\t]';

const AT_INPLATE = '@inplate';
const AT_PLATE = '@plate';
const AT_END = '@end';

exports.updateContent = function (fileContent, data, commentStyles) {
  let {regex, regexMetadataArray} = buildInplateRegex(commentStyles);

  let newLine = (fileContent.match(/\r?\n/) || ['\n'])[0];

  fileContent = fileContent.replace(regex, (...groups) => {
    for (let {
      template: templateIndexes,
      beforeContent: beforeContentIndexes,
      afterContent: afterContentIndexes,
      indent: indentIndexes,
      decoder,
      encoder,
      commentRegex,
    } of regexMetadataArray) {
      let template = templateIndexes
        .map(index => groups[index])
        .find(template => typeof template === 'string');

      if (typeof template !== 'string') {
        continue;
      }

      if (commentRegex) {
        template = template.replace(commentRegex, '');
      }

      if (decoder) {
        template = decoder(template);
      }

      template = removeIndent(template);

      let beforeContent = beforeContentIndexes
        .map(index => groups[index])
        .find(content => typeof content === 'string');
      let afterContent = afterContentIndexes
        .map(index => groups[index])
        .find(content => typeof content === 'string');
      let indent = indentIndexes
        .map(index => groups[index])
        .find(content => typeof content === 'string');

      template = addIndent(template, indent);

      if (!template.endsWith(newLine)) {
        template += newLine;
      }

      let content = Handlebars.compile(template)(data);

      if (encoder) {
        content = encoder(content);
      }

      return `${beforeContent}${content}${afterContent}`;
    }
  });

  return fileContent;
};

function buildInplateRegex(commentStyles) {
  /*
    // @inplate
    // {{template}}
    // @plate
    generated content
    // @end

    // @inplate {{template}}
    generated content
    // @end

    <!-- @inplate {{template}} -->
    generated content
    <!-- @end -->

    <!-- @inplate
      {{template}}
      {{template}}
    -->
    generated content
    <!-- @end -->
  */

  let regexMetadataArray = [];
  let regexSources = [];

  let groupCount = 0;

  for (let {opening, closing, decoder, encoder} of commentStyles) {
    let openingSource = escapeStringRegexp(opening);
    let closingSource = closing && escapeStringRegexp(closing);

    let regexSource;
    let templateIndexes = [];
    let beforeContentIndexes = [];
    let afterContentIndexes = [];
    let indentIndexes = [];
    let commentRegex;

    if (closingSource) {
      regexSource = [
        `^((${S})${openingSource}\\s*${AT_INPLATE}${S}(?:\\r?\\n)?([^]+?)${S}${closingSource}${S}\\r?\\n)`,
        //         <!--                @inplate                   {{template}} -->
        '[^]*?',
        `^(${S}${openingSource}\\s*${AT_END}${S}${closingSource})`,
        //       <!--                @end         -->
      ].join('');

      beforeContentIndexes.push(++groupCount);
      indentIndexes.push(++groupCount);
      templateIndexes.push(++groupCount);
      afterContentIndexes.push(++groupCount);
    } else {
      regexSource = [
        [
          '(',
          `^(${S})${openingSource}${S}${AT_INPLATE}${S}\\r?\\n((?:^${S}${openingSource}.*\\r?\\n)+)${S}${openingSource}${S}${AT_PLATE}${S}\\r?\\n`,
          //        #                   @inplate           \n            #   {{template}}    \n  multi   #                   @plate           \n
          '|',
          `^(${S})${openingSource}${S}${AT_INPLATE}${SS}(.*)\\r?\\n`,
          //        #                   @inplate        {{template}}\n
          ')',
        ].join(''),
        '[^]*?',
        `^(${S}${openingSource}${S}${AT_END}${S})$`,
        //       #                   @end
      ].join('');

      beforeContentIndexes.push(++groupCount);
      indentIndexes.push(++groupCount);
      templateIndexes.push(++groupCount);
      indentIndexes.push(++groupCount);
      templateIndexes.push(++groupCount);
      afterContentIndexes.push(++groupCount);

      commentRegex = new RegExp(`^${S}${openingSource}`, 'gm');
    }

    regexSources.push(regexSource);

    regexMetadataArray.push({
      template: templateIndexes,
      beforeContent: beforeContentIndexes,
      afterContent: afterContentIndexes,
      indent: indentIndexes,
      decoder,
      encoder,
      commentRegex,
    });
  }

  let regex = new RegExp(
    regexSources.map(source => `(?:${source})`).join('|'),
    'gm',
  );

  return {
    regex,
    regexMetadataArray,
  };
}
