/* @flow */
import CouchDBClient from 'couch-flow-client';
import {DBApi} from './db';
import type {MigrationInfo, MigrationDocument} from './types';
import {getMigrations} from './fs';
import path from 'path';

import type {Config} from './config';

import r from './require';

type maybePromise = Promise|any;

type migrationType = {
	up: (host: string, database: string) => maybePromise,
	down: (host: string, database: string) => maybePromise
};

type requireMigrationType = (path: string) => migrationType;

const inlineRequire : requireMigrationType = r;

type options = {
	failOnHashError: boolean,
};

type MigrationsRunInfo = {
	alreadyRun: Array<MigrationInfo>,
	toRun: Array<MigrationInfo>,
	doc: MigrationDocument,
};

export class Runner {
	couch: DBApi;
	config: Config;
	migrationsFolder: string;
	configFolder: string;
	failOnHashError: boolean;
	constructor(config: Config, opts: options) {
		this.config = config;
		this.couch = new DBApi(new CouchDBClient(config.host, config.database));
		this.migrationsFolder = config.migrationsFolder;
		if (typeof(config.configLocation) !== 'string') {
			throw new Error('Unitialized config passed. It must have a resolved configLocation property');
		}
		this.configFolder = config.configLocation;
		this.failOnHashError = opts.failOnHashError;
	}

	async migrateUp(n: number) : Promise {
		var info = await this.getMigrationInfo();

		var doc : MigrationDocument = info.doc;

		if (n === 0 || n > info.toRun.length) {
			n = info.toRun.length;
		}

		console.log('Running ' + n + ' migrations');

		for (var i = 0; i < n; i++) {
			doc = await this.runMigrationUp(info.toRun[i], doc);
		}

		return null;
	}

	async migrateDown(n: number) : Promise {
		var info = await this.getMigrationInfo();

		var doc : MigrationDocument = info.doc;

		if (n === 0 || n > info.alreadyRun.length) {
			n = info.alreadyRun.length;
		}

		console.log('Undoing ' + n + ' migrations');

		while (n > 0) {
			doc = await this.runMigrationDown(info.alreadyRun[n-1], doc);
			n--;
		}

		return null;
	}

	migrate() : Promise {
		return this.migrateUp(0);
	}

	resolveMigrationPath(migration: MigrationInfo) : string {
		var relativePath = path.relative(__dirname, path.join(this.configFolder, this.migrationsFolder, migration.name));
		if (relativePath[0] !== '.') {
			relativePath = './' + relativePath;
		}

		return relativePath;
	}

	async runMigrationUp(migration: MigrationInfo, doc: MigrationDocument) : Promise<MigrationDocument> {
		var relativePath = this.resolveMigrationPath(migration);
		var m = inlineRequire(relativePath);

		this.validateMigration(m, migration.name);

		m.up(this.config.host, this.config.database);

		doc.migrations.push(migration);
		doc.migrations.sort();

		var res = await this.couch.saveMigrationsRun(doc);

		doc._rev = res.body.rev;

		return doc;
	}

	async runMigrationDown(migration: MigrationInfo, doc: MigrationDocument) : Promise<MigrationDocument> {
		var relativePath = this.resolveMigrationPath(migration);
		var m = inlineRequire(relativePath);

		var idx = doc.migrations.indexOf(migration);

		if (idx < 0) {
			throw new Error('Cannot migrate migration ' + migration.name + ' down. It has not been run');
		}

		this.validateMigration(m, migration.name);

		m.down(this.config.host, this.config.database);

		doc.migrations.splice(idx, 1);

		var res = await this.couch.saveMigrationsRun(doc);

		doc._rev = res.body.rev;

		return doc;
	}

	validateMigration(migration: any, name: string) {
		if (migration == null) {
			throw new Error('Migration ' + name + ' is not valid. It exports null');
		}

		if (typeof(migration.up) !== 'function') {
			throw new Error('Migration ' + name + ' is not valid. It must export an up function');
		}

		if (typeof(migration.down) !== 'function') {
			throw new Error('Migration ' + name + ' is not valid. It must export a down function');
		}
	}

	async getMigrationInfo() : Promise<MigrationsRunInfo> {
		var dbMigrationsPromise = this.couch.getMigrationsRun();
		var fsMigrationsPromise = getMigrations(this.migrationsFolder);

		var dbMigrationDocument = await dbMigrationsPromise;
		var fsMigrations = await fsMigrationsPromise;

		var fsMigrationsMap = fsMigrations.reduce((carry, val) => {
			carry[val.name] = val.sha1Hash;
			return carry;
		}, {});
		var fsMigrationsSha1Map = fsMigrations.reduce((carry, val) => {
			carry[val.sha1Hash] = val.name;
			return carry;
		}, {});
		var initialDbMigrations = dbMigrationDocument.migrations;

		// Verify integrity between fs and db
		for (var i = 0, n = initialDbMigrations.length; i < n; i++) {
			var dbInfo = initialDbMigrations[i];
			var fsSha1Hash = fsMigrationsMap[dbInfo.name];
			if (fsSha1Hash == null) {
				// Try and see if we have a renamed migration
				var newName = fsMigrationsSha1Map[dbInfo.sha1Hash];
				if (newName != null) {
					console.log('Renaming migration ' + dbInfo.name + ' to ' + newName + ' as the sha1 hash is the same');
					var m = dbMigrationDocument.migrations[i];
					m.name = newName;
					var res = await this.couch.saveMigrationsRun(dbMigrationDocument);
					fsSha1Hash = dbInfo.sha1Hash;
					dbMigrationDocument._rev = res.body.rev;
				} else {
					throw new Error('Could not find the migration (' + dbInfo.name + ') that was run in the database inside the migration folder.');
				}
			}

			if (this.failOnHashError) {
				if (dbInfo.sha1Hash !== fsSha1Hash) {
					throw new Error('Migration that has already been run in the database has changed contents since it was run.\nDB Hash: ' + dbInfo.sha1Hash + '\nFS Hash: ' + fsSha1Hash);
				}
			}
		}

		var dbMigrations = dbMigrationDocument.migrations;

		var dbMigrationsMap = dbMigrations.reduce((carry, val) => {
			carry[val.name] = val.sha1Hash;
			return carry;
		}, {});

		var migrationsToRun = fsMigrations.filter((migration) => dbMigrationsMap[migration.name] == null);

		return {
			alreadyRun: dbMigrationDocument.migrations,
			toRun: migrationsToRun,
			doc: dbMigrationDocument,
		};
	}
}
