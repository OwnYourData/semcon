# Vaultifier

A js-library to interact with the [OwnYourData Data-Vault](https://data-vault.eu)

**IMPORTANT:** This library is under development. Therefore not everything will work as expected. Actually sometimes we don't even know what should be expected :-)

## Example

```javascript
import { Vaultifier } from 'vaultifier/dist/module'

const vaultifier = new Vaultifier(
  'https://data-vault.eu',
  Vaultifier.getRepositoryPath('eu', 'ownyourdata', 'testplugin'), // results in "eu.ownyourdata.testplugin"
  {
    appKey: 'app_key',
    appSecret: 'super_secret',
  },
);

// authenticate Vaultifier against data-vault
await vaultifier.initialize();
// enable end-to-end encryption (optional)
await vaultifier.setEnd2EndEncryption(true);

// check if provided data is valid and Vaultifier is authenticated (optional)
console.log(`Vaultifier is ${vaultifier.isValid() ? 'valid' : 'invalid'}`);

// send data to data vault
await vaultifier.postItem({
  foo: 'bar',
});
```

## Install

`npm install vaultifier`

## Examples

