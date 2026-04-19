type LogPayload = Record<string, unknown> | string;

function format(level: string, payload: LogPayload) {
	const timestamp = new Date().toISOString();
	if (typeof payload === "string") {
		return `[${timestamp}] ${level} ${payload}`;
	}
	return `[${timestamp}] ${level} ${JSON.stringify(payload)}`;
}

export const logger = {
	info(payload: LogPayload) {
		console.log(format("INFO ", payload));
	},
	warn(payload: LogPayload) {
		console.warn(format("WARN ", payload));
	},
	error(payload: LogPayload) {
		console.error(format("ERROR", payload));
	},
};

export default logger;
