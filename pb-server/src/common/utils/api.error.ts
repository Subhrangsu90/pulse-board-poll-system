type ApiErrorOptions = {
	statusCode: number;
	message: string;
	details?: unknown;
};

export function apiError({ statusCode, message, details }: ApiErrorOptions) {
	const error = new Error(message) as Error & {
		statusCode: number;
		isOperational: boolean;
		details?: unknown;
	};

	error.statusCode = statusCode;
	error.isOperational = true;
	error.details = details;

	Error.captureStackTrace(error);

	return error;
}

export function badRequest(message = "Bad request", details?: unknown) {
	return apiError({
		statusCode: 400,
		message,
		details,
	});
}

export function unauthorized(message = "Unauthorized", details?: unknown) {
	return apiError({
		statusCode: 401,
		message,
		details,
	});
}

export function forbidden(message = "Forbidden", details?: unknown) {
	return apiError({
		statusCode: 403,
		message,
		details,
	});
}

export function notFound(message = "Not found", details?: unknown) {
	return apiError({
		statusCode: 404,
		message,
		details,
	});
}

export function conflict(message = "Conflict", details?: unknown) {
	return apiError({
		statusCode: 409,
		message,
		details,
	});
}

export function internal(message = "Internal server error", details?: unknown) {
	return apiError({
		statusCode: 500,
		message,
		details,
	});
}
