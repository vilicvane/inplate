import type PrettierDefault from 'prettier';

let Prettier: typeof PrettierDefault | undefined;

try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({default: Prettier} = await import('prettier'));
} catch {
  // ignore
}

export {Prettier};
