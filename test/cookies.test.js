import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareLighthouseRun } from '../runLighthouse.js';

const url = 'https://seller.test.shopee.sg/target';

test('moves an extra Cookie header into the Chrome cookie jar', () => {
  const { cookies, lighthouseFlags } = prepareLighthouseRun(url, {
    extraHeaders: {
      Cookie: 'session=abc=123; csrf=token',
      'x-test-header': 'kept'
    }
  });

  assert.deepEqual(cookies, [
    {
      name: 'session',
      value: 'abc=123',
      url,
      secure: true
    },
    {
      name: 'csrf',
      value: 'token',
      url,
      secure: true
    }
  ]);
  assert.deepEqual(lighthouseFlags.extraHeaders, {
    'x-test-header': 'kept'
  });
  assert.equal(lighthouseFlags.disableStorageReset, true);
});

test('preserves supported fields from structured cookies', () => {
  const { cookies, lighthouseFlags } = prepareLighthouseRun(url, {
    cookies: [
      {
        name: 'session',
        value: 'secret',
        domain: '.test.shopee.sg',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        expires: -1,
        browserSpecificField: 'ignored'
      }
    ]
  });

  assert.deepEqual(cookies, [
    {
      name: 'session',
      value: 'secret',
      domain: '.test.shopee.sg',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax'
    }
  ]);
  assert.equal('cookies' in lighthouseFlags, false);
  assert.equal(lighthouseFlags.disableStorageReset, true);
});

test('does not change unrelated Lighthouse flags', () => {
  const flags = {
    logLevel: 'info',
    extraHeaders: { Authorization: 'Bearer example' }
  };
  const result = prepareLighthouseRun(url, flags);

  assert.deepEqual(result.cookies, []);
  assert.deepEqual(result.lighthouseFlags, flags);
  assert.notEqual(result.lighthouseFlags, flags);
});
