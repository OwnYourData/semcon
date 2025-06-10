# Semcon-JS

A js-library to interact with Semanic Container.

**IMPORTANT:** This library is under development. Therefore not everything will work as expected. Actually sometimes we don't even know what should be expected :-)

## Example

```javascript
import { Semcon } from 'semcon-js';

async function main() {

  # connect data container
  const semcon = new Semcon('https://playground2.data-container.net');
  await semcon.initialize();

  // check if provided data is valid
  const isValid = await semcon.isValid();
  console.log(`connection is ${isValid ? 'valid' : 'invalid'}`);

  // read a record
  const item = await semcon.getItem({id: 110});
  console.log('data:', item); 
}

main().catch(console.error);
```

## Install

`npm install semcon-js`

## Examples

