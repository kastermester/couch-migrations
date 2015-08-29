/* @flow */
export type MigrationInfo = {
	name: string,
	sha1Hash: string
};

export type MigrationDocument = {
	_rev?: string,
	migrations: Array<MigrationInfo>
};
