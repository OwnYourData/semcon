"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vaultifier = void 0;
const communicator_1 = require("./communicator");
const constants_1 = require("./constants");
const crypto_1 = require("./crypto");
const errors_1 = require("./errors");
const helpers_1 = require("./helpers");
const interfaces_1 = require("./interfaces");
const storage_1 = require("./storage");
const urls_1 = require("./urls");
class Vaultifier {
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
        this.urls = new urls_1.VaultifierUrls(baseUrl, repo);
        this.communicator = new communicator_1.Communicator();
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
                    if (provider.type === interfaces_1.OAuthType.CLIENT_CREDENTIALS ||
                        provider.type === interfaces_1.OAuthType.AUTHORIZATION_CODE) {
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
                        const password = yield crypto_1.decrypt({
                            value: encryptedPassword,
                            nonce,
                        }, {
                            cipher: masterKey,
                            isHashed: true,
                        });
                        const encryptedPrivateKey = JSON.parse((yield this.communicator.get(this.urls.privateKey, true))
                            .data.password_key);
                        this.privateKey = yield crypto_1.decrypt(encryptedPrivateKey, { cipher: password });
                    }
                    // basically, this "if" is not really necessary
                    // it just assures we do not read from the storage unnecessarily
                    // probably this does not make any difference in performance, but I consider it as good practice :-)
                    if (!this.publicKey || !this.privateKey) {
                        const storedKeys = storage_1.Storage.getObject(e2eKeysKey);
                        if (storedKeys) {
                            if (!this.publicKey)
                                this.publicKey = storedKeys.publicKey;
                            if (!this.privateKey)
                                this.privateKey = storedKeys.privateKey;
                        }
                    }
                    storage_1.Storage.set(e2eKeysKey, {
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
                return crypto_1.encrypt(dataString, this.publicKey);
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
            return helpers_1.parsePostResult(res);
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
            return helpers_1.parsePostResult(res);
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
            return helpers_1.parseVaultItem(data, this.privateKey);
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
            const items = yield Promise.all(response.data.map((data) => __awaiter(this, void 0, void 0, function* () { return helpers_1.parseVaultItem(data, this.privateKey); })));
            return {
                items,
                paging: helpers_1.getPaging(response),
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
                items: response.data.map(helpers_1.parseVaultItemMeta),
                paging: helpers_1.getPaging(response),
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
                    const pkceSecret = storage_1.Storage.pop(constants_1.StorageKey.PKCE_SECRET);
                    const oauthRedirectUrl = storage_1.Storage.pop(constants_1.StorageKey.OAUTH_REDIRECT_URL);
                    const applicationId = storage_1.Storage.pop(constants_1.StorageKey.APPLICATION_ID);
                    if (pkceSecret && oauthRedirectUrl) {
                        body = {
                            code: credentials.authorizationCode,
                            client_id: credentials.clientId,
                            code_verifier: pkceSecret,
                            grant_type: interfaces_1.OAuthType.AUTHORIZATION_CODE,
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
                        const storedCredentials = storage_1.Storage.getObject(vaultCredentialsStorageKey);
                        if (storedCredentials) {
                            this.options.credentials = storedCredentials;
                        }
                        else
                            throw new Error('No valid credentials provided.');
                    }
                    body = {
                        client_id: this.options.credentials.appKey,
                        client_secret: this.options.credentials.appSecret,
                        grant_type: interfaces_1.OAuthType.CLIENT_CREDENTIALS,
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
                    storage_1.Storage.set(vaultCredentialsStorageKey, this.options.credentials);
                }
            }
            catch (_c) {
                throw new errors_1.UnauthorizedError();
            }
            return token;
        });
    }
}
exports.Vaultifier = Vaultifier;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmF1bGl0Zmllci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YXVsaXRmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLGlEQUErRTtBQUMvRSwyQ0FBeUM7QUFDekMscUNBQTBEO0FBQzFELHFDQUE2QztBQUM3Qyx1Q0FBMkY7QUFDM0YsNkNBbUJzQjtBQUN0Qix1Q0FBb0M7QUFDcEMsaUNBQXdDO0FBbUJ4QyxNQUFhLFVBQVU7SUFXckI7OztPQUdHO0lBQ0gsWUFDRSxPQUFlLEVBQ1IsVUFBNkIsRUFBRTtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQWlJeEM7Ozs7Ozs7O1dBUUc7UUFDSCxzQkFBaUIsR0FBRyxDQUFDLE9BQXdCLEVBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBdUYvRzs7Ozs7O1dBTUc7UUFDSCxTQUFJLEdBQUcsQ0FDTCxHQUFXLEVBQ1gsUUFBa0IsRUFDbEIsSUFBVSxFQUNnQixFQUFFLGdEQUFDLE9BQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBLEdBQUEsQ0FBQztRQUVwRzs7Ozs7O1dBTUc7UUFDSCxRQUFHLEdBQUcsQ0FDSixHQUFXLEVBQ1gsUUFBa0IsRUFDbEIsSUFBVSxFQUNnQixFQUFFLGdEQUFDLE9BQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBLEdBQUEsQ0FBQztRQUVuRzs7Ozs7V0FLRztRQUNILFFBQUcsR0FBRyxDQUNKLEdBQVcsRUFDWCxRQUFrQixFQUNRLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMs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