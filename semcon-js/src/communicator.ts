import { UnauthorizedError } from "./errors";

interface BaseHeaders {
  'Content-Type': string,
}

interface DataHeaders extends BaseHeaders {
  'Accept': string,
  'Authorization'?: string,
}

// optional authentication means, it sends the token if available
// but does not complain, if there is no token at all
export type MaybeAuthenticated = boolean | 'optional';

export interface NetworkResponse {
  data: any;
  headers: Headers;
  request: {
    url: string;
    method: string;
  };
  status: number;
}

interface NetworkResponseObject {
  response?: NetworkResponse;
  error?: Error;
}

export interface NetworkAdapter {
  get: (
    url: string,
    headers?: any,
  ) => Promise<NetworkResponse>;

  post: (
    url: string,
    data?: any,
    headers?: any,
  ) => Promise<NetworkResponse>;

  put: (
    url: string,
    data?: any,
    headers?: any,
  ) => Promise<NetworkResponse>;

  delete: (
    url: string,
    headers?: any
  ) => Promise<NetworkResponse>
};

export class Communicator {
  private token?: string;
  private networkAdapter: NetworkAdapter;
  private tokenCallback?: () => Promise<string>;

  constructor() {
    // set default implementation
    this.networkAdapter = this.setNetworkAdapter();
  }

  private _usesAuthentication(): boolean {
    return !!this.tokenCallback;
  }

  setTokenCallback = (callback: () => Promise<string>) => {
    this.tokenCallback = callback;
  }

  setNetworkAdapter = (adapter?: NetworkAdapter): NetworkAdapter => {
    if (adapter) {
      return this.networkAdapter = adapter;
    } else {
      return this.networkAdapter = {
        get: async (url: string, headers?: any) => {
          const res = await fetch(url, { method: 'GET', headers });
          if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
          return {
            data: await res.json(),
            headers: res.headers,
            status: res.status,
            request: { url, method: 'GET' }
          };
        },
        post: async (url: string, data?: any, headers?: any) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
          return {
            data: await res.json(),
            headers: res.headers,
            status: res.status,
            request: { url, method: 'POST' }
          };
        },
        put: async (url: string, data?: any, headers?: any) => {
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
          return {
            data: await res.json(),
            headers: res.headers,
            status: res.status,
            request: { url, method: 'PUT' }
          };
        },
        delete: async (url: string, headers?: any) => {
          const res = await fetch(url, {
            method: 'DELETE',
            headers
          });
          if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
          return {
            data: await res.json(),
            headers: res.headers,
            status: res.status,
            request: { url, method: 'DELETE' }
          };
        }
      };
    }
  }

  async refreshToken(): Promise<string | undefined> {
    if (this.tokenCallback)
      return this.token = await this.tokenCallback();

    return undefined;
  }

  hasToken(): boolean {
    return !!this.token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  async get(url: string, usesAuth: MaybeAuthenticated = false): Promise<NetworkResponse> {
    return this._placeNetworkCall(
      async () => this.networkAdapter.get(url, this._getHeaders(usesAuth)),
      usesAuth
    );
  }

  async post(url: string, usesAuth: MaybeAuthenticated = false, data?: any): Promise<NetworkResponse> {
    return this._placeNetworkCall(
      async () => this.networkAdapter.post(url, data, this._getHeaders(usesAuth)),
      usesAuth
    );
  }

  async put(url: string, usesAuth: MaybeAuthenticated = false, data?: any): Promise<NetworkResponse> {
    return this._placeNetworkCall(
      async () => this.networkAdapter.put(url, data, this._getHeaders(usesAuth)),
      usesAuth
    );
  }

  async delete(url: string, usesAuth: MaybeAuthenticated = false): Promise<NetworkResponse> {
    return this._placeNetworkCall(
      async () => this.networkAdapter.delete(url, this._getHeaders(usesAuth)),
      usesAuth,
    );
  }

  private async tryCatch(callable: () => Promise<NetworkResponse>): Promise<NetworkResponseObject> {
    try {
      const response = await callable();
      return {
        response,
      };
    } catch (e: any) {
      return {
        error: e,
        response: e.response,
      };
    }
  }

  private async _placeNetworkCall(
    callable: () => Promise<NetworkResponse>,
    isAuthenticated: MaybeAuthenticated = false,
    recursionCount = 0,
  ): Promise<NetworkResponse> {
    let nro: NetworkResponseObject = await this.tryCatch(callable);

    if (!nro.response)
      throw nro.error ? nro.error : new Error('No network response');

    // only try to refresh authentication, if recursion count is still 0
    // otherwise we'll end up in an infinite loop
    //
    // only for calls that really require authentication
    // optional authentication should also work without tokens
    if (isAuthenticated === true && recursionCount === 0) {
      // if data container responds with a 401, our token is expired
      // therefore we fetch a new one and give the call another try
      if (nro.response.status === 401 && this._usesAuthentication()) {
        this.token = await this.refreshToken();
        nro = await this.tryCatch(callable);

        return this._placeNetworkCall(callable, isAuthenticated, recursionCount + 1);
      }
    }

    if (nro.response.status === 401) {
      throw new UnauthorizedError();
    } else if (nro.response.status >= 400) {
      throw nro.error;
    }

    return nro.response;
  }

  private _getHeaders(usesAuth: MaybeAuthenticated = false): BaseHeaders {
    return usesAuth && this._usesAuthentication() ?
      this._getDataHeaders(usesAuth) :
      this._baseHeaders;
  }

  private _baseHeaders: BaseHeaders = {
    'Content-Type': 'application/json',
  }

  private _getDataHeaders(usesAuth: MaybeAuthenticated): DataHeaders {
    if (this.token === undefined && usesAuth === true)
      throw new Error('There is no token available. Did you forget to initalize semcon?')

    const headers: DataHeaders = {
      ...this._baseHeaders,
      Accept: '*/*',
    };

    if (!!usesAuth && this.token)
      headers['Authorization'] = `Bearer ${this.token}`;

    return headers;
  }
}