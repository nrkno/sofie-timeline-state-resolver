import { ActionExecutionResult, HttpSendOptions, SendCommandResult } from 'timeline-state-resolver-types'
import { HTTPSendDevice, HttpSendDeviceCommand } from '.'
import { AccessToken, ClientCredentials } from 'simple-oauth2'

const TOKEN_REQUEST_RETRY_TIMEOUT_MS = 1000
const TOKEN_EXPIRATION_WINDOW_SEC = 60
const DEFAULT_TOKEN_PATH = '/oauth/token'

const enum AuthMethod {
	BEARER_TOKEN,
	CLIENT_CREDENTIALS,
}
type AuthOptions =
	| {
			method: AuthMethod.CLIENT_CREDENTIALS
			clientId: string
			clientSecret: string
			tokenHost: string
			tokenPath: string
			audience?: string
	  }
	| { method: AuthMethod.BEARER_TOKEN; bearerToken: string }
	| undefined

export class AuthenticatedHTTPSendDevice extends HTTPSendDevice {
	private tokenPromise: Promise<AccessToken> | undefined
	private tokenRequestPending = false
	private authOptions: AuthOptions
	private tokenRefreshTimeout: NodeJS.Timeout | undefined

	async init(options: HttpSendOptions): Promise<boolean> {
		if (options.bearerToken) {
			this.authOptions = {
				method: AuthMethod.BEARER_TOKEN,
				bearerToken: options.bearerToken,
			}
		} else if (options.oauthClientId && options.oauthClientSecret && options.oauthTokenHost) {
			this.authOptions = {
				method: AuthMethod.CLIENT_CREDENTIALS,
				clientId: options.oauthClientId,
				clientSecret: options.oauthClientSecret,
				audience: options.oauthAudience,
				tokenHost: options.oauthTokenHost,
				tokenPath: options.oauthTokenPath ?? DEFAULT_TOKEN_PATH,
			}
			this.requestAccessToken()
		}
		return super.init(options)
	}

	async terminate() {
		this.clearTokenRefreshTimeout()
		return super.terminate()
	}

	private requestAccessToken(): void {
		if (this.tokenRequestPending) return
		this.clearTokenRefreshTimeout()
		this.tokenRequestPending = true
		const promise = this.makeAccessTokenRequest()
		promise
			.then((accessToken) => {
				this.context.logger.debug(`token received`)
				const expiresIn = accessToken.token.expires_in
				if (typeof expiresIn === 'number') {
					this.scheduleTokenRefresh(expiresIn)
				}
			})
			.catch((e) => {
				this.context.logger.error('AuthenticatedHTTPSendDevice', e)
				setTimeout(() => this.requestAccessToken(), TOKEN_REQUEST_RETRY_TIMEOUT_MS)
			})
			.finally(() => {
				this.tokenRequestPending = false
			})
		this.tokenPromise = promise
	}

	private clearTokenRefreshTimeout() {
		if (this.tokenRefreshTimeout) {
			clearTimeout(this.tokenRefreshTimeout)
		}
	}

	private scheduleTokenRefresh(expiresInSec: number) {
		const timeoutMs = (expiresInSec - TOKEN_EXPIRATION_WINDOW_SEC) * 1000
		this.context.logger.debug(`token refresh scheduled in ${timeoutMs}`)
		this.tokenRefreshTimeout = setTimeout(() => this.refreshAccessToken(), timeoutMs)
	}

	private refreshAccessToken(): void {
		this.context.logger.debug(`token refresh`)
		this.requestAccessToken()
		this.tokenRefreshTimeout = undefined
	}

	private async makeAccessTokenRequest(): Promise<AccessToken> {
		if (!this.authOptions || this.authOptions.method !== AuthMethod.CLIENT_CREDENTIALS) {
			throw Error('authOptions missing or incorrect')
		}
		this.context.logger.debug('debug', 'token request')
		const token = await new ClientCredentials({
			client: {
				id: this.authOptions.clientId,
				secret: this.authOptions.clientSecret,
			},
			auth: {
				tokenHost: this.authOptions.tokenHost,
				tokenPath: this.authOptions.tokenPath,
			},
		}).getToken({
			audience: this.authOptions.audience,
		})
		return token
	}

	async sendCommandWithResult({
		timelineObjId,
		context,
		command,
	}: HttpSendDeviceCommand): Promise<ActionExecutionResult<SendCommandResult>> {
		if (this.authOptions) {
			const bearerToken =
				this.authOptions.method === AuthMethod.BEARER_TOKEN ? this.authOptions.bearerToken : await this.tokenPromise
			if (bearerToken) {
				const bearerHeader = `Bearer ${typeof bearerToken === 'string' ? bearerToken : bearerToken.token.access_token}`
				command = {
					...command,
					content: {
						...command.content,
						headers: { ...command.content.headers, ['Authorization']: bearerHeader },
					},
				}
			}
		}
		return super.sendCommandWithResult({ timelineObjId, context, command })
	}
}
