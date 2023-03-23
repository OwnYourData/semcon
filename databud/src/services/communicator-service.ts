import { Vaultifier } from 'vaultifier';

let vaultifier: Vaultifier;

export const setInstance = (instance: Vaultifier): Vaultifier => vaultifier = instance;
export const getInstance = (): Vaultifier => vaultifier;