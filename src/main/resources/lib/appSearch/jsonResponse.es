export function jsonResponse(
	body,
	status = 200 // OK
) {
	return {
		body,
		contentType: 'text/json; charset=utf-8',
		status
	};
}
