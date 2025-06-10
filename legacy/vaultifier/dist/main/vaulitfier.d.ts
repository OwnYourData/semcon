import { NetworkAdapter, NetworkResponse } from './communicator';
import { MultiResponse, PrivateKeyCredentials, VaultCredentials, VaultData, VaultEncryptionSupport, VaultInfo, VaultItem, VaultItemQuery, VaultItemsQuery, VaultMeta, VaultMinMeta, VaultPostItem, VaultRepo, VaultSchema, VaultSupport } from './interfaces';
import { VaultifierUrls } from './urls';
/**
 *
 * @param credentials "Identifier" (appKey) that was generated after registering the plugin. "Secret" (appSecret) that was generated after registering the plugin.
 * @param privateKeyCredentials Credentials for decrypting E2E encrypted data
 * @param repo Repository, where to write to. This is defined in your plugin's manifest
 */
export interface VaultifierOptions {
    credentials?: VaultCredentials;
    privateKeyCredentials?: PrivateKeyCredentials;
    /**
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    repo?: string;
}
export declare class Vaultifier {
    options: VaultifierOptions;
    private publicKey?;
    private privateKey?;
    private communicator;
    private supports?;
    private info?;
    readonly urls: VaultifierUrls;
    /**
     *
     * @param baseUrl The base url of your data-container.
     */
    constructor(baseUrl: string, options?: VaultifierOptions);
    /**
     * Returns an object that can be checked for supported features of the provided endpoint
     */
    getVaultSupport(): Promise<VaultSupport>;
    /**
     * Returns an object with data that describes the Vault
     */
    getVaultInfo(): Promise<VaultInfo>;
    /**
     * Retrieves the usage policy of the give data container
     *
     * @returns the usage policy (which format is (Turtle)[https://www.w3.org/TR/turtle/]) as a string
     */
    getUsagePolicy(): Promise<string>;
    /**
     * Sets the vault's credentials
     *
     * @param credentials Object containing credentials
     */
    setCredentials(credentials: VaultCredentials): void;
    /**
     * Returns true, if vault has (probably) valid credentials
     * This does not indicate, whether the vault will accept the credentials or not!
     */
    hasCredentials(): boolean;
    /**
     * Initializes Vaultifier (authorizes against data container if necessary)
     *
     * @returns {Promise<void>}
     */
    initialize(): Promise<void>;
    /**
     * This switches to the given repository name
     * As the data container also provides the functionality to have public keys per repo
     * this function could be used to create a new instance of Vaultifier
     * But as this functionality is not yet active, it just changes the repo without doing anything further
     *
     * @param repoId Repository that should be used in the returned instance of Vaultifier
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    fromRepo(repoId: string): Promise<Vaultifier>;
    /**
     * This enables to intercept all network calls made by Vaultifier
     * This is helpful, if you are already using a library for all your network calls
     * If "setNetworkAdapter" is called without providing an adapter, Vaultifier's default adapter is used
     *
     * @param {NetworkAdapter} [adapter]
     *
     * @returns {NetworkAdapter} the network adapter that will be used by Vaultifier
     */
    setNetworkAdapter: (adapter?: NetworkAdapter | undefined) => NetworkAdapter;
    /**
     * Enables or disables end-to-end encryption
     *
     * @param isActive
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    setEnd2EndEncryption(isActive?: boolean): Promise<VaultEncryptionSupport>;
    getEncryptionSupport(): VaultEncryptionSupport;
    private get _usesEncryption();
    private encryptOrNot;
    /**
     * A generic method to post data to the data container
     *
     * @param url Url where to send the request to. Has to start with a leading slash "/"
     * @param usesAuth Whether or not the call should be authorized or not
     * @param data Data to pass to the endpoint
     */
    post: (url: string, usesAuth?: boolean | undefined, data?: any) => Promise<NetworkResponse>;
    /**
     * A generic method to put data to the data container
     *
     * @param url Url where to send the request to. Has to start with a leading slash "/"
     * @param usesAuth Whether or not the call should be authorized or not
     * @param data Data to pass to the endpoint
     */
    put: (url: string, usesAuth?: boolean | undefined, data?: any) => Promise<NetworkResponse>;
    /**
     * A generic method to get data from the data container
     *
     * @param url Url where to send the request to. Has to start with a leading slash "/"
     * @param usesAuth Whether or not the call should be authorized or not
     */
    get: (url: string, usesAuth?: boolean | undefined) => Promise<NetworkResponse>;
    /**
     * Posts a value into the data container's repository, without any metadata
     *
     * @param {Object} value JSON data to post into the repository
     *
     * @returns {Promise<VaultMinMeta>}
     */
    postData(value: any): Promise<VaultMinMeta>;
    /**
     * Get a specified value from the vault's repository, without any metadata
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<VaultData>} the value of the specified item
     */
    getData(query: VaultItemQuery): Promise<VaultData>;
    /**
     * Contains all necessary transformations and checks for posting/putting data to the data container
     *
     * @param item Data to be posted/put to the data container
     */
    private getPutpostData;
    /**
     * Posts an item into the data container's repository, including any metadata
     *
     * @param item data that is going to be passed to the data container
     *
     * @returns {Promise<VaultMinMeta>}
     */
    postItem(item: VaultPostItem): Promise<VaultMinMeta>;
    /**
     * Puts an item into the data container's repository (update), including any metadata
     *
     * @param item data that is going to be passed to the data container for updating the record
     */
    updateItem(item: VaultPostItem): Promise<VaultMinMeta>;
    /**
     * Retrieve data from the data container's repository including its metadata
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<VaultItem>}
     */
    getItem(query: VaultItemQuery): Promise<VaultItem>;
    /**
     * Retreive provisioning data for a specific data record
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<string[]>}
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getProvis(query: VaultItemQuery): Promise<string[]>;
    /**
     * Retrieve data from data container including all metadata
     *
     * @param query Query parameters to specify the record that has to be queried
     */
    getItems(query?: VaultItemsQuery): Promise<MultiResponse<VaultItem>>;
    /**
     * Deletes one item
     *
     * @param query Query parameter to specify the records that have to be deleted
     *
     * @returns {Promise<VaultMinMeta>}
     */
    deleteItem(query: VaultItemQuery): Promise<VaultMinMeta>;
    /**
     * Returns a list of vault items, but only with metadata (no content)
     *
     * @param query Query parameter to specify the records that have to be deleted
     */
    getMetaItems(query?: VaultItemsQuery): Promise<MultiResponse<VaultMeta>>;
    /**
     * Gets all repositories for the current plugin credentials
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getRepos(): Promise<VaultRepo[] | undefined>;
    /**
     * Queries all SOyA schemas that are available within the user's vault
     */
    getSchemas(): Promise<VaultSchema[]>;
    /**
     * Checks, whether a valid endpoint is specified or not
     *
     * @returns true, if Vaultifier has all minimum necessary data and was initalized correctly.
     */
    isValid(): Promise<boolean>;
    /**
     * Checks, whether the user is authenticated or not
     * Also returns true if Vault does not support authentication
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Resolves an install code (usually 6 digits) and returns a set of VaultCredentials, if successful.
     * VaultCredentials are automatically set to the Vaultifier instance as well.
     *
     * @param {string} code Install code, usually 6 digits
     *
     * @returns {Promise<VaultCredentials>}
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    resolveInstallCode(code: string): Promise<VaultCredentials>;
    /**
     * Creates an eidas token that can be used as a callback parameter for the eids response POST url
     *
     * @param id Vault item's id
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getEidasToken(id: number): Promise<string>;
    private _authorize;
    /**
     * Creates a valid repo path out of the specified string parameters
     *
     * @param path
     *
     * @returns {string}
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    static getRepositoryPath: (...path: Array<string>) => string;
}
