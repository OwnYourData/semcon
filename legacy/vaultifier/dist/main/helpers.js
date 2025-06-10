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
exports.getPaging = exports.parsePostResult = exports.parseVaultItem = exports.decryptOrNot = exports.parseVaultItemMeta = void 0;
const crypto_1 = require("./crypto");
exports.parseVaultItemMeta = (data) => {
    var _a;
    return ({
        id: data.id,
        dri: data.dri,
        // we always provide a fallback value for meta
        meta: (_a = data.meta) !== null && _a !== void 0 ? _a : {},
        // raw data
        raw: data,
    });
};
exports.decryptOrNot = (item, privateKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (privateKey &&
        crypto_1.isEncrypted(item)) {
        const decrypted = yield crypto_1.decrypt(item, { cipher: privateKey });
        try {
            return JSON.parse(decrypted);
        }
        catch ( /* the encrypted data is delivered as string */_a) { /* the encrypted data is delivered as string */ }
    }
    return item;
});
exports.parseVaultItem = (data, privateKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof data === 'string') {
        try {
            // item usually contains JSON data, therefore we try to parse the string
            data = JSON.parse(data);
        }
        catch ( /* */_b) { /* */ }
    }
    const isContentEncrypted = crypto_1.isEncrypted(data.data);
    data.data = yield exports.decryptOrNot(data.data, privateKey);
    const item = Object.assign(Object.assign({}, exports.parseVaultItemMeta(data)), { isEncrypted: isContentEncrypted, data: data.data });
    return item;
});
exports.parsePostResult = (response) => {
    const { data } = response;
    return {
        id: data.id,
        raw: data,
    };
};
const parsePagingHeaderValue = (value) => {
    return typeof value === 'string' ? parseInt(value) : value;
};
exports.getPaging = (response) => {
    const currentPage = response.headers['current-page'];
    const totalPages = response.headers['total-pages'];
    const totalItems = response.headers['total-count'];
    const pageItems = response.headers['page-items'];
    return {
        current: parsePagingHeaderValue(currentPage),
        totalPages: parsePagingHeaderValue(totalPages),
        totalItems: parsePagingHeaderValue(totalItems),
        pageItems: parsePagingHeaderValue(pageItems),
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLHFDQUFnRDtBQUduQyxRQUFBLGtCQUFrQixHQUFHLENBQUMsSUFBUyxFQUFhLEVBQUU7O0lBQUMsT0FBQSxDQUFDO1FBQzNELEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNYLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztRQUNiLDhDQUE4QztRQUM5QyxJQUFJLFFBQUUsSUFBSSxDQUFDLElBQUksbUNBQUksRUFBRTtRQUNyQixXQUFXO1FBQ1gsR0FBRyxFQUFFLElBQUk7S0FDVixDQUFDLENBQUE7Q0FBQSxDQUFDO0FBRVUsUUFBQSxZQUFZLEdBQUcsQ0FBTyxJQUFTLEVBQUUsVUFBbUIsRUFBZ0IsRUFBRTtJQUNqRixJQUNFLFVBQVU7UUFDVixvQkFBVyxDQUFDLElBQUksQ0FBQyxFQUNqQjtRQUNBLE1BQU0sU0FBUyxHQUFHLE1BQU0sZ0JBQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUU5RCxJQUFJO1lBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzlCO1FBQUMsUUFBUSwrQ0FBK0MsSUFBakQsRUFBRSwrQ0FBK0MsRUFBRTtLQUM1RDtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFBLENBQUE7QUFFWSxRQUFBLGNBQWMsR0FBRyxDQUFPLElBQVMsRUFBRSxVQUFtQixFQUFzQixFQUFFO0lBQ3pGLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUk7WUFDRix3RUFBd0U7WUFDeEUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7UUFBQyxRQUFRLEtBQUssSUFBUCxFQUFFLEtBQUssRUFBRTtLQUNsQjtJQUVELE1BQU0sa0JBQWtCLEdBQUcsb0JBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUV0RCxNQUFNLElBQUksbUNBQ0wsMEJBQWtCLENBQUMsSUFBSSxDQUFDLEtBQzNCLFdBQVcsRUFBRSxrQkFBa0IsRUFDL0IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQ2hCLENBQUM7SUFFRixPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQSxDQUFBO0FBRVksUUFBQSxlQUFlLEdBQUcsQ0FBQyxRQUF5QixFQUFnQixFQUFFO0lBQ3pFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUM7SUFFMUIsT0FBTztRQUNMLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNYLEdBQUcsRUFBRSxJQUFJO0tBQ1YsQ0FBQztBQUNKLENBQUMsQ0FBQTtBQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxLQUFzQixFQUFFLEVBQUU7SUFDeEQsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzdELENBQUMsQ0FBQTtBQUVZLFFBQUEsU0FBUyxHQUFHLENBQUMsUUFBeUIsRUFBVSxFQUFFO0lBQzdELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDckQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNuRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFakQsT0FBTztRQUNMLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxXQUFXLENBQUM7UUFDNUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLFVBQVUsQ0FBQztRQUM5QyxVQUFVLEVBQUUsc0JBQXNCLENBQUMsVUFBVSxDQUFDO1FBQzlDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7S0FDN0MsQ0FBQztBQUNKLENBQUMsQ0FBQSJ9