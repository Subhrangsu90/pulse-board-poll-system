export type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	id_token?: string;
	expires_in: number;
	token_type: string;
};

export type AuthUrlResponse = {
	loginUrl?: URL;
	registerUrl?: URL;
	state: string;
};
