let Prettier;

try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({default: Prettier} = await import('prettier'));
} catch {
  // ignore
}

export {Prettier};
