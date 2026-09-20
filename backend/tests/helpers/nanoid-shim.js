/**
 * CommonJS stand-in for `nanoid` v5 (ESM-only) so Jest's CJS runtime can load
 * the modules that import it. Mapped via `moduleNameMapper` in jest.config.js —
 * production code and the real dependency are untouched.
 *
 * Uses the same unambiguous alphabet and crypto source as nanoid, so generated
 * ids are collision-free for test purposes.
 */
const { webcrypto } = require('node:crypto');

const DEFAULT_ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

function generate(alphabet, size) {
  const bytes = webcrypto.getRandomValues(new Uint8Array(size));
  let id = '';
  for (let i = 0; i < size; i += 1) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

module.exports = {
  nanoid: (size = 21) => generate(DEFAULT_ALPHABET, size),
  customAlphabet: (alphabet, size = 21) => () => generate(alphabet, size),
  customRandom: (alphabet, size, getRandom) => () => {
    const bytes = getRandom(size);
    let id = '';
    for (let i = 0; i < size; i += 1) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  },
  random: (bytes) => webcrypto.getRandomValues(new Uint8Array(bytes)),
};
