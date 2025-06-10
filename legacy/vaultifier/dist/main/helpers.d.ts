import { NetworkResponse } from './communicator';
import { Paging, VaultItem, VaultMeta, VaultMinMeta } from './interfaces';
export declare const parseVaultItemMeta: (data: any) => VaultMeta;
export declare const decryptOrNot: (item: any, privateKey?: string | undefined) => Promise<any>;
export declare const parseVaultItem: (data: any, privateKey?: string | undefined) => Promise<VaultItem>;
export declare const parsePostResult: (response: NetworkResponse) => VaultMinMeta;
export declare const getPaging: (response: NetworkResponse) => Paging;
