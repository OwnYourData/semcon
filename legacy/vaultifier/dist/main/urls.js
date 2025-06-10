"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultifierUrls = void 0;
// TODO: User should be able to change repo on the fly
class VaultifierUrls {
    constructor(baseUrl, repo) {
        // TODO: re-enable this security barrier
        // don't allow insecure builds for production mode
        // if (process.env.NODE_ENV === 'production' && new URL(baseUrl).protocol !== 'https:')
        //   throw Error('Protocol of baseUrl is not "https".');
        this.baseUrl = baseUrl;
        this.repo = repo;
        this.getPagingParam = (page) => `${(page === null || page === void 0 ? void 0 : page.page) ? `&page=${page.page}` : ''}${(page === null || page === void 0 ? void 0 : page.size) ? `&items=${page.size}` : ''}`;
        this.getMultiple = (format, query) => {
            if (query === null || query === void 0 ? void 0 : query.schema)
                return `${this.baseUrl}/api/data?schema=${query.schema}&f=${format}${this.getPagingParam(query === null || query === void 0 ? void 0 : query.page)}`;
            else if (this.repo)
                return `${this.baseUrl}/api/data?repo_id=${this.repo}&f=${format}${this.getPagingParam(query === null || query === void 0 ? void 0 : query.page)}`;
            else
                return `${this.baseUrl}/api/data?f=${format}${this.getPagingParam(query === null || query === void 0 ? void 0 : query.page)}`;
        };
        this.getMetaItems = (query) => this.getMultiple('meta', query);
        this.getItems = (query) => this.getMultiple('full', query);
        this.getSingle = (format, query) => query.id
            ? `${this.baseUrl}/api/data?id=${query.id}&f=${format}`
            : `${this.baseUrl}/api/data?dri=${query.dri}&f=${format}`;
        this.getItem = (query) => this.getSingle('full', query);
        this.getData = (query) => this.getSingle('plain', query);
        this.getProvis = (query) => this.getSingle('provis', query);
        this.deleteItem = (query) => query.id
            ? `${this.baseUrl}/api/data?id=${query.id}`
            : `${this.baseUrl}/api/data?dri=${query.dri}`;
        // putting an item uses the same url as deleting an item
        this.putItem = (query) => this.deleteItem(query);
        this.getSchemas = () => `${this.baseUrl}/api/meta/schemas`;
        this.resolveInstallCode = (code) => `${this.baseUrl}/api/install/${code}`;
        this.publicKey = () => 
        // oyd.settings is the default repo for storing the public key
        `${this.baseUrl}/api/repos/${this.repo || 'oyd.settings'}/pub_key`;
        this.getEncryptedPassword = (nonce) => `${this.support}/${nonce}`;
        this.getOAuthAuthorizationCode = (clientId, redirectUri, codeChallenge) => `${this.baseUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}`;
        this.getGenericUrl = (url) => {
            if (!url.startsWith('/'))
                throw new Error('Generic urls must have a leading slash!');
            return `${this.baseUrl}${url}`;
        };
        this.getEidasExternalUrl = (id, token, redirectUrl) => `${this.baseUrl}/api/eidas?id=${id}&token=${token}&redirect_url=${redirectUrl}`;
        this.getOidcSignInUrl = (code, state, redirectUrl, applicationId) => `${this.baseUrl}/signin-oidc?code=${code}&state=${state}&redirect_url=${redirectUrl}&application_id=${applicationId}`;
        this.setRepo = (repo) => this.repo = repo;
        this.token = `${baseUrl}/oauth/token`;
        this.active = `${baseUrl}/api/active`;
        this.support = `${baseUrl}/api/support`;
        this.postData = `${baseUrl}/api/data`;
        this.postItem = `${baseUrl}/api/data`;
        this.privateKey = `${baseUrl}/api/users/current`;
        this.getRepos = `${baseUrl}/api/repos/index`;
        this.usagePolicy = `${baseUrl}/api/meta/usage`;
        this.info = `${baseUrl}/api/meta/info`;
        this.eidasToken = `${this.baseUrl}/api/eidas/token`;
    }
}
exports.VaultifierUrls = VaultifierUrls;
VaultifierUrls.getRedirectUrl = () => {
    const redirectUrl = new URL(window.location.href);
    // remove hash as this could interfere with redirection
    redirectUrl.hash = '';
    let rawUrl = redirectUrl.toString();
    // redirect URLs also must not contain any query parameters
    // as this is not allowed by OAuth
    rawUrl = rawUrl.split('?')[0];
    return rawUrl;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91cmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHNEQUFzRDtBQUN0RCxNQUFhLGNBQWM7SUFZekIsWUFDUyxPQUFlLEVBQ2QsSUFBYTtRQUVyQix3Q0FBd0M7UUFDeEMsa0RBQWtEO1FBQ2xELHVGQUF1RjtRQUN2Rix3REFBd0Q7UUFOakQsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVM7UUFvQmYsbUJBQWMsR0FBRyxDQUFDLElBQTJCLEVBQUUsRUFBRSxDQUN2RCxHQUFHLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksRUFBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUVoRixnQkFBVyxHQUFHLENBQUMsTUFBYyxFQUFFLEtBQXVCLEVBQUUsRUFBRTtZQUNoRSxJQUFJLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxNQUFNO2dCQUNmLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxvQkFBb0IsS0FBSyxDQUFDLE1BQU0sTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztpQkFDckcsSUFBSSxJQUFJLENBQUMsSUFBSTtnQkFDaEIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLHFCQUFxQixJQUFJLENBQUMsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtB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