# Semcon-JS

A js-library to interact with Semanic Container.

**IMPORTANT:** This library is under development. Therefore not everything will work as expected. Actually sometimes we don't even know what should be expected :-)

## Example

```javascript
import { Semcon } from 'semcon-js/dist/module'

const semcon = new Semcon(
  'https://playground.data-container.net',
  {
    appKey: 'app_key',
    appSecret: 'super_secret',
  },
);

// authenticate Semcon against a data container
await semcon.initialize();

// check if provided data is valid and Semcon is authenticated (optional)
console.log(`connection is ${semcon.isValid() ? 'valid' : 'invalid'}`);

// send data
await semcon.postItem({
  foo: 'bar',
});
```

## Install

`npm install semcon-js`

## Examples

