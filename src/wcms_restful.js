/**
 * Cascade CMS REST API Vanilla JS Library
 * Based on Cascade CMS REST API Specifications
 */
export class WCMS {
    /**
     * @param {string} baseUrl - The base URL of your Cascade instance (e.g., 'http://localhost:8080')
     * @param {Object} auth - Authentication configuration
     * @param {string} [auth.apiKey] - Your Cascade API Key (Recommended)
     * @param {string} [auth.username] - Cascade Username (Fallback)
     * @param {string} [auth.password] - Cascade Password (Fallback)
     */
    constructor(baseUrl, auth = {}) {
        // Ensure URL ends correctly with /api/v1
        this.baseUrl = baseUrl.replace(/\/+$/, '') + '/api/v1';
        this.auth = auth;
    }


    /**
     * Internal request handler
     */
    async _request(operation, identifierPath = '', body = null, method = null) {
        let url = `${this.baseUrl}/${operation}`;
        if (identifierPath) {
            url += `/${identifierPath.replace(/^\/+/, '')}`;
        }

        const headers = {};

        // Configure Authentication Headers
        if (this.auth.apiKey) {
            headers['Authorization'] = `Bearer ${this.auth.apiKey}`;
        } else if (this.auth.username && this.auth.password) {
            const encoded = btoa(`${this.auth.username}:${this.auth.password}`);
            headers['Authorization'] = `Basic ${encoded}`;
        }

        // Determine HTTP Method
        if (!method) {
            method = body ? 'POST' : 'GET';
        }

        const options = { method, headers };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
            // Fallback: If a body is passed, ensure method is POST per Cascade API layout
            if (options.method === 'GET') options.method = 'POST';
        }

        console.log('wcms restful js: request: ')
        console.log(url)
        console.log(options)
        const response = await fetch(url, options);
        console.log(response)
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        //
        // if (!result.success){
        //     throw new Error(result.message);
        // }

        return result;
    }

    /**
     * Polyfill-style parser for handling Cascade's structural variations for identifiers
     */
    _parseIdentifier(typeOrFullIdent, siteNameOrId, path) {
        if (!siteNameOrId && !path) return typeOrFullIdent; // Raw e.g. 'page/123-abc'
        if (path) return `${typeOrFullIdent}/${siteNameOrId}/${path.replace(/^\/+/, '')}`;
        return `${typeOrFullIdent}/${siteNameOrId}`;
    }




    /**
     * helpers
     */

    /**
     * Helper to construct copyParameters for cross-site or within-site copying
     * @param {string} targetSiteName - The name of the destination site
     * @param {string} destinationFolderPath - The path to the folder in the target site
     * @param {string} newName - The new name for the asset
     * @param {boolean} [doWorkflow=false] - Whether to trigger a workflow
     */
    constructCopyParams(targetSiteName, destinationFolderPath, newName, doWorkflow = false) {
        return {
            newName: newName,
            doWorkflow: doWorkflow,
            destinationContainerIdentifier: {
                type: "folder",
                path: {
                    siteName: targetSiteName,
                    path: destinationFolderPath === '/' ? '/' : destinationFolderPath.replace(/^\/+/, '')
                }
            }
        };
    }

    /* ==========================================
       CORE OPERATIONS
       ========================================== */

    async isExist(type, siteNameOrId, path = null){
        const ident = this._parseIdentifier(type, siteNameOrId, path);

        console.log("ident in read:" + ident)
        const result = await this._request('read', ident, null, 'GET');

        return result.success;

    }

    // Read Asset (Supports Path or ID lookups)
    async read(type, siteNameOrId, path = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);

        console.log("ident in read:" + ident)
        const resultObj = await this._request('read', ident, null, 'GET');

        return this._returnActualAsset(type, resultObj);

    }


    async readRaw(type, siteNameOrId, path = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);

        return  await this._request('read', ident, null, 'GET');
    }

    /**
     *
     *  /api/v1/read/site/%2520/[Site-Name] (notice the %2520).
     *  This is essentially double-escaping the site name spot as a space since the actual site name goes in the path section.
     * @param siteName
     * @returns {Promise<*>}
     */
    async readSiteByName(siteName) {
        const path = '%2520/' + siteName;

        return  await this.read('site', '', path);
    }

    _returnActualAsset(type, resultObj){
        let actualType = type;
        const typeMap = {
            "assetfactory": "assetFactory",
            "assetfactorycontainer": "assetFactoryContainer",
            "contenttype": "contentType",
            "contenttypecontainer": "contentTypeContainer",
            "pageconfigurationset": "pageConfigurationSet",
            "pageconfigurationsetcontainer": "pageConfigurationSetContainer",
            "datadefinition": "dataDefinition",
            "datadefinitioncontainer": "dataDefinitionContainer",
            "sharedfield": "sharedField",
            "sharedfieldcontainer": "sharedFieldContainer",
            "metadataset": "metadataSet",
            "metadatasetcontainer": "metadataSetContainer",
        };
        switch (type){
            case 'page':
            case 'file':
            case 'folder':
            case 'reference':
            case 'symlink':
            case 'site':
                actualType = type;
                break;
            case "block":{
                actualType = this._determineBlockType(type, resultObj);
                break;
            }
            case "format":{
                actualType = this._determineFormatType(type, resultObj);
                break;
            }
            default:{
                actualType = typeMap[type];
            }

        }

        console.log(resultObj)
        return resultObj.asset[actualType]
    }

    /**
     * assumption is only one type in the returned asset
     * @param type
     * @param resultObj
     * @returns {string}
     * @private
     */
    _determineBlockType(type, resultObj){
        const types = [
            'feedBlock',
            'indexBlock',
            'textBlock',
            'xhtmlDataDefinitionBlock',
            'xmlBlock',
        ];

        for (const item of types){
            if (Object.hasOwn(resultObj.asset, item)){
                return item;
            }
        }
    }

    _determineFormatType(type, resultObj){
        const types = [
            'xsltFormat',
            'scriptFormat',
        ];

        for (const item of types){
            if (Object.hasOwn(resultObj.asset, item)){
                return item;
            }
        }
    }

    // Create Asset
    async create(asset) {
        return this._request('create', '', { asset }, 'POST');
    }

    // Edit Asset
    async edit(asset) {
        return this._request('edit', '', { asset }, 'POST');
    }

    // Delete Asset
    async delete(type, siteNameOrId, path = null, deleteParameters = null, workflowConfiguration = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const body = {};
        if (deleteParameters) body.deleteParameters = deleteParameters;
        if (workflowConfiguration) body.workflowConfiguration = workflowConfiguration;
        return this._request('delete', ident, Object.keys(body).length ? body : null, 'POST');
    }

    // Copy Asset
    async copy(type, siteNameOrId, path, copyParameters, workflowConfiguration = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const body = { copyParameters };
        if (workflowConfiguration) body.workflowConfiguration = workflowConfiguration;
        return this._request('copy', ident, body, 'POST');
    }

    // Move / Rename Asset
    async move(type, siteNameOrId, path, moveParameters, workflowConfiguration = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const body = { moveParameters };
        if (workflowConfiguration) body.workflowConfiguration = workflowConfiguration;
        return this._request('move', ident, body, 'POST');
    }

    // Publish Asset
    async publish(type, siteNameOrId, path = null, publishInformation = {}) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        return this._request('publish', ident, { publishInformation }, 'POST');
    }

    // Unpublish Asset (Shortcut helper utilizing the publish tip)
    async unpublish(type, siteNameOrId, path = null) {
        return this.publish(type, siteNameOrId, path, { unpublish: true });
    }

    // Search
    async search(searchInformation) {
        return this._request('search', '', { searchInformation }, 'POST');
    }

    /* ==========================================
       ADVANCED & SYSTEM UTILITIES
       ========================================== */

    // Check Out
    async checkOut(type, siteNameOrId, path = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        return this._request('checkOut', ident, null, 'POST');
    }

    // Check In
    async checkIn(type, siteNameOrId, path = null, comments = '') {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const body = comments ? { comments } : null;
        return this._request('checkIn', ident, body, 'POST');
    }

    // Relationships (Replaces deprecated listSubscribers method)
    async relationships(type, siteNameOrId, path = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const result = await this._request('relationships', ident, null, 'GET');

        if (!result.success){
            throw new Error(result.message)
        }

        return result.relationships;
    }

    // Read Access Rights
    async readAccessRights(type, siteNameOrId, path = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        return this._request('readAccessRights', ident, null, 'GET');
    }

    // Edit Access Rights
    async editAccessRights(type, siteNameOrId, path = null, accessRightsInformation = {}) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        return this._request('editAccessRights', ident, { accessRightsInformation }, 'POST');
    }

    // List All Sites
    async listSites() {
        return this._request('listSites', '', null, 'GET');
    }

    // Site Copy
    async siteCopy(originalSiteName, newSiteName) {
        return this._request('siteCopy', '', { originalSiteName, newSiteName }, 'POST');
    }

    // Read Audits
    async readAudits(type, siteNameOrId, path = null, auditParameters = null) {
        const ident = this._parseIdentifier(type, siteNameOrId, path);
        const body = auditParameters ? { auditParameters } : null;
        return this._request('readAudits', ident, body, 'POST');
    }
}