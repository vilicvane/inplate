const {updateContent} = require('../program/@inplate');
const {getCommentStylesByFileName} = require('../program/@comment');

test('javascript', () => {
  let args = [{text: 'hello, inplate!'}, getCommentStylesByFileName('foo.js')];

  let input = `\
// @inplate {{text}}
// @end

// @inplate-line {{text}}


  // @inplate {{text}}
  // @end

  // @inplate-line {{text}}


// @inplate
// content:
//   {{text}}
// @plate
// @end

// @inplate
// invalid, missing @plate.
// @end

  // @inplate
  // content:
  //   {{text}}
  // @plate
  // @end

// @inplate
//   content:
//     {{text}}
// @plate
// @end

/* @inplate {{text}} */
/* @end */

  /* @inplate {{text}} */
  /* @end */

/* @inplate-line {{text}} */


  /* @inplate-line {{text}} */


/* @inplate
content:
  {{text}}
*/
/* @end */

  /* @inplate
  content:
    {{text}}
  */
  /* @end */

/*
  @inplate
    content:
      {{text}}
 */
/* @end */
`;

  let output = `\
// @inplate {{text}}
hello, inplate!
// @end

// @inplate-line {{text}}
hello, inplate!

  // @inplate {{text}}
  hello, inplate!
  // @end

  // @inplate-line {{text}}
  hello, inplate!

// @inplate
// content:
//   {{text}}
// @plate
content:
  hello, inplate!
// @end

// @inplate
// invalid, missing @plate.
// @end

  // @inplate
  // content:
  //   {{text}}
  // @plate
  content:
    hello, inplate!
  // @end

// @inplate
//   content:
//     {{text}}
// @plate
content:
  hello, inplate!
// @end

/* @inplate {{text}} */
hello, inplate!
/* @end */

  /* @inplate {{text}} */
  hello, inplate!
  /* @end */

/* @inplate-line {{text}} */
hello, inplate!

  /* @inplate-line {{text}} */
  hello, inplate!

/* @inplate
content:
  {{text}}
*/
content:
  hello, inplate!
/* @end */

  /* @inplate
  content:
    {{text}}
  */
  content:
    hello, inplate!
  /* @end */

/*
  @inplate
    content:
      {{text}}
 */
content:
  hello, inplate!
/* @end */
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('javascript react', () => {
  let args = [{text: 'hello, inplate!'}, getCommentStylesByFileName('foo.jsx')];

  let input = `\
// @inplate {{text}}
// @end

/* @inplate {{text}} */
/* @end */

<Element>
  {/* @inplate {{text}} */}
  {/* @end */}
</Element>
`;

  let output = `\
// @inplate {{text}}
hello, inplate!
// @end

/* @inplate {{text}} */
hello, inplate!
/* @end */

<Element>
  {/* @inplate {{text}} */}
  hello, inplate!
  {/* @end */}
</Element>
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('html', () => {
  let args = [
    {text: 'hello, inplate!'},
    getCommentStylesByFileName('foo.html'),
  ];

  let input = `\
<script>
// @inplate {{text}}
// @end

/* @inplate {{text}} */
/* @end */
</script>

<!-- @inplate &lt;{{text}}> -->
<!-- @end -->
`;

  let output = `\
<script>
// @inplate {{text}}
hello, inplate!
// @end

/* @inplate {{text}} */
hello, inplate!
/* @end */
</script>

<!-- @inplate &lt;{{text}}> -->
&lt;hello, inplate!&gt;
<!-- @end -->
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('yaml', () => {
  let args = [
    {text: 'hello, inplate!'},
    getCommentStylesByFileName('foo.yaml'),
  ];

  let input = `\
# @inplate {{text}}
# @end
`;

  let output = `\
# @inplate {{text}}
hello, inplate!
# @end
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('inplate-line content should have only one line', () => {
  let args = [{text: 'foo\nbar'}, getCommentStylesByFileName('foo.js')];

  expect(() =>
    updateContent(
      `\
  // @inplate-line {{text}}
  `,
      ...args,
    ),
  ).toThrowError('@inplate-line');

  expect(() =>
    updateContent(
      `\
  /* @inplate-line {{text}} */
  `,
      ...args,
    ),
  ).toThrowError('@inplate-line');
});
