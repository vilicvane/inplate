import {getCommentStylesByFileName, updateContent} from '../library/index.js';

test('javascript', () => {
  const data = {};

  Object.setPrototypeOf(data, {text: 'hello, inplate!'});

  const args = [data, getCommentStylesByFileName('foo.js')] as const;

  const input = `\
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

  const output = `\
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
  const args = [
    {text: 'hello, inplate!'},
    getCommentStylesByFileName('foo.jsx'),
  ] as const;

  const input = `\
// @inplate {{text}}
// @end

/* @inplate {{text}} */
/* @end */

<Element>
  {/* @inplate {{text}} */}
  {/* @end */}
</Element>
`;

  const output = `\
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
  const args = [
    {text: 'hello, inplate!'},
    getCommentStylesByFileName('foo.html'),
  ] as const;

  const input = `\
<script>
// @inplate {{text}}
// @end

/* @inplate {{text}} */
/* @end */
</script>

<!-- @inplate &lt;{{text}}&gt; -->
<!-- @end -->
`;

  const output = `\
<script>
// @inplate {{text}}
hello, inplate!
// @end

/* @inplate {{text}} */
hello, inplate!
/* @end */
</script>

<!-- @inplate &lt;{{text}}&gt; -->
<hello, inplate!>
<!-- @end -->
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('yaml', () => {
  const args = [
    {text: 'hello, inplate!'},
    getCommentStylesByFileName('foo.yaml'),
  ] as const;

  const input = `\
# @inplate {{text}}
# @end
`;

  const output = `\
# @inplate {{text}}
hello, inplate!
# @end
`;

  expect(updateContent(input, ...args)).toBe(output);

  expect(updateContent(output, ...args)).toBe(output);
});

test('inplate-line content should have only one line', () => {
  const args = [
    {text: 'foo\nbar'},
    getCommentStylesByFileName('foo.js'),
  ] as const;

  expect(() =>
    updateContent(
      `\
  // @inplate-line {{text}}
  `,
      ...args,
    ),
  ).toThrow('@inplate-line');

  expect(() =>
    updateContent(
      `\
  /* @inplate-line {{text}} */
  `,
      ...args,
    ),
  ).toThrow('@inplate-line');
});
