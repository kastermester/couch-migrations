/* @flow */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {MigrationInfo} from './types';

function stat(path: string) : Promise<fs.Stats> {
	return new Promise(function(resolve, reject) {
		fs.stat(path, function(err, stats) {
			if (err) {
				reject(err);
			} else {
				resolve(stats);
			}
		});
	});
}

function readDir(path: string) : Promise<Array<string>> {
	return new Promise(function(resolve, reject) {
		fs.readdir(path, function(err, files) {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});
}

export function sha1HashFile(path: string) : Promise<string> {
	var hash = crypto.createHash('sha1');
	return new Promise(function(resolve, reject) {
		var stream = fs.createReadStream(path);
		var errored = false;
		stream.on('data', function(data) {
			hash.update(data, 'utf8');
		});

		stream.on('error', function(err) {
			errored = true;
			reject(err);
		});

		stream.on('end', function() {
			if (!errored) {
				var hexHash : string = hash.digest('hex');
				resolve(hexHash);
			}
		});
	});

}

export async function getMigrations(folder: string) : Promise<Array<MigrationInfo>> {
	var files : Array<string> = await readDir(folder);
	if (files.length === 0) {
		return [];
	}
	var promises = files.map(async function(file: string) : Promise<boolean> {
		var st = await stat(path.join(folder, file));

		if (!st.isFile()) {
			throw new Error('Only files can be run as migrations. ' + file + ' is not a regular file');
		}

		return true;
	});

	await Promise.all(promises);
	files.sort();

	return await Promise.all(files.map(async function(file: string) : Promise<MigrationInfo> {
		var sha1Hash = await sha1HashFile(path.join(folder, file));

		return {
			name: file,
			sha1Hash: sha1Hash,
		};
	}));
}
