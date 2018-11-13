export function jsonError(
	message = '',
	status = 400 // Bad request
) {
	//log.error(message);
	return {
		body: {
			message
		},
		contentType: 'text/json; charset=utf-8',
		status
	};
}
