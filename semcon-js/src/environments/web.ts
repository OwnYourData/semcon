import { UserManager } from "oidc-client";

import { OAuthIdentityProvider, OAuthSupport, Semcon } from "..";
import { StorageKey } from "../constants";
import { getRandomString } from '../utils/core-utils';
import { OAuthType, SemconCredentials } from "../interfaces";
import { Storage } from "../storage";
import { SemconUrls } from "../urls";

export interface SemconWebOptions {
  /**
   * Repository, where to write to. This only applies to data containers and is specified in your plugin's manifest
   * 
   * @deprecated currently not implemented, might be re-enabled in a future release
   */
  repo?: string,
  /**
   * Base URL for semcon instance
   */
  baseUrl?: string,
  /**
   * Client id used for OAuth authentication
   */
  clientId?: string,
  /**
   * Name of query parameter used to retrieve the data container's base url
   */
  baseUrlParamName: string,
  /**
   * Name of query parameter used to retrieve the master key for decrypting data
   */
  clientIdParamName: string,
  /**
   * Name of query parameter used to retrieve the oAuth client secret
   */
  clientSecretParamName: string,
  /**
   * Name of query parameter used to retrieve the oAuth authorization code
   */
  authorizationCodeParamName: string,
  /**
   * Name of query parameter used to retrieve the oAuth state
   */
  stateParamName: string,
}

export interface InitConfig {
  oAuthType?: OAuthSupport | OAuthIdentityProvider,
}

const defaultOptions: SemconWebOptions = {
  repo: undefined,
  clientId: undefined,
  baseUrlParamName: 'URL',
  clientIdParamName: 'client_id',
  clientSecretParamName: 'client_secret',
  authorizationCodeParamName: 'code',
  stateParamName: 'state',
};

const AUTH_COOKIE_NAME = 'Authorization';

export class SemconWeb {
  private static _getParamAccessor = () => {
    const params = new URL(window.location.href).searchParams;

    return (name: string): string | undefined => params.get(name) || undefined;
  }

  constructor(
    public readonly options: SemconWebOptions,
    public readonly semcon?: Semcon,
  ) { }

  /**
   * Creates a Semcon object by retrieving connection data from URL query parameters
   */
  static async create(options?: Partial<SemconWebOptions>): Promise<SemconWeb> {
    const getParam = SemconWeb._getParamAccessor();
    const _options: SemconWebOptions = {
      ...defaultOptions,
      ...options,
    }

    const {
      baseUrlParamName,
    } = _options

    let {
      baseUrl
    } = _options;

    if (!baseUrl) {
      baseUrl = getParam(baseUrlParamName);

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

    let semcon: Semcon | undefined = new Semcon(
      baseUrl,
    );

    semcon.addAuthenticationRefreshCallback((token) => {
      if (!token)
        SemconWeb.removeAuthCookie();
      else
        // setting the cookie for current hostname is a strong assumption
        // however, security in browsers anyway don't let us set cookies for other domains
        // this means, the cookie mechanism for authentication only works for SemconWeb
        // used on the same domain as their backend (semcon)
        document.cookie = `${AUTH_COOKIE_NAME}=Bearer ${token};Domain=${window.location.hostname};SameSite=strict`;
    });

    try {
      await semcon.getSemconSupport();
    }
    catch (e) {
      console.error(e);
      semcon = undefined;
    }

    return new SemconWeb(
      _options,
      semcon,
    );
  }

  initialize = async (config: InitConfig = {}): Promise<Semcon | undefined> => {
    const semcon = this.semcon;

    if (!semcon)
      return undefined;

    // semcon must be valid in order to proceed with initialization
    if (!semcon.isValid())
      return undefined;

    const {
      oAuthType,
    } = config;

    const {
      authorizationCodeParamName,
      stateParamName,
      clientIdParamName,
      clientSecretParamName,
    } = this.options;

    let {
      clientId,
    } = this.options;

    const getParam = SemconWeb._getParamAccessor();

    // if clientId parameter is specified as query parameter it is already the second step client id parameter of OAuth
    clientId = getParam(clientIdParamName) ?? clientId;
    const authorizationCode = getParam(authorizationCodeParamName);

    let credentials: SemconCredentials | undefined = undefined;
    if (authorizationCode && clientId)
      credentials = {
        authorizationCode,
        clientId,
        state: getParam(stateParamName),
      };

    semcon.options.credentials = credentials;

    try {
      // try initializing semcon to see if credentials are working
      await semcon.initialize();
    } catch { /* */ }


    // if we could not authorize until this stage
    // we try to login via OAuth, if supported
    const isAuthenticated = await semcon.isAuthenticated();
    if (!isAuthenticated) {
      const oAuthSupport = oAuthType as OAuthSupport;

      if (clientId && oAuthSupport && oAuthSupport.type === OAuthType.AUTHORIZATION_CODE) {
        // create PKCE secret
        const pkceSecret = getRandomString(32);
        // const hashedSecret = btoa(await createSha256Hex(pkceSecret));
        const redirectUrl = SemconUrls.getRedirectUrl();

        // we need this secret for later OAuth token retrieval
        Storage.set(StorageKey.PKCE_SECRET, pkceSecret);
        Storage.set(StorageKey.OAUTH_REDIRECT_URL, redirectUrl);

        window.location.href = semcon.urls.getOAuthAuthorizationCode(clientId, window.encodeURIComponent(redirectUrl), pkceSecret);
        // we just wait forever as the browser is now changing the visible page ;-)
        await new Promise(() => undefined);
      }

      const idprov = oAuthType as OAuthIdentityProvider | undefined;
      if (idprov?.authority) {
        const redirectUrl = SemconUrls.getRedirectUrl();

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
        await new Promise(() => undefined);
      }
    }

    const newUrl = new URL(window.location.href);

    // remove sensitive information while preserving probably important url parameters
    newUrl.searchParams.delete(clientIdParamName);
    newUrl.searchParams.delete(clientSecretParamName);
    newUrl.searchParams.delete(authorizationCodeParamName);
    newUrl.searchParams.delete(stateParamName);

    window.history.replaceState(undefined, document.title, newUrl.toString());

    return semcon;
  }

  static removeAuthCookie = () => {
    // removing the cookie from current hostname is a strong assumption
    // however, security in browsers anyway don't let us set cookies for other domains
    // this means, the cookie mechanism for authentication only works for SemconWeb
    // used on the same domain as their backend (semcon)
    document.cookie = `${AUTH_COOKIE_NAME}=remove;expires=${new Date(0).toUTCString()};Domain=${window.location.hostname};SameSite=strict`;
  }

  static clearAuthentication = async () => {
    SemconWeb.removeAuthCookie();

    Storage.remove(StorageKey.PKCE_SECRET);
    Storage.remove(StorageKey.OAUTH_REDIRECT_URL);
    Storage.remove(StorageKey.APPLICATION_ID);
    Storage.remove(StorageKey.OAUTH_REDIRECT_URL);
    Storage.remove(StorageKey.SEMCON_CREDENTIALS);
  }
}