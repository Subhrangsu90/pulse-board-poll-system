/* eslint-disable no-console */

export const logger = {
	info(message: string) {
		console.log(message);
	},
	error(error: unknown) {
		console.error(error);
	},
};
