var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Communicator } from './communicator';
import { StorageKey } from './constants';
import { decrypt, encrypt } from './crypto';
import { UnauthorizedError } from './errors';
import { getPaging, parsePostResult, parseVaultItem, parseVaultItemMeta } from './helpers';
import { OAuthType, } from './interfaces';
import { Storage } from './storage';
import { VaultifierUrls } from './urls';
export class Vaultifier {
    /**
     *
     * @param baseUrl The base url of your data-container.
     */
    constructor(baseUrl, options = {}) {
        this.options = options;
        /**
         * This enables to intercept all network calls made by Vaultifier
         * This is helpful, if you are already using a library for all your network calls
         * If "setNetworkAdapter" is called without providing an adapter, Vaultifier's default adapter is used
         *
         * @param {NetworkAdapter} [adapter]
         *
         * @returns {NetworkAdapter} the network adapter that will be used by Vaultifier
         */
        this.setNetworkAdapter = (adapter) => this.communicator.setNetworkAdapter(adapter);
        /**
         * A generic method to post data to the data container
         *
         * @param url Url where to send the request to. Has to start with a leading slash "/"
         * @param usesAuth Whether or not the call should be authorized or not
         * @param data Data to pass to the endpoint
         */
        this.post = (url, usesAuth, data) => __awaiter(this, void 0, void 0, function* () { return this.communicator.post(this.urls.getGenericUrl(url), usesAuth, data); });
        /**
         * A generic method to put data to the data container
         *
         * @param url Url where to send the request to. Has to start with a leading slash "/"
         * @param usesAuth Whether or not the call should be authorized or not
         * @param data Data to pass to the endpoint
         */
        this.put = (url, usesAuth, data) => __awaiter(this, void 0, void 0, function* () { return this.communicator.put(this.urls.getGenericUrl(url), usesAuth, data); });
        /**
         * A generic method to get data from the data container
         *
         * @param url Url where to send the request to. Has to start with a leading slash "/"
         * @param usesAuth Whether or not the call should be authorized or not
         */
        this.get = (url, usesAuth) => __awaiter(this, void 0, void 0, function* () { return this.communicator.get(this.urls.getGenericUrl(url), usesAuth); });
        const { repo, } = options;
        this.urls = new VaultifierUrls(baseUrl, repo);
        this.communicator = new Communicator();
    }
    /**
     * Returns an object that can be checked for supported features of the provided endpoint
     */
    getVaultSupport() {
        return __awaiter(this, void 0, void 0, function* () {
            // only fetch it once
            if (this.supports)
                return this.supports;
            const { data } = yield this.communicator.get(this.urls.active);
            const oAuth = [];
            if (Array.isArray(data.oauth)) {
                for (const provider of data.oauth) {
                    if (provider.type === OAuthType.CLIENT_CREDENTIALS ||
                        provider.type === OAuthType.AUTHORIZATION_CODE) {
                        oAuth.push(provider);
                    }
                    else {
                        oAuth.push({
                            authority: provider.authority,
                            clientId: provider.client_id,
                            scope: provider.scope,
                            responseType: provider.response_type,
                            redirectUrl: provider.redirect_url,
                            title: provider.title,
                            imageUrl: provider.title.pic,
                            applicationId: provider.application_id,
                        });
                    }
                }
            }
            return this.supports = {
                repos: !!data.repos,
                authentication: !!data.auth,
                scopes: data.scopes,
                oAuth,
            };
        });
    }
    /**
     * Returns an object with data that describes the Vault
     */
    getVaultInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.info)
                return this.info;
            const { data } = yield this.communicator.get(this.urls.info, true);
            return this.info = data;
        });
    }
    /**
     * Retrieves the usage policy of the give data container
     *
     * @returns the usage policy (which format is (Turtle)[https://www.w3.org/TR/turtle/]) as a string
     */
    getUsagePolicy() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.get(this.urls.usagePolicy, true);
            return data;
        });
    }
    /**
     * Sets the vault's credentials
     *
     * @param credentials Object containing credentials
     */
    setCredentials(credentials) {
        this.options.credentials = credentials;
    }
    /**
     * Returns true, if vault has (probably) valid credentials
     * This does not indicate, whether the vault will accept the credentials or not!
     */
    hasCredentials() {
        const { credentials, } = this.options;
        return !!credentials && !!credentials.appKey && !!credentials.appSecret;
    }
    /**
     * Initializes Vaultifier (authorizes against data container if necessary)
     *
     * @returns {Promise<void>}
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const supports = yield this.getVaultSupport();
            if (supports.authentication) {
                this.communicator.setTokenCallback(() => this._authorize());
                yield this.communicator.refreshToken();
            }
        });
    }
    /**
     * This switches to the given repository name
     * As the data container also provides the functionality to have public keys per repo
     * this function could be used to create a new instance of Vaultifier
     * But as this functionality is not yet active, it just changes the repo without doing anything further
     *
     * @param repoId Repository that should be used in the returned instance of Vaultifier
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    fromRepo(repoId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.options.repo = repoId;
            this.urls.setRepo(repoId);
            return this;
        });
    }
    /**
     * Enables or disables end-to-end encryption
     *
     * @param isActive
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    setEnd2EndEncryption(isActive = true) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const e2eKeysKey = 'e2e-keys';
            // if endpoint does not support repos, there is no way to encrypt data, because of missing public key
            if (!isActive || !((_a = this.supports) === null || _a === void 0 ? void 0 : _a.repos)) {
                this.publicKey = undefined;
                this.privateKey = undefined;
            }
            else {
                try {
                    this.publicKey = (yield this.communicator.get(this.urls.publicKey(), true))
                        .data.public_key;
                    if (this.options.privateKeyCredentials) {
                        const { nonce, masterKey } = this.options.privateKeyCredentials;
                        const encryptedPassword = (yield this.communicator.get(this.urls.getEncryptedPassword(this.options.privateKeyCredentials.nonce)))
                            .data.cipher;
                        const password = yield decrypt({
                            value: encryptedPassword,
                            nonce,
                        }, {
                            cipher: masterKey,
                            isHashed: true,
                        });
                        const encryptedPrivateKey = JSON.parse((yield this.communicator.get(this.urls.privateKey, true))
                            .data.password_key);
                        this.privateKey = yield decrypt(encryptedPrivateKey, { cipher: password });
                    }
                    // basically, this "if" is not really necessary
                    // it just assures we do not read from the storage unnecessarily
                    // probably this does not make any difference in performance, but I consider it as good practice :-)
                    if (!this.publicKey || !this.privateKey) {
                        const storedKeys = Storage.getObject(e2eKeysKey);
                        if (storedKeys) {
                            if (!this.publicKey)
                                this.publicKey = storedKeys.publicKey;
                            if (!this.privateKey)
                                this.privateKey = storedKeys.privateKey;
                        }
                    }
                    Storage.set(e2eKeysKey, {
                        privateKey: this.privateKey,
                        publicKey: this.publicKey,
                    });
                }
                catch ( /* Yeah I know, error handling could be done better here... */_b) { /* Yeah I know, error handling could be done better here... */ }
            }
            return this.getEncryptionSupport();
        });
    }
    getEncryptionSupport() {
        return {
            supportsEncryption: !!this.publicKey,
            supportsDecryption: !!this.privateKey,
        };
    }
    get _usesEncryption() { return this.publicKey !== undefined && this.publicKey.length > 0; }
    encryptOrNot(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._usesEncryption &&
                this.publicKey) {
                const dataString = JSON.stringify(value);
                return encrypt(dataString, this.publicKey);
            }
            return value;
        });
    }
    /**
     * Posts a value into the data container's repository, without any metadata
     *
     * @param {Object} value JSON data to post into the repository
     *
     * @returns {Promise<VaultMinMeta>}
     */
    postData(value) {
        return __awaiter(this, void 0, void 0, function* () {
            const postData = yield this.getPutpostData({
                data: value,
            });
            const res = yield this.communicator.post(this.urls.postData, true, postData);
            return parsePostResult(res);
        });
    }
    /**
     * Get a specified value from the vault's repository, without any metadata
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<VaultData>} the value of the specified item
     */
    getData(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.communicator.get(this.urls.getData(query), true);
            const item = res.data;
            try {
                // item usually contains JSON data, therefore we try to parse the string
                item.data = JSON.parse(item.data);
            }
            catch ( /* */_a) { /* */ }
            return item;
        });
    }
    /**
     * Contains all necessary transformations and checks for posting/putting data to the data container
     *
     * @param item Data to be posted/put to the data container
     */
    getPutpostData(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, id, meta } = item;
            // POST/PUT object is slightly different to our internal structure
            const dataToPost = {
                // we deliberately do not send a DRI
                // DRI generation is only handled by server
                meta,
                data: yield this.encryptOrNot(data),
            };
            if (id)
                dataToPost.id = id;
            return JSON.stringify(dataToPost);
        });
    }
    /**
     * Posts an item into the data container's repository, including any metadata
     *
     * @param item data that is going to be passed to the data container
     *
     * @returns {Promise<VaultMinMeta>}
     */
    postItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.communicator.post(this.urls.postItem, true, yield this.getPutpostData(item));
            return parsePostResult(res);
        });
    }
    /**
     * Puts an item into the data container's repository (update), including any metadata
     *
     * @param item data that is going to be passed to the data container for updating the record
     */
    updateItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.communicator.put(this.urls.putItem(item), true, yield this.getPutpostData(item));
            return res.data;
        });
    }
    /**
     * Retrieve data from the data container's repository including its metadata
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<VaultItem>}
     */
    getItem(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.get(this.urls.getItem(query), true);
            return parseVaultItem(data, this.privateKey);
        });
    }
    /**
     * Retreive provisioning data for a specific data record
     *
     * @param {VaultItemQuery} query Query parameters to specify the record that has to be queried
     *
     * @returns {Promise<string[]>}
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getProvis(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.get(this.urls.getProvis(query), true);
            return data;
        });
    }
    /**
     * Retrieve data from data container including all metadata
     *
     * @param query Query parameters to specify the record that has to be queried
     */
    getItems(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.communicator.get(this.urls.getItems(query), true);
            const items = yield Promise.all(response.data.map((data) => __awaiter(this, void 0, void 0, function* () { return parseVaultItem(data, this.privateKey); })));
            return {
                items,
                paging: getPaging(response),
            };
        });
    }
    /**
     * Deletes one item
     *
     * @param query Query parameter to specify the records that have to be deleted
     *
     * @returns {Promise<VaultMinMeta>}
     */
    deleteItem(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.delete(this.urls.deleteItem(query), true);
            return data;
        });
    }
    /**
     * Returns a list of vault items, but only with metadata (no content)
     *
     * @param query Query parameter to specify the records that have to be deleted
     */
    getMetaItems(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.communicator.get(this.urls.getMetaItems(query), true);
            return {
                items: response.data.map(parseVaultItemMeta),
                paging: getPaging(response),
            };
        });
    }
    /**
     * Gets all repositories for the current plugin credentials
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getRepos() {
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield this.getVaultSupport()).repos) {
                const { data } = yield this.communicator.get(this.urls.getRepos, true);
                return data;
            }
            /* This function is not implemented in semantic containers */
            return;
        });
    }
    /**
     * Queries all SOyA schemas that are available within the user's vault
     */
    getSchemas() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.get(this.urls.getSchemas(), true);
            return data.map((x) => ({
                dri: x,
                title: undefined,
            }));
        });
    }
    /**
     * Checks, whether a valid endpoint is specified or not
     *
     * @returns true, if Vaultifier has all minimum necessary data and was initalized correctly.
     */
    isValid() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // currently we check the validity, if there is an endpoint specified 
                // that can deliver a response to the vault support api call
                yield this.getVaultSupport();
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Checks, whether the user is authenticated or not
     * Also returns true if Vault does not support authentication
     */
    isAuthenticated() {
        return __awaiter(this, void 0, void 0, function* () {
            const support = yield this.getVaultSupport();
            if (support.authentication)
                return this.communicator.hasToken();
            else
                return true;
        });
    }
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
    resolveInstallCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.get(this.urls.resolveInstallCode(code), false);
            this.options.credentials = {
                appKey: data.key,
                appSecret: data.secret,
            };
            return this.options.credentials;
        });
    }
    /**
     * Creates an eidas token that can be used as a callback parameter for the eids response POST url
     *
     * @param id Vault item's id
     *
     * @deprecated currently not implemented, might be re-enabled in a future release
     */
    getEidasToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.communicator.post(this.urls.eidasToken, true, {
                id,
            });
            return data.token;
        });
    }
    _authorize() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const vaultCredentialsStorageKey = 'vault-credentials';
            let token;
            try {
                const credentials = this.options.credentials;
                let body;
                let tokenUrl = undefined;
                if (
                // TODO: We should also check the possibility for code authentication
                // support.oAuth?.type === OAuthType.AUTHORIZATION_CODE &&
                credentials === null || 
                // TODO: We should also check the possibility for code authentication
                // support.oAuth?.type === OAuthType.AUTHORIZATION_CODE &&
                credentials === void 0 ? void 0 : 
                // TODO: We should also check the possibility for code authentication
                // support.oAuth?.type === OAuthType.AUTHORIZATION_CODE &&
                credentials.authorizationCode) {
                    // TODO: hm, this is probably not that nice...
                    // we have to rethink our authentication mechanism, it's already very complex...
                    const existingToken = this.communicator.getToken();
                    // TODO: at the moment there is no way how to refresh the token once it was issued
                    if ((yield this.isAuthenticated()) && existingToken)
                        return existingToken;
                    const pkceSecret = Storage.pop(StorageKey.PKCE_SECRET);
                    const oauthRedirectUrl = Storage.pop(StorageKey.OAUTH_REDIRECT_URL);
                    const applicationId = Storage.pop(StorageKey.APPLICATION_ID);
                    if (pkceSecret && oauthRedirectUrl) {
                        body = {
                            code: credentials.authorizationCode,
                            client_id: credentials.clientId,
                            code_verifier: pkceSecret,
                            grant_type: OAuthType.AUTHORIZATION_CODE,
                            redirect_uri: oauthRedirectUrl,
                        };
                    }
                    else if (oauthRedirectUrl && credentials.state && applicationId) {
                        tokenUrl = this.urls.getOidcSignInUrl(credentials.authorizationCode, credentials.state, oauthRedirectUrl, applicationId);
                    }
                }
                else {
                    if ((credentials === null || credentials === void 0 ? void 0 : credentials.appKey) && (credentials === null || credentials === void 0 ? void 0 : credentials.appSecret))
                        this.options.credentials = credentials;
                    else {
                        const storedCredentials = Storage.getObject(vaultCredentialsStorageKey);
                        if (storedCredentials) {
                            this.options.credentials = storedCredentials;
                        }
                        else
                            throw new Error('No valid credentials provided.');
                    }
                    body = {
                        client_id: this.options.credentials.appKey,
                        client_secret: this.options.credentials.appSecret,
                        grant_type: OAuthType.CLIENT_CREDENTIALS,
                    };
                }
                if ((_a = this.options.credentials) === null || _a === void 0 ? void 0 : _a.scope)
                    body.scope = this.options.credentials.scope;
                let response;
                if (tokenUrl)
                    response = yield this.communicator.get(tokenUrl, false);
                else
                    response = yield this.communicator.post(this.urls.token, false, body);
                token = response.data.access_token;
                // we only save the credentials if they are appKey and appSecret
                // authorizationCode does not make sense to store
                if (((_b = this.options.credentials) === null || _b === void 0 ? void 0 : _b.appKey) && this.options.credentials.appSecret) {
                    Storage.set(vaultCredentialsStorageKey, this.options.credentials);
                }
            }
            catch (_c) {
                throw new UnauthorizedError();
            }
            return token;
        });
    }
}
/* static functions */
/**
 * Creates a valid repo path out of the specified string parameters
 *
 * @param path
 *
 * @returns {string}
 *
 * @deprecated currently not implemented, might be re-enabled in a future release
 */
Vaultifier.getRepositoryPath = (...path) => path
    // filter empty strings
    .filter(x => !!x)
    .join('.');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmF1bGl0Zmllci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YXVsaXRmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQW1DLE1BQU0sZ0JBQWdCLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN6QyxPQUFPLEVBQWdCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMzRixPQUFPLEVBR0wsU0FBUyxHQWdCVixNQUFNLGNBQWMsQ0FBQztBQUN0QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFtQnhDLE1BQU0sT0FBTyxVQUFVO0lBV3JCOzs7T0FHRztJQUNILFlBQ0UsT0FBZSxFQUNSLFVBQTZCLEVBQUU7UUFBL0IsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFpSXhDOzs7Ozs7OztXQVFHO1FBQ0gsc0JBQWlCLEdBQUcsQ0FBQyxPQUF3QixFQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQXVGL0c7Ozs7OztXQU1HO1FBQ0gsU0FBSSxHQUFHLENBQ0wsR0FBVyxFQUNYLFFBQWtCLEVBQ2xCLElBQVUsRUFDZ0IsRUFBRSxnREFBQyxPQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQSxHQUFBLENBQUM7UUFF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