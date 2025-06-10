import { OAuthIdentityProvider, OAuthSupport, Vaultifier } from "..";
export interface VaultifierWebOptions {
    /**
     * Repository, where to write to. This only applies to data containers and is specified in your plugin's manifest
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    repo?: string;
    /**
     * Base URL for vaultifier instance
     */
    baseUrl?: string;
    /**
     * Client id used for OAuth authentication
     */
    clientId?: string;
    /**
     * Name of query parameter used to retrieve the data container's base url
     */
    baseUrlParamName: string;
    /**
     * @deprecated
     *
     * Name of query parameter used to retrieve the data container's base url
     * This property only exists for legacy reasons
     */
    baseUrlParamNameAlt: string;
    /**
     * Name of query parameter used to retrieve the plugin's "Identifier" (appKey)
     */
    appKeyParamName: string;
    /**
     * Name of query parameter used to retrieve the plugin's "Secret" (appSecret)
     */
    appSecretParamName: string;
    /**
     * Name of query parameter used to retrieve the master key for decrypting data
     */
    masterKeyParamName: string;
    /**
     * Name of query parameter used to retrieve the nonce for decrypting data
     */
    nonceParamName: string;
    /**
     * Name of query parameter used to retrieve the oAuth client id
     */
    clientIdParamName: string;
    /**
     * Name of query parameter used to retrieve the oAuth client secret
     */
    clientSecretParamName: string;
    /**
     * Name of query parameter used to retrieve the oAuth authorization code
     */
    authorizationCodeParamName: string;
    /**
     * Name of query parameter used to retrieve the oAuth state
     */
    stateParamName: string;
}
export interface InitConfig {
    oAuthType?: OAuthSupport | OAuthIdentityProvider;
}
export declare class VaultifierWeb {
    readonly options: VaultifierWebOptions;
    readonly vaultifier?: Vaultifier | undefined;
    private static _getParamAccessor;
    constructor(options: VaultifierWebOptions, vaultifier?: Vaultifier | undefined);
    /**
     * Creates a Vaultifier object by retrieving connection data from URL query parameters
     */
    static create(options?: Partial<VaultifierWebOptions>): Promise<VaultifierWeb>;
    initialize: (config?: InitConfig) => Promise<Vaultifier | undefined>;
}
