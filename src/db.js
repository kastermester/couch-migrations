/* @flow */
import type {CouchDBClient} from './couch';

import type {MigrationDocument} from './types';

export class DBApi {
	client: CouchDBClient;
	constructor(couchClient: CouchDBClient) {
		this.client = couchClient;
	}

	async getMigrationsRun() : Promise<MigrationDocument> {
		try {
			var migrationsDoc : MigrationDocument = (await this.client.get('migrations')).body;
			return migrationsDoc;
		} catch (e) {
			return {
				migrations: [],
			};
		}
	}

	saveMigrationsRun(migrations: MigrationDocument) : Promise<NanoResponse> {
		if (migrations._rev == null) {
			return this.client.insert(migrations, 'migrations');
		}

		return this.client.update(migrations, 'migrations');
	}
}
