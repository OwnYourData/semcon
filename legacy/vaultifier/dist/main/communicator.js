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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Communicator = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("./errors");
;
class Communicator {
    constructor() {
        this.setTokenCallback = (callback) => {
            this.tokenCallback = callback;
        };
        this.setNetworkAdapter = (adapter) => {
            if (adapter)
                return this.networkAdapter = adapter;
            else // default implementation
                return this.networkAdapter = {
                    get: (url, headers) => axios_1.default.get(url, {
                        headers: headers,
                    }),
                    post: (url, data, headers) => axios_1.default.post(url, data, {
                        headers: headers,
                    }),
                    put: (url, data, headers) => axios_1.default.put(url, data, {
                        headers: headers,
                    }),
                    delete: (url, headers) => axios_1.default.delete(url, {
                        headers,
                    }),
                };
        };
        this._baseHeaders = {
            'Content-Type': 'application/json',
        };
        // set default implementation
        this.networkAdapter = this.setNetworkAdapter();
    }
    _usesAuthentication() {
        return !!this.tokenCallback;
    }
    refreshToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tokenCallback)
                return this.token = yield this.tokenCallback();
            return undefined;
        });
    }
    hasToken() {
        return !!this.token;
    }
    getToken() {
        return this.token;
    }
    get(url, usesAuth = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._placeNetworkCall(() => __awaiter(this, void 0, void 0, function* () { return this.networkAdapter.get(url, this._getHeaders(usesAuth)); }), usesAuth);
        });
    }
    post(url, usesAuth = false, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._placeNetworkCall(() => __awaiter(this, void 0, void 0, function* () { return this.networkAdapter.post(url, data, this._getHeaders(usesAuth)); }), usesAuth);
        });
    }
    put(url, usesAuth = false, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._placeNetworkCall(() => __awaiter(this, void 0, void 0, function* () { return this.networkAdapter.put(url, data, this._getHeaders(usesAuth)); }), usesAuth);
        });
    }
    delete(url, usesAuth = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._placeNetworkCall(() => __awaiter(this, void 0, void 0, function* () { return this.networkAdapter.delete(url, this._getHeaders(usesAuth)); }), usesAuth);
        });
    }
    tryCatch(callable) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield callable();
                return {
                    response,
                };
            }
            catch (e) {
                return {
                    error: e,
                    response: e.response,
                };
            }
        });
    }
    _placeNetworkCall(callable, isAuthenticated = false, recursionCount = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let nro = yield this.tryCatch(callable);
            if (!nro.response)
                throw nro.error ? nro.error : new Error('No network response');
            // only try to refresh authentication, if recursion count is still 0
            // otherwise we'll end up in an infinite loop
            if (isAuthenticated && recursionCount === 0) {
                // if data container responds with a 401, our token is expired
                // therefore we fetch a new one and give the call another try
                if (nro.response.status === 401 && this._usesAuthentication()) {
                    this.token = yield this.refreshToken();
                    nro = yield this.tryCatch(callable);
                    return this._placeNetworkCall(callable, isAuthenticated, recursionCount + 1);
                }
            }
            if (nro.response.status === 401) {
                throw new errors_1.UnauthorizedError();
            }
            else if (nro.response.status >= 400) {
                throw nro.error;
            }
            return nro.response;
        });
    }
    _getHeaders(usesAuth = false) {
        return usesAuth && this._usesAuthentication() ?
            this._getDataHeaders() :
            this._baseHeaders;
    }
    _getDataHeaders() {
        if (this.token === undefined)
            throw new Error('There is no token available. Did you forget to initalize vaultifier?');
        return Object.assign(Object.assign({}, this._baseHeaders), { Accept: '*/*', Authorization: `Bearer ${this.token}` });
    }
}
exports.Communicator = Communicator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbXVuaWNhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbW11bmljYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBNkM7QUFFN0MscUNBQTZDO0FBK0M1QyxDQUFDO0FBRUYsTUFBYSxZQUFZO0lBS3ZCO1FBU0EscUJBQWdCLEdBQUcsQ0FBQyxRQUErQixFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUM7UUFDaEMsQ0FBQyxDQUFBO1FBRUQsc0JBQWlCLEdBQUcsQ0FBQyxPQUF3QixFQUFrQixFQUFFO1lBQy9ELElBQUksT0FBTztnQkFDVCxPQUFPLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDO2lCQUNsQyx5QkFBeUI7Z0JBQzVCLE9BQU8sSUFBSSxDQUFDLGNBQWMsR0FBRztvQkFDM0IsR0FBRyxFQUFFLENBQUMsR0FBVyxFQUFFLE9BQWEsRUFBRSxFQUFFLENBQUMsZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7d0JBQ2xELE9BQU8sRUFBRSxPQUFPO3FCQUNqQixDQUFDO29CQUNGLElBQUksRUFBRSxDQUFDLEdBQVcsRUFBRSxJQUFVLEVBQUUsT0FBYSxFQUFFLEVBQUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQ3RFLE9BQU8sRUFBRSxPQUFPO3FCQUNqQixDQUFDO29CQUNGLEdBQUcsRUFBRSxDQUFDLEdBQVcsRUFBRSxJQUFVLEVBQUUsT0FBYSxFQUFFLEVBQUUsQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQ3BFLE9BQU8sRUFBRSxPQUFPO3FCQUNqQixDQUFDO29CQUNGLE1BQU0sRUFBRSxDQUFDLEdBQVcsRUFBRSxPQUFhLEVBQUUsRUFBRSxDQUFDLGVBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO3dCQUN4RCxPQUFP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