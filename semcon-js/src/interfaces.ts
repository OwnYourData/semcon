export interface i18nObject {
  [languageCode: string]: string,
}

export interface SemconCredentials {
  clientId?: string;
  authorizationCode?: string;

  // additional property for external identity providers
  state?: string;

  scope?: string
}

export interface SemconMetaObject {
  schema?: string;
}

export interface SemconPostItem {
  id?: number;
  meta?: SemconMetaObject;
  data: any;
}

export interface SemconItem {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta: SemconMetaObject;
  data: any;
  dri?: string;

  // Raw presentation of a semcon item
  raw: any;
}

export interface SemconItemQuery {
  id?: number;
  dri?: string;
}

export interface PageQuery {
  page?: number,
  size?: number,
}

export interface SemconItemsQuery {
  schema?: string;
  page?: PageQuery;
}

export type SemconMeta = Omit<SemconItem, 'data'>;

export interface SemconMinMeta {
  id: number;
  // Raw presentation of semcon meta
  raw: any;
}

export interface SemconData {
  id: number;
  data: any;
}

export interface SemconRepo {
  id: number,
  name: string,
  identifier: string,
}

export interface SemconSchema {
  dri: string;
  title?: string;
}

export enum OAuthType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
}

export interface OAuthSupport {
  type: OAuthType,
}

export interface OAuthIdentityProvider {
  authority: string,
  clientId: string,
  scope: string,
  responseType: string,
  redirectUrl: string,
  title: i18nObject,
  imageUrl: string,
  applicationId: string,
}

export interface OAuthExternalProvider {
  link: string,
  title: i18nObject,
  imageUrl: string,
}

export interface SemconUser {
  userName: string,
  fullName: string,
  organization: string,
}

export interface SemconSupport {
  repos: boolean,
  authentication: boolean,
  authenticationMode: 'optional' | undefined,
  scopes?: string[],
  oAuth?: (OAuthSupport | OAuthIdentityProvider | OAuthExternalProvider)[],
  user?: SemconUser,
}

export interface SemconInfo {
  name?: string;
  description?: string;
}

export interface MultiResponse<T> {
  items: T[];
  paging: Paging;
}

export interface Paging {
  current: number;
  totalPages: number;
  totalItems: number;
  pageItems: number;
}