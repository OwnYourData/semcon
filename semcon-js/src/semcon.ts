import { Communicator, MaybeAuthenticated, NetworkAdapter, NetworkResponse } from './communicator';
import { StorageKey } from './constants';
import { UnauthorizedError } from './errors';
import { getPaging, parsePostResult, parseSemconItem, parseSemconItemMeta } from './helpers';
import {
  MultiResponse,
  OAuthExternalProvider,
  OAuthSupport,
  OAuthType,
  SemconCredentials,
  SemconData,
  SemconInfo,
  SemconItem,
  SemconItemQuery,
  SemconItemsQuery,
  SemconMeta,
  SemconMinMeta,
  SemconPostItem,
  SemconSchema,
  SemconSupport,
} from './interfaces';
import { Storage } from './storage';
import { SemconUrls } from './urls';

import { OAuthIdentityProvider } from '.';

/**
 *
 * @param credentials "Identifier" (appKey) that was generated after registering the plugin. "Secret" (appSecret) that was generated after registering the plugin.
 * @param privateKeyCredentials Credentials for decrypting E2E encrypted data
 * @param repo Repository, where to write to. This is defined in your plugin's manifest
 */
export interface SemconOptions {
  credentials?: SemconCredentials;
}

export class Semcon {

  private communicator: Communicator;

  private authCallbacks: Set<(token: string | undefined) => unknown> = new Set();

  private supports?: SemconSupport;
  private info?: SemconInfo;

  public readonly urls: SemconUrls;

  /**
   *
   * @param baseUrl The base url of your data-container.
   */
  constructor(
    baseUrl: string,
    public options: SemconOptions = {},
  ) {
    this.urls = new SemconUrls(
      baseUrl
    );

    this.communicator = new Communicator();
    this.addAuthenticationRefreshCallback(() => {
      // at every token refresh, it may happen that SemconSupport changes
      // therefore we reset our cache-object, such that for the next call
      // to getSemconSupport, it will be fetched again
      this.supports = undefined;
    });
  }

  /**
   * Returns an object that can be checked for supported features of the provided endpoint
   */
  async getSemconSupport(): Promise<SemconSupport> {
    // only fetch it once
    if (this.supports)
      return this.supports;

    const { data } = await this.communicator.get(this.urls.active, 'optional');
    const oAuth: (OAuthSupport | OAuthIdentityProvider | OAuthExternalProvider)[] = [];

    if (Array.isArray(data.oauth)) {
      for (const provider of data.oauth) {
        if (
          provider.type === OAuthType.CLIENT_CREDENTIALS ||
          provider.type === OAuthType.AUTHORIZATION_CODE
        ) {
          oAuth.push(provider);
        }
        else if (provider.link) {
          oAuth.push({
            link: provider.link,
            title: provider.title,
            imageUrl: provider.title.pic,
          });
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
          })
        }
      }
    }

    const user = data.user;
    return this.supports = {
      repos: !!data.repos,
      authentication: !!data.auth,
      authenticationMode: data.auth_method?.mode || undefined,
      scopes: data.scopes,
      oAuth,
      user: user ? {
        userName: user.user_name,
        fullName: user.full_name,
        organization: user.organization,
      } : undefined,
    };
  }

  /**
   * Returns an object with data that describes the data container
   */
  async getSemconInfo(): Promise<SemconInfo> {
    if (this.info)
      return this.info;

    const { data } = await this.communicator.get(this.urls.info, 'optional');

    return this.info = data;
  }

  /**
   * Sets the semcon's credentials
   * 
   * @param credentials Object containing credentials
   */
  setCredentials(credentials: SemconCredentials): void {
    this.options.credentials = credentials;
  }

  /**
   * Returns true, if semcon has (probably) valid credentials
   * This does not indicate, whether the semcon will accept the credentials or not!
   */
  hasCredentials(): boolean {
    const {
      credentials,
    } = this.options;
    return !!credentials;
  }

  /**
   * Initializes Semcon (authorizes against data container if necessary)
   *
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    const supports = await this.getSemconSupport()

    if (supports.authentication || supports.authenticationMode === 'optional') {
      this.communicator.setTokenCallback(() => this._authorize());
      await this.communicator.refreshToken();
    }
  }

  /**
   * This enables to intercept all network calls made by Semcon
   * This is helpful, if you are already using a library for all your network calls
   * If "setNetworkAdapter" is called without providing an adapter, Semcon's default adapter is used
   *
   * @param {NetworkAdapter} [adapter]
   * 
   * @returns {NetworkAdapter} the network adapter that will be used by Semcon
   */
  setNetworkAdapter = (adapter?: NetworkAdapter): NetworkAdapter => this.communicator.setNetworkAdapter(adapter);

  /**
   * A generic method to post data to the data container
   * 
   * @param url Url where to send the request to. Has to start with a leading slash "/"
   * @param usesAuth Whether or not the call should be authorized or not
   * @param data Data to pass to the endpoint
   */
  post = async (
    url: string,
    usesAuth?: MaybeAuthenticated,
    data?: any,
  ): Promise<NetworkResponse> => this.communicator.post(this.urls.getGenericUrl(url), usesAuth, data);

  /**
   * A generic method to put data to the data container
   * 
   * @param url Url where to send the request to. Has to start with a leading slash "/"
   * @param usesAuth Whether or not the call should be authorized or not
   * @param data Data to pass to the endpoint
   */
  put = async (
    url: string,
    usesAuth?: MaybeAuthenticated,
    data?: any,
  ): Promise<NetworkResponse> => this.communicator.put(this.urls.getGenericUrl(url), usesAuth, data);

  /**
   * A generic method to get data from the data container
   * 
   * @param url Url where to send the request to. Has to start with a leading slash "/"
   * @param usesAuth Whether or not the call should be authorized or not
   */
  get = async (
    url: string,
    usesAuth?: MaybeAuthenticated,
  ): Promise<NetworkResponse> => this.communicator.get(this.urls.getGenericUrl(url), usesAuth);

  /**
   * A generic method to delete data from the data container
   * 
   * @param url Url where to send the request to. Has to start with a leading slash "/"
   * @param usesAuth Whether or not the call should be authorized or not
   */
  delete = async (
    url: string,
    usesAuth?: MaybeAuthenticated,
  ): Promise<NetworkResponse> => this.communicator.delete(this.urls.getGenericUrl(url), usesAuth);

  /**
   * Posts a value into the data container's repository, without any metadata
   *
   * @param {Object} value JSON data to post into the repository
   * @param {boolean} usesAuth Whether or not the call should be authorized or not
   *
   * @returns {Promise<SemconMinMeta>}
   */
  async postData(
    value: any,
    usesAuth: MaybeAuthenticated = true,
  ): Promise<SemconMinMeta> {
    const postData = await this.getPutpostData({
      data: value,
    });

    const res = await this.communicator.post(this.urls.postData, usesAuth, postData);

    return parsePostResult(res);
  }

  /**
   * Get a specified value from the semcon's repository, without any metadata
   *
   * @param {SemconItemQuery} query Query parameters to specify the record that has to be queried
   *
   * @returns {Promise<SemconData>} the value of the specified item
   */
  async getData(query: SemconItemQuery): Promise<SemconData> {
    const res = await this.communicator.get(this.urls.getData(query), 'optional');
    const item = res.data as SemconData;

    try {
      // item usually contains JSON data, therefore we try to parse the string
      item.data = JSON.parse(item.data);
    } catch { /* */ }

    return item;
  }

  /**
   * Contains all necessary transformations and checks for posting/putting data to the data container
   * 
   * @param item Data to be posted/put to the data container
   */
  private async getPutpostData(item: SemconPostItem): Promise<string> {
    const { data, id, meta } = item;

    // POST/PUT object is slightly different to our internal structure
    const dataToPost: any = {
      // we deliberately do not send a DRI
      // DRI generation is only handled by server
      meta,
      data,
    }

    if (id)
      dataToPost.id = id;

    return JSON.stringify(dataToPost);
  }


  /**
   * Posts an item into the data container's repository, including any metadata
   * 
   * @param item data that is going to be passed to the data container
   *
   * @returns {Promise<SemconMinMeta>}
   */
  async postItem(item: SemconPostItem): Promise<SemconMinMeta> {
    const res = await this.communicator.post(this.urls.postItem, 'optional', await this.getPutpostData(item));

    return parsePostResult(res);
  }

  /**
   * Puts an item into the data container's repository (update), including any metadata
   * 
   * @param item data that is going to be passed to the data container for updating the record
   */
  async updateItem(item: SemconPostItem): Promise<SemconMinMeta> {
    const res = await this.communicator.put(this.urls.putItem(item), 'optional', await this.getPutpostData(item));

    return res.data as SemconMinMeta;
  }

  /**
   * Retrieve data from the data container's repository including its metadata
   *
   * @param {SemconItemQuery} query Query parameters to specify the record that has to be queried
   *
   * @returns {Promise<SemconItem>}
   */
  async getItem(query: SemconItemQuery): Promise<SemconItem> {
    const { data } = await this.communicator.get(this.urls.getItem(query), 'optional');

    return parseSemconItem(data);
  }

  /**
   * Retrieve data from data container including all metadata
   * 
   * @param query Query parameters to specify the record that has to be queried
   */
  async getItems(query?: SemconItemsQuery): Promise<MultiResponse<SemconItem>> {
    const response = await this.communicator.get(this.urls.getItems(query), 'optional');

    const items = await Promise.all<SemconItem>(response.data.map(async (data: any) => parseSemconItem(data)));

    return {
      items,
      paging: getPaging(response),
    };
  }

  /**
   * Deletes one item
   *
   * @param query Query parameter to specify the records that have to be deleted
   *
   * @returns {Promise<SemconMinMeta>}
   */
  async deleteItem(query: SemconItemQuery): Promise<SemconMinMeta> {
    const { data } = await this.communicator.delete(this.urls.deleteItem(query), 'optional');

    return data as SemconMinMeta;
  }

  /**
   * Returns a list of Semcon items, but only with metadata (no content)
   * 
   * @param query Query parameter to specify the records that have to be deleted
   */
  async getMetaItems(query?: SemconItemsQuery): Promise<MultiResponse<SemconMeta>> {
    const response = await this.communicator.get(this.urls.getMetaItems(query), 'optional');

    return {
      items: response.data.map(parseSemconItemMeta),
      paging: getPaging(response),
    };
  }


  /**
   * Queries all SOyA schemas that are available within the user's semcon
   */
  async getSchemas(): Promise<SemconSchema[]> {
    const { data } = await this.communicator.get(this.urls.getSchemas(), 'optional');

    return data.map((x: any) => ({
      dri: x,
      title: undefined,
    })) as SemconSchema[];
  }

  /**
   * Checks, whether a valid endpoint is specified or not
   * 
   * @returns true, if Semcon has all minimum necessary data and was initalized correctly.
   */
  async isValid(): Promise<boolean> {
    try {
      // currently we check the validity, if there is an endpoint specified 
      // that can deliver a response to the semcon support api call
      await this.getSemconSupport();
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * Checks, whether the user is authenticated or not
   * Also returns true if Semcon does not support authentication
   */
  async isAuthenticated(): Promise<boolean> {
    const support = await this.getSemconSupport();

    if (support.authentication)
      return this.communicator.hasToken();
    else
      return true;
  }

  /**
   * Adds a listener for changes in authentication.
   * 
   * @param callback Callback that is called each time a new authentication token is fetched
   */
  addAuthenticationRefreshCallback(callback: (token: string | undefined) => unknown): void {
    this.authCallbacks.add(callback);
  }

  private async _authorize(): Promise<string> {
    let token: string;

    try {
      const credentials = this.options.credentials;

      let body: any;
      let tokenUrl: string | undefined = undefined;

      if (
        // TODO: We should also check the possibility for code authentication
        // support.oAuth?.type === OAuthType.AUTHORIZATION_CODE &&
        credentials?.authorizationCode
      ) {
        // TODO: hm, this is probably not that nice...
        // we have to rethink our authentication mechanism, it's already very complex...
        const existingToken = this.communicator.getToken();

        // TODO: at the moment there is no way how to refresh the token once it was issued
        if (await this.isAuthenticated() && existingToken)
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
          }
        }
        else if (oauthRedirectUrl && credentials.state && applicationId) {
          tokenUrl = this.urls.getOidcSignInUrl(
            credentials.authorizationCode,
            credentials.state,
            oauthRedirectUrl,
            applicationId,
          );
        }
      }

      if (this.options.credentials?.scope)
        body.scope = this.options.credentials.scope;

      let response: NetworkResponse;
      if (tokenUrl)
        response = await this.communicator.get(tokenUrl, false);
      else
        response = await this.communicator.post(this.urls.token, false, body);

      token = response.data.access_token as string;

      // inform all token listeners about the new token
      this.authCallbacks.forEach(cb => cb(token));

    }
    catch {
      throw new UnauthorizedError();
    }

    return token;
  }
}
