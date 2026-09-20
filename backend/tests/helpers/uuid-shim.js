/**
 * CommonJS stand-in for `uuid` v13 (ESM-only) so Jest's CJS runtime can load any
 * module that imports it. Mapped via `moduleNameMapper` in jest.config.js —
 * production code and the real dependency are untouched.
 */
const { randomUUID, randomFillSync } = require('node:crypto');

const NIL = '00000000-0000-0000-0000-000000000000';

function v4() {
  return randomUUID();
}

function v1() {
  return randomUUID();
}

function validate(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

module.exports = {
  v1,
  v4,
  validate,
  version: (value) => (validate(value) ? Number(value.charAt(14)) : NaN),
  NIL,
  stringify: (bytes) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'),
  parse: (uuid) => {
    const bytes = new Uint8Array(16);
    const hex = String(uuid).replace(/-/g, '');
    for (let i = 0; i < 16; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  },
  randomFillSync,
};
