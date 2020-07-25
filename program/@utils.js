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
      process.stdout.write(Chalk.green(prefixLines(diff.value, '+ ')));
    } else if (diff.removed) {
      process.stdout.write(Chalk.red(prefixLines(diff.value, '- ')));
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
        Chalk.dim(prefixLines(excerpts.join('\n...\n\n'), '  ')),
      );
    }
  }

  process.stdout.write('\n');

  function prefixLines(text, prefix) {
    return text.replace(/^(?=.*\r?\n)/gm, prefix);
  }
}

module.exports = {
  removeIndent,
  addIndent,
  printDiffs,
};
