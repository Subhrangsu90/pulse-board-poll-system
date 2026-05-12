import { NextFunction, Request, Response } from "express";

type CustomError = Error & {
	statusCode?: number;
	isOperational?: boolean;
	details?: unknown;
};

export function errorMiddleware(
	error: CustomError,
	_req: Request,
	res: Response,
	_next: NextFunction
) {
	const statusCode = error.statusCode || 500;
	const message = error.message || "Internal server error";

	return res.status(statusCode).json({
		success: false,
		message,
		details: error.details ?? null,
	});
}
