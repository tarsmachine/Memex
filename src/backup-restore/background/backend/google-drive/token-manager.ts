export class DriveTokenManager {
    public tokenStore: DriveTokenStore
    private accessToken: string
    public memexCloudOrigin: string
    private refreshToken: string
    private tokenExpiryDate: Date
    private initializationPromise: Promise<any>

    constructor({
        tokenStore,
        memexCloudOrigin,
    }: {
        tokenStore: DriveTokenStore
        memexCloudOrigin: string
    }) {
        this.memexCloudOrigin = memexCloudOrigin
        this.tokenStore = tokenStore
        this.initializationPromise = new Promise(async (resolve, reject) => {
            try {
                const {
                    token: accessToken,
                    expiryDate,
                } = await this.tokenStore.retrieveAccessToken()
                if (accessToken) {
                    this.accessToken = accessToken
                    this.tokenExpiryDate = expiryDate
                }

                const refreshToken = await this.tokenStore.retrieveRefreshToken()
                if (refreshToken) {
                    this.refreshToken = refreshToken
                }

                resolve()
            } catch (err) {
                reject(err)
            }
        })
    }

    async getAccessToken() {
        await this.initializationPromise
        return this.accessToken
    }

    async getRefreshToken() {
        await this.initializationPromise
        return this.accessToken
    }

    async handleNewTokens({
        accessToken,
        refreshToken,
        expiresInSeconds,
    }: {
        accessToken: string
        refreshToken?: string
        expiresInSeconds: number
    }) {
        if (accessToken && expiresInSeconds) {
            this.tokenExpiryDate = new Date(
                Date.now() + expiresInSeconds * 1000,
            )
            this.accessToken = accessToken
            await this.tokenStore.storeAccessToken(
                this.accessToken,
                this.tokenExpiryDate,
            )
        }
        if (refreshToken) {
            this.refreshToken = refreshToken
            await this.tokenStore.storeRefreshToken(this.refreshToken)
        }
    }

    async refreshAccessToken({ force }: { force?: boolean } = {}) {
        if (!force && !this.isAccessTokenExpired()) {
            return
        }

        const response = await fetch(
            `${this.memexCloudOrigin}/auth/google/refresh`,
            {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    refreshToken: this.refreshToken,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        )
        const { accessToken, expiresInSeconds } = await response.json()
        if (accessToken && expiresInSeconds) {
            await this.handleNewTokens({ accessToken, expiresInSeconds })
        } else {
            console.error(
                'Tried to refresh Google Drive access token, but got no token from the server',
            )
        }
    }

    // margin says how much time before the actual expiry time in ms we actually want to refresh the token
    isAccessTokenExpired({ margin = 1000 * 60 * 10 } = {}): boolean {
        const conservateExpiryTime = this.tokenExpiryDate.getTime() - margin
        return Date.now() >= conservateExpiryTime
    }
}

export type DriveTokenType = 'access' | 'refresh'
export interface DriveTokenStore {
    storeAccessToken(token: string, expiryDate: Date): Promise<any>
    retrieveAccessToken(): Promise<{ token: string; expiryDate: Date }>

    storeRefreshToken(token: string): Promise<any>
    retrieveRefreshToken(): Promise<string>
}

export class LocalStorageDriveTokenStore implements DriveTokenStore {
    prefix: string

    constructor({ prefix }: { prefix: string }) {
        this.prefix = prefix
    }

    async storeAccessToken(token: string, expiryDate: Date): Promise<any> {
        localStorage.setItem(this.prefix + 'access', token)
        localStorage.setItem(
            this.prefix + 'access-expiry',
            expiryDate.getTime().toString(),
        )
    }

    async retrieveAccessToken() {
        const expiryString = localStorage.getItem(this.prefix + 'access-expiry')
        return {
            token: localStorage.getItem(this.prefix + 'access'),
            expiryDate: expiryString && new Date(parseFloat(expiryString)),
        }
    }

    async storeRefreshToken(token: string) {
        localStorage.setItem(this.prefix + 'refresh', token)
    }

    async retrieveRefreshToken() {
        return localStorage.getItem(this.prefix + 'refresh')
    }
}
