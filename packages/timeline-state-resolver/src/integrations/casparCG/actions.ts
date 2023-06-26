import got from 'got'
import { t } from '../../lib'
import { ActionExecutionResultCode, ActionExecutionResult, CasparCGOptions } from 'timeline-state-resolver-types'
import { CasparCG } from 'casparcg-connection'

export async function clearAllChannels(connection: CasparCG, resetCb: () => void) {
	if (!connection || !connection.connected) {
		return {
			result: ActionExecutionResultCode.Error,
			response: t('Cannot restart CasparCG without a connection'),
		}
	}

	const { request, error } = await connection.info({})

	if (error) {
		return {
			result: ActionExecutionResultCode.Error,
		}
	}

	// the amount of lines returned equals the amount of channels
	const response = await request
	await Promise.allSettled(
		response.data.map(async (_, i) => {
			return connection.clear({ channel: i + 1 }).then(({ request }) => request)
		})
	)

	resetCb() // emits a resetFromState event

	return {
		result: ActionExecutionResultCode.Ok,
	}
}

export function restartServer(options: CasparCGOptions) {
	if (!options) {
		return { result: ActionExecutionResultCode.Error, response: t('CasparCGDevice._connectionOptions is not set!') }
	}
	if (!options.launcherHost) {
		return {
			result: ActionExecutionResultCode.Error,
			response: t('CasparCGDevice: config.launcherHost is not set!'),
		}
	}
	if (!options.launcherPort) {
		return {
			result: ActionExecutionResultCode.Error,
			response: t('CasparCGDevice: config.launcherPort is not set!'),
		}
	}
	if (!options.launcherProcess) {
		return {
			result: ActionExecutionResultCode.Error,
			response: t('CasparCGDevice: config.launcherProcess is not set!'),
		}
	}

	return new Promise<ActionExecutionResult>((resolve) => {
		const url = `http://${options.launcherHost}:${options.launcherPort}/processes/${options.launcherProcess}/restart`
		got
			.post(url)
			.then((response) => {
				if (response.statusCode === 200) {
					resolve({ result: ActionExecutionResultCode.Ok })
				} else {
					resolve({
						result: ActionExecutionResultCode.Error,
						response: t('Bad reply: [{{statusCode}}] {{body}}', {
							statusCode: response.statusCode,
							body: response.body,
						}),
					})
				}
			})
			.catch((error) => {
				resolve({ result: ActionExecutionResultCode.Error, response: error })
			})
	})
}
