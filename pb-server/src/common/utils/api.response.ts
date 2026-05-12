import { Response } from "express";

type ApiResponseOptions<T> = {
	res: Response;
	statusCode?: number;
	message: string;
	data?: T;
};

function sendResponse<T>({ res, statusCode = 200, message, data }: ApiResponseOptions<T>) {
	return res.status(statusCode).json({
		success: true,
		message,
		data: data ?? null,
	});
}

export function ok<T>(res: Response, message: string, data?: T) {
	return sendResponse({
		res,
		statusCode: 200,
		message,
		data,
	});
}

export function created<T>(res: Response, message: string, data?: T) {
	return sendResponse({
		res,
		statusCode: 201,
		message,
		data,
	});
}

export function noContent(res: Response) {
	return res.status(204).send();
}
