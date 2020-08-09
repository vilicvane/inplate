const Chalk = require('chalk');
const Diff = require('diff');

function removeIndent(content) {
  let [firstIndent, ...restIndents] = content.match(/^[ \\t]*(?=\S)/gm);

  let index = 0;

  outer: for (; index < firstIndent.length; index++) {
    let char = firstIndent[index];

    for (let indent of restIndents) {
      if (indent[index] !== char) {
        break outer;
      }
    }
  }

  return content.replace(new RegExp(`^.{${index}}`, 'gm'), '');
}

function addIndent(content, indent) {
  return content.replace(/^(?=.+)/gm, indent);
}

function printDiffs(left, right) {
  let diffs = Diff.diffLines(left, right);

  let firstLinesRegex = /^(?:.*\r?\n){1,3}/;
  let lastLinesRegex = /(?:.*\r?\n){1,3}$/;
  let firstAndLastLinesRegex = /^(?:((?:.*\r?\n){3})[^]*?((?:.*\r?\n){3})|([^]*))$/;

  process.stdout.write('\n');

  for (let [index, diff] of diffs.entries()) {
    if (diff.added) {
      process.stdout.write(Chalk.green(annotateLines(diff.value, '+')));
    } else if (diff.removed) {
      process.stdout.write(Chalk.red(annotateLines(diff.value, '-')));
    } else {
      let excerpts =
        index === 0
          ? diff.value.match(lastLinesRegex).slice(0, 1)
          : index === diffs.length - 1
          ? diff.value.match(firstLinesRegex).slice(0, 1)
          : diff.value
              .match(firstAndLastLinesRegex)
              .slice(1, 4)
              .filter(part => !!part);

      process.stdout.write(
        Chalk.dim(annotateLines(excerpts.join('\n...\n\n'))),
      );
    }
  }

  process.stdout.write('\n');

  function annotateLines(text, type) {
    let prefix;
    let color;
    let bgColor;

    switch (type) {
      case '+':
        prefix = '+ ';
        color = 'green';
        bgColor = 'bgGreen';
        break;
      case '-':
        prefix = '- ';
        color = 'red';
        bgColor = 'bgRed';
        break;
      default:
        prefix = ' ';
        color = 'dim';
        bgColor = 'bgGray';
        break;
    }

    let endingWithNewLine = /\n$/.test(text);

    text = text.replace(/\r/g, Chalk.reset[bgColor]('^M'));

    text = Chalk[color](text.replace(/^(?=.*\n|.+)/gm, prefix));

    if (!endingWithNewLine) {
      text += `\n  ${Chalk.reset[bgColor]('No newline at end of file')}\n`;
    }

    return text;
  }
}

module.exports = {
  removeIndent,
  addIndent,
  printDiffs,
};
