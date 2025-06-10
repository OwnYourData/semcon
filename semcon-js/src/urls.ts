import { PageQuery, SemconItemQuery, SemconItemsQuery } from './interfaces';

// TODO: User should be able to change repo on the fly
export class SemconUrls {
  readonly active: string;
  readonly token: string;
  readonly postData: string;
  readonly postItem: string;
  readonly info: string;

  constructor(
    public baseUrl: string,
    private repo?: string
  ) {

    this.token = `${baseUrl}/oauth/token`;

    this.active = `${baseUrl}/api/active`;
    this.postData = `${baseUrl}/api/data`;
    this.postItem = `${baseUrl}/api/data`;
    this.info = `${baseUrl}/api/meta/info`;
  }

  private getPagingParam = (page: PageQuery | undefined) =>
    `${page?.page ? `&page=${page.page}` : ''}${page?.size ? `&items=${page.size}` : ''}`;

  private getMultiple = (format: string, query?: SemconItemsQuery) => {
    if (query?.schema)
      return `${this.baseUrl}/api/data?schema=${query.schema}&f=${format}${this.getPagingParam(query?.page)}`;
    else if (this.repo)
      return `${this.baseUrl}/api/data?repo_id=${this.repo}&f=${format}${this.getPagingParam(query?.page)}`;
    else
      return `${this.baseUrl}/api/data?f=${format}${this.getPagingParam(query?.page)}`;
  }

  getMetaItems = (query?: SemconItemsQuery): string => this.getMultiple('meta', query);
  getItems = (query?: SemconItemsQuery): string => this.getMultiple('full', query);

  private getSingle = (format: string, query: SemconItemQuery) =>
    query.id
      ? `${this.baseUrl}/api/data?id=${query.id}&f=${format}`
      : `${this.baseUrl}/api/data?dri=${query.dri}&f=${format}`;

  getItem = (query: SemconItemQuery): string => this.getSingle('full', query);
  getData = (query: SemconItemQuery): string => this.getSingle('plain', query);

  deleteItem = (query: SemconItemQuery) =>
    query.id
      ? `${this.baseUrl}/api/data?id=${query.id}`
      : `${this.baseUrl}/api/data?dri=${query.dri}`;

  // putting an item uses the same url as deleting an item
  putItem = (query: SemconItemQuery) => this.deleteItem(query);

  getSchemas = () => `${this.baseUrl}/api/meta/schemas`;
  getOAuthAuthorizationCode = (clientId: string, redirectUri: string, codeChallenge: string) => `${this.baseUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}`

  getGenericUrl = (url: string) => {
    if (!url.startsWith('/'))
      throw new Error('Generic urls must have a leading slash!');
    return `${this.baseUrl}${url}`;
  }

  getOidcSignInUrl = (code: string, state: string, redirectUrl: string, applicationId: string) =>
    `${this.baseUrl}/signin-oidc?code=${code}&state=${state}&redirect_url=${redirectUrl}&application_id=${applicationId}`;

  static getRedirectUrl = () => {
    const redirectUrl = new URL(window.location.href);
    // remove hash as this could interfere with redirection
    redirectUrl.hash = '';

    let rawUrl = redirectUrl.toString();
    // redirect URLs also must not contain any query parameters
    // as this is not allowed by OAuth
    rawUrl = rawUrl.split('?')[0];

    return rawUrl;
  }

  setRepo = (repo: string) => this.repo = repo;
}
