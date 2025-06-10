var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { decrypt, isEncrypted } from './crypto';
export const parseVaultItemMeta = (data) => {
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
export const decryptOrNot = (item, privateKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (privateKey &&
        isEncrypted(item)) {
        const decrypted = yield decrypt(item, { cipher: privateKey });
        try {
            return JSON.parse(decrypted);
        }
        catch ( /* the encrypted data is delivered as string */_a) { /* the encrypted data is delivered as string */ }
    }
    return item;
});
export const parseVaultItem = (data, privateKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof data === 'string') {
        try {
            // item usually contains JSON data, therefore we try to parse the string
            data = JSON.parse(data);
        }
        catch ( /* */_b) { /* */ }
    }
    const isContentEncrypted = isEncrypted(data.data);
    data.data = yield decryptOrNot(data.data, privateKey);
    const item = Object.assign(Object.assign({}, parseVaultItemMeta(data)), { isEncrypted: isContentEncrypted, data: data.data });
    return item;
});
export const parsePostResult = (response) => {
    const { data } = response;
    return {
        id: data.id,
        raw: data,
    };
};
const parsePagingHeaderValue = (value) => {
    return typeof value === 'string' ? parseInt(value) : value;
};
export const getPaging = (response) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR2hELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsSUFBUyxFQUFhLEVBQUU7O0lBQUMsT0FBQSxDQUFDO1FBQzNELEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNYLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztRQUNiLDhDQUE4QztRQUM5QyxJQUFJLFFBQUUsSUFBSSxDQUFDLElBQUksbUNBQUksRUFBRTtRQUNyQixXQUFXO1FBQ1gsR0FBRyxFQUFFLElBQUk7S0FDVixDQUFDLENBQUE7Q0FBQSxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQU8sSUFBUyxFQUFFLFVBQW1CLEVBQWdCLEVBQUU7SUFDakYsSUFDRSxVQUFVO1FBQ1YsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUNqQjtRQUNBLE1BQU0sU0FBUyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTlELElBQUk7WUFDRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUI7UUFBQyxRQUFRLCtDQUErQyxJQUFqRCxFQUFFLCtDQUErQyxFQUFFO0tBQzVEO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUEsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUFPLElBQVMsRUFBRSxVQUFtQixFQUFzQixFQUFFO0lBQ3pGLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUk7WUFDRix3RUFBd0U7WUFDeEUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7UUFBQyxRQUFRLEtBQUssSUFBUCxFQUFFLEtBQUssRUFBRTtLQUNsQjtJQUVELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsRCxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFdEQsTUFBTSxJQUFJLG1DQUNMLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUMzQixXQUFXLEVBQUUsa0JBQWtCLEVBQy9CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxHQUNoQixDQUFDO0lBRUYsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUEsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxDQUFDLFFBQXlCLEVBQWdCLEVBQUU7SUFDekUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQztJQUUxQixPQUFPO1FBQ0wsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ1gsR0FBRyxFQUFFLElBQUk7S0FDVixDQUFDO0FBQ0osQ0FBQyxDQUFBO0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEtBQXNCLEVBQUUsRUFBRTtJQUN4RCxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDN0QsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLENBQUMsUUFBeUIsRUFBVSxFQUFFO0lBQzdELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDckQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNuRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFakQsT0FBTztRQUNMLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxXQUFXLENBQUM7UUFDNUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLFVBQVUsQ0FBQztRQUM5QyxVQUFVLEVBQUUsc0JBQXNCLENBQUMsVUFBVSxDQUFDO1FBQzlDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7S0FDN0MsQ0FBQztBQUNKLENBQUMsQ0FBQSJ9