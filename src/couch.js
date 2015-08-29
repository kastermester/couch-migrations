/* @flow */
import nano from 'nano';

type NanoCallback = (err: any, body: any, header: NanoHeaders) => void;

export class CouchDBClient {
	client: NanoDBClient;
	constructor(host: string, database: string) {
		this.client = nano(host).use(database);
	}

	insert(doc: any, docName: string) : Promise {
		if (doc == null) {
			throw new Error('Cannot insert null');
		}

		if (doc._rev != null) {
			throw new Error('Updating through inserts are not allowed. Use CouchDBClient.update() instead');
		}
		return this.makePromise(done => this.client.insert(doc, docName, done));
	}

	update(doc: any, docName: string) : Promise<NanoResponse> {
		if (doc == null) {
			throw new Error('Cannot update null');
		}

		if (doc._rev == null) {
			throw new Error('Unspecified reivsion');
		}

		return this.makePromise(done => this.client.insert(doc, docName, done));
	}

	head(docName: string) : Promise<NanoResponse> {
		return this.makePromise(done => this.client.head(docName, done));
	}

	get(docName: string) : Promise<NanoResponse> {
		return this.makePromise(done => this.client.get(docName, done));
	}

	destroy(docName: string, rev: string) : Promise<NanoResponse> {
		return this.makePromise(done => this.client.destroy(docName, rev, done));
	}

	async exists(docName: string) : Promise<boolean> {
		try {
			await this.head(docName);
			return true;
		} catch (e) {
			return false;
		}
	}

	makePromise(action: (done: NanoCallback) => void) : Promise<NanoResponse> {
		var res : Promise<NanoResponse> = this.makeGenericPromise(action);
		return res;
	}

	makeGenericPromise(action: (done: NanoCallback) => void) : Promise {
		function handler(resolve, reject) {
			function callback(err: any, body: any, header: NanoHeaders) {
				if (err != null) {
					if (err instanceof Error) {
						reject(err);
					} else {
						reject(new Error(err));
					}
				}
				resolve({
					body: body,
					header: header,
				});
			}
			action(callback);
		}
		return new Promise(handler);
	}
}
