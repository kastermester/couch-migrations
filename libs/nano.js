declare type NanoHeaders = { [key: string]: string };
declare type NanoResponse = {
	body: any;
	header: NanoHeaders;
};
declare class NanoDBClient {
	insert(
		doc: any,
		docName: string,
		callback: (
			err: any,
			body: any,
			header: NanoHeaders
		) => void
	): void;

	destroy(
		docName: string,
		rev: string,
		callback: (
			err: any,
			body: any,
			header: NanoHeaders
		) => void
	): void;

	get(
		docName: string,
		callback: (
			err: any,
			body: any,
			header: NanoHeaders
		) => void
	): void;

	head(
		docName: string,
		callback: (
			err: any,
			body: any,
			header: NanoHeaders
		) => void
	): void;
}
