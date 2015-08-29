/* @flow */
var fs = require('fs');
var path = require('path');

export type Config = {
	host: string,
	database: string,
	migrationsFolder: string,
	defaultTemplate: ?string,
	templatesFolder: string,
	configLocation?: string,
};

export function writeConfigFile(filePath: string, config: Config) : void {
	var toWrite = JSON.stringify({
		host: config.host,
		database: config.database,
		migrationsFolder: config.migrationsFolder,
		defaultTemplate: config.defaultTemplate,
		templatesFolder: config.templatesFolder,
	}, null, 2) + '\n';

	fs.writeFileSync(filePath, toWrite, 'utf-8');
}

export function getConfig(filePath: string) : Config {
	var tryPath = filePath;
	var tries = [];
	do {
		if (fs.existsSync(tryPath)) {
			var res : Config = JSON.parse(fs.readFileSync(tryPath, 'utf-8'));
			res.configLocation = path.dirname(tryPath);
			return res;
		}
		tries.push(tryPath);
		tryPath = path.join(path.dirname(path.dirname(tryPath)), path.basename(tryPath));
	} while (tryPath !== path.join('/', path.basename(tryPath)));
	throw new Error('Could not find config file. Looked in:\n' + tries.join('\n'));
}
