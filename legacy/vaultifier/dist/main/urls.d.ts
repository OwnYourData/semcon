import { VaultItemQuery, VaultItemsQuery } from './interfaces';
export declare class VaultifierUrls {
    baseUrl: string;
    private repo?;
    readonly active: string;
    readonly support: string;
    readonly token: string;
    readonly privateKey: string;
    readonly postData: string;
    readonly postItem: string;
    readonly getRepos: string;
    readonly usagePolicy: string;
    readonly info: string;
    readonly eidasToken: string;
    constructor(baseUrl: string, repo?: string | undefined);
    private getPagingParam;
    private getMultiple;
    getMetaItems: (query?: VaultItemsQuery | undefined) => string;
    getItems: (query?: VaultItemsQuery | undefined) => string;
    private getSingle;
    getItem: (query: VaultItemQuery) => string;
    getData: (query: VaultItemQuery) => string;
    getProvis: (query: VaultItemQuery) => string;
    deleteItem: (query: VaultItemQuery) => string;
    putItem: (query: VaultItemQuery) => string;
    getSchemas: () => string;
    resolveInstallCode: (code: string) => string;
    publicKey: () => string;
    getEncryptedPassword: (nonce: string) => string;
    getOAuthAuthorizationCode: (clientId: string, redirectUri: string, codeChallenge: string) => string;
    getGenericUrl: (url: string) => string;
    getEidasExternalUrl: (id: number, token: string, redirectUrl: string) => string;
    getOidcSignInUrl: (code: string, state: string, redirectUrl: string, applicationId: string) => string;
    static getRedirectUrl: () => string;
    setRepo: (repo: string) => string;
}
