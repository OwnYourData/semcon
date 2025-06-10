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
exports.VaultifierWeb = void 0;
const oidc_client_1 = require("oidc-client");
const __1 = require("..");
const constants_1 = require("../constants");
const crypto_1 = require("../crypto");
const interfaces_1 = require("../interfaces");
const storage_1 = require("../storage");
const urls_1 = require("../urls");
const defaultOptions = {
    repo: undefined,
    clientId: undefined,
    baseUrlParamName: 'URL',
    // for legacy reasons
    baseUrlParamNameAlt: 'PIA_URL',
    appKeyParamName: 'APP_KEY',
    appSecretParamName: 'APP_SECRET',
    masterKeyParamName: 'MASTER_KEY',
    nonceParamName: 'NONCE',
    clientIdParamName: 'client_id',
    clientSecretParamName: 'client_secret',
    authorizationCodeParamName: 'code',
    stateParamName: 'state',
};
class VaultifierWeb {
    constructor(options, vaultifier) {
        this.options = options;
        this.vaultifier = vaultifier;
        this.initialize = (config = {}) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const vaultifier = this.vaultifier;
            if (!vaultifier)
                return undefined;
            // vaultifier must be valid in order to proceed with initialization
            if (!vaultifier.isValid())
                return undefined;
            const { oAuthType, } = config;
            const { appKeyParamName, appSecretParamName, authorizationCodeParamName, stateParamName, clientIdParamName, clientSecretParamName, masterKeyParamName, nonceParamName, } = this.options;
            let { clientId, } = this.options;
            const getParam = VaultifierWeb._getParamAccessor();
            const appKey = getParam(appKeyParamName);
            const appSecret = getParam(appSecretParamName);
            // if clientId parameter is specified as query parameter it is already the second step client id parameter of OAuth
            clientId = (_a = getParam(clientIdParamName)) !== null && _a !== void 0 ? _a : clientId;
            const authorizationCode = getParam(authorizationCodeParamName);
            let credentials = undefined;
            if (appKey && appSecret)
                credentials = {
                    appKey,
                    appSecret,
                };
            else if (authorizationCode && clientId)
                credentials = {
                    authorizationCode,
                    clientId,
                    state: getParam(stateParamName),
                };
            const masterKey = getParam(masterKeyParamName);
            const nonce = getParam(nonceParamName);
            const end2end = (masterKey && nonce) ? {
                masterKey,
                nonce,
            } : undefined;
            vaultifier.options.credentials = credentials;
            vaultifier.options.privateKeyCredentials = end2end;
            try {
                // try initializing vaultifier to see if credentials are working
                yield vaultifier.initialize();
            }
            catch ( /* */_b) { /* */ }
            // if we could not authorize until this stage
            // we try to login via OAuth, if supported
            const isAuthenticated = yield vaultifier.isAuthenticated();
            if (!isAuthenticated) {
                const oAuthSupport = oAuthType;
                if (clientId && oAuthSupport && oAuthSupport.type === interfaces_1.OAuthType.AUTHORIZATION_CODE) {
                    // create PKCE secret
                    const pkceSecret = crypto_1.getRandomString(32);
                    // const hashedSecret = btoa(await createSha256Hex(pkceSecret));
                    const redirectUrl = urls_1.VaultifierUrls.getRedirectUrl();
                    // we need this secret for later OAuth token retrieval
                    storage_1.Storage.set(constants_1.StorageKey.PKCE_SECRET, pkceSecret);
                    storage_1.Storage.set(constants_1.StorageKey.OAUTH_REDIRECT_URL, redirectUrl);
                    window.location.href = vaultifier.urls.getOAuthAuthorizationCode(clientId, window.encodeURIComponent(redirectUrl), pkceSecret);
                    // we just wait forever as the browser is now changing the visible page ;-)
                    yield new Promise(() => undefined);
                }
                const idprov = oAuthType;
                if (idprov === null || idprov === void 0 ? void 0 : idprov.authority) {
                    const redirectUrl = urls_1.VaultifierUrls.getRedirectUrl();
                    storage_1.Storage.set(constants_1.StorageKey.APPLICATION_ID, idprov.applicationId);
                    storage_1.Storage.set(constants_1.StorageKey.OAUTH_REDIRECT_URL, redirectUrl);
                    const um = new oidc_client_1.UserManager({
                        authority: idprov.authority,
                        client_id: idprov.clientId,
                        scope: idprov.scope,
                        response_type: idprov.responseType,
                        redirect_uri: redirectUrl,
                    });
                    um.signinRedirect();
                    // we just wait forever as the browser is now changing the visible page ;-)
                    yield new Promise(() => undefined);
                }
            }
            const newUrl = new URL(window.location.href);
            // remove sensitive information while preserving probably important url parameters
            newUrl.searchParams.delete(appKeyParamName);
            newUrl.searchParams.delete(appSecretParamName);
            newUrl.searchParams.delete(masterKeyParamName);
            newUrl.searchParams.delete(nonceParamName);
            newUrl.searchParams.delete(clientIdParamName);
            newUrl.searchParams.delete(clientSecretParamName);
            newUrl.searchParams.delete(authorizationCodeParamName);
            newUrl.searchParams.delete(stateParamName);
            window.history.replaceState(undefined, document.title, newUrl.toString());
            return vaultifier;
        });
    }
    /**
     * Creates a Vaultifier object by retrieving connection data from URL query parameters
     */
    static create(options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const getParam = VaultifierWeb._getParamAccessor();
            const _options = Object.assign(Object.assign({}, defaultOptions), options);
            const { baseUrlParamName, baseUrlParamNameAlt, repo, } = _options;
            let { baseUrl } = _options;
            if (!baseUrl) {
                baseUrl = (_a = getParam(baseUrlParamName)) !== null && _a !== void 0 ? _a : getParam(baseUrlParamNameAlt);
                if (baseUrl) {
                    // in web environments we want to persist the base url
                    // if it was passed via URL parameter
                    // this is because if we use OAuth for login
                    // we'll lose all parameters after redirect, hence we have to persist it
                    storage_1.Storage.set(constants_1.StorageKey.BASE_URL, baseUrl);
                }
                else
                    // first of all we try to fetch a stored value (see above for saving the value)
                    // if this does not work we just fall back to the window's location origin, if there is no parameter specified
                    baseUrl = storage_1.Storage.get(constants_1.StorageKey.BASE_URL) || window.location.origin;
            }
            let vaultifier = new __1.Vaultifier(baseUrl, {
                repo,
            });
            try {
                yield vaultifier.getVaultSupport();
            }
            catch (e) {
                console.error(e);
                vaultifier = undefined;
            }
            return new VaultifierWeb(_options, vaultifier);
        });
    }
}
exports.VaultifierWeb = VaultifierWeb;
VaultifierWeb._getParamAccessor = () => {
    const params = new URL(window.location.href).searchParams;
    return (name) => params.get(name) || undefined;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2Vudmlyb25tZW50cy93ZWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTBDO0FBRTFDLDBCQUFxRTtBQUNyRSw0Q0FBMEM7QUFDMUMsc0NBQTRDO0FBQzVDLDhDQUFtRjtBQUNuRix3Q0FBcUM7QUFDckMsa0NBQXlDO0FBa0V6QyxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsSUFBSSxFQUFFLFNBQVM7SUFDZixRQUFRLEVBQUUsU0FBUztJQUNuQixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQjtJQUNyQixtQkFBbUIsRUFBRSxTQUFTO0lBQzlCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLGtCQUFrQixFQUFFLFlBQVk7SUFDaEMsa0JBQWtCLEVBQUUsWUFBWTtJQUNoQyxjQUFjLEVBQUUsT0FBTztJQUN2QixpQkFBaUIsRUFBRSxXQUFXO0lBQzlCLHFCQUFxQixFQUFFLGVBQWU7SUFDdEMsMEJBQTBCLEVBQUUsTUFBTTtJQUNsQyxjQUFjLEVBQUUsT0FBTztDQUN4QixDQUFDO0FBRUYsTUFBYSxhQUFhO0lBT3hCLFlBQ2tCLE9BQTZCLEVBQzdCLFVBQXVCO1FBRHZCLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBQzdCLGVBQVUsR0FBVixVQUFVLENBQWE7UUE0RHpDLGVBQVUsR0FBRyxDQUFPLFNBQXFCLEVBQUUsRUFBbUMsRUFBRTs7WUFDOUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUVuQyxJQUFJLENBQUMsVUFBVTtnQkFDYixPQUFPLFNBQVMsQ0FBQztZQUVuQixtRUFBbUU7WUFDbkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3ZCLE9BQU8sU0FBUyxDQUFDO1lBRW5CLE1BQU0sRUFDSixTQUFTLEdBQ1YsR0FBRyxNQUFNLENBQUM7WUFFWCxNQUFNLEVBQ0osZUFBZSxFQUNmLGtCQUFrQixF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