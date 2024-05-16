import { HTTPSendOptions } from 'timeline-state-resolver-types'
import { HTTPSendDevice, HttpSendDeviceCommand } from '.'
import { AccessToken, ClientCredentials } from 'simple-oauth2'

export class AuthenticatedHTTPSendDevice extends HTTPSendDevice {
	private tokenPromise: Promise<AccessToken> | undefined
	private authOptions: { clientId: string; clientSecret: string; tokenHost: string; audience?: string } | undefined

	async init(options: HTTPSendOptions): Promise<boolean> {
		if (options.oauthClientId && options.oauthClientSecret && options.oauthTokenHost) {
			this.authOptions = {
				clientId: options.oauthClientId,
				clientSecret: options.oauthClientSecret,
				audience: options.oauthAudience,
				tokenHost: options.oauthTokenHost,
			}
			const promise = this.requestAccessToken()
			promise.catch(
				(e) => {
					this.emit('error', 'AuthenticatedHTTPSendDevice', e)
				}
				// retry
			)
			this.tokenPromise = promise
		}
		return super.init(options)
	}

	async requestAccessToken(): Promise<AccessToken> {
		if (!this.authOptions) {
			throw Error('authOptions missing')
		}
		const token = await new ClientCredentials({
			client: {
				id: this.authOptions.clientId,
				secret: this.authOptions.clientSecret,
			},
			auth: {
				tokenHost: this.authOptions.tokenHost,
			},
		}).getToken({})
		return token
	}

	async sendCommand({ tlObjId, context, command }: HttpSendDeviceCommand): Promise<void> {
		if (this.options) {
			const bearerToken = await this.tokenPromise
			if (bearerToken) {
				if (bearerToken.expired()) {
					// todo: this should happen only once
					this.tokenPromise = bearerToken.refresh()
				}
				command = {
					...command,
					content: {
						...command.content,
						headers: { ...command.content.headers, ['Authorization']: `Bearer ${bearerToken.token.access_token}` },
					},
				}
			}
		}
		return super.sendCommand({ tlObjId, context, command })
	}
}
