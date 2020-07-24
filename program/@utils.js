exports.removeIndent = function (content) {
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
};

exports.addIndent = function (content, indent) {
  return content.replace(/^(?=.+)/gm, indent);
};
