var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { UserManager } from "oidc-client";
import { Vaultifier } from "..";
import { StorageKey } from "../constants";
import { getRandomString } from '../crypto';
import { OAuthType } from "../interfaces";
import { Storage } from "../storage";
import { VaultifierUrls } from "../urls";
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
export class VaultifierWeb {
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
                if (clientId && oAuthSupport && oAuthSupport.type === OAuthType.AUTHORIZATION_CODE) {
                    // create PKCE secret
                    const pkceSecret = getRandomString(32);
                    // const hashedSecret = btoa(await createSha256Hex(pkceSecret));
                    const redirectUrl = VaultifierUrls.getRedirectUrl();
                    // we need this secret for later OAuth token retrieval
                    Storage.set(StorageKey.PKCE_SECRET, pkceSecret);
                    Storage.set(StorageKey.OAUTH_REDIRECT_URL, redirectUrl);
                    window.location.href = vaultifier.urls.getOAuthAuthorizationCode(clientId, window.encodeURIComponent(redirectUrl), pkceSecret);
                    // we just wait forever as the browser is now changing the visible page ;-)
                    yield new Promise(() => undefined);
                }
                const idprov = oAuthType;
                if (idprov === null || idprov === void 0 ? void 0 : idprov.authority) {
                    const redirectUrl = VaultifierUrls.getRedirectUrl();
                    Storage.set(StorageKey.APPLICATION_ID, idprov.applicationId);
                    Storage.set(StorageKey.OAUTH_REDIRECT_URL, redirectUrl);
                    const um = new UserManager({
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
                    Storage.set(StorageKey.BASE_URL, baseUrl);
                }
                else
                    // first of all we try to fetch a stored value (see above for saving the value)
                    // if this does not work we just fall back to the window's location origin, if there is no parameter specified
                    baseUrl = Storage.get(StorageKey.BASE_URL) || window.location.origin;
            }
            let vaultifier = new Vaultifier(baseUrl, {
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
VaultifierWeb._getParamAccessor = () => {
    const params = new URL(window.location.href).searchParams;
    return (name) => params.get(name) || undefined;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2Vudmlyb25tZW50cy93ZWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUUxQyxPQUFPLEVBQXVDLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBMkMsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBa0V6QyxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsSUFBSSxFQUFFLFNBQVM7SUFDZixRQUFRLEVBQUUsU0FBUztJQUNuQixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQjtJQUNyQixtQkFBbUIsRUFBRSxTQUFTO0lBQzlCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLGtCQUFrQixFQUFFLFlBQVk7SUFDaEMsa0JBQWtCLEVBQUUsWUFBWTtJQUNoQyxjQUFjLEVBQUUsT0FBTztJQUN2QixpQkFBaUIsRUFBRSxXQUFXO0lBQzlCLHFCQUFxQixFQUFFLGVBQWU7SUFDdEMsMEJBQTBCLEVBQUUsTUFBTTtJQUNsQyxjQUFjLEVBQUUsT0FBTztDQUN4QixDQUFDO0FBRUYsTUFBTSxPQUFPLGFBQWE7SUFPeEIsWUFDa0IsT0FBNkIsRUFDN0IsVUFBdUI7UUFEdkIsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7UUFDN0IsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQTREekMsZUFBVSxHQUFHLENBQU8sU0FBcUIsRUFBRSxFQUFtQyxFQUFFOztZQUM5RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENB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