// TODO: User should be able to change repo on the fly
export class VaultifierUrls {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91cmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLHNEQUFzRDtBQUN0RCxNQUFNLE9BQU8sY0FBYztJQVl6QixZQUNTLE9BQWUsRUFDZCxJQUFhO1FBRXJCLHdDQUF3QztRQUN4QyxrREFBa0Q7UUFDbEQsdUZBQXVGO1FBQ3ZGLHdEQUF3RDtRQU5qRCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBUztRQW9CZixtQkFBYyxHQUFHLENBQUMsSUFBMkIsRUFBRSxFQUFFLENBQ3ZELEdBQUcsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksRUFBQyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBRWhGLGdCQUFXLEdBQUcsQ0FBQyxNQUFjLEVBQUUsS0FBdUIsRUFBRSxFQUFFO1lBQ2hFLElBQUksS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE1BQU07Z0JBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLG9CQUFvQixLQUFLLENBQUMsTUFBTSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxJQUFJLENBQUMsRUFBRSxDQUFDO2lCQUNyRyxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNoQixPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8scUJBQXFCLElBQUksQ0FBQyxJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxhQUFMLEtBQUssdUJBQUws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