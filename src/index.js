require('regenerator/runtime');

var fs = require('fs');
var path = require('path');

var parser = require('nomnom');

import {writeConfigFile, getConfig} from './config';

import {Runner} from './runner';

import {Generator} from './generator';

parser.nocolors();

function makeAbsolute(folder: string, fromIfRelative: string) : string {
	if (path.isAbsolute(folder)) {
		return folder;
	}

	return path.resolve(fromIfRelative, folder);
}

var configOption = {
	abbr: 'c',
	default: 'migrations.config.json',
	help: 'JSON file with host and database to migrate. Use "generate-config" command to generate the config',
};

var numberOfMigrationsToRunConfig = {
	abbr: 'n',
	default: 1,
	help: 'Sets how many migrations to run',
	full: 'number-of-migrations',
};

var paranoiaOption = {
	abbr: 'p',
	flag: true,
	default: false,
	help: 'Fails the migration runner if migration hashes differ, recommended in production',
};

var debugOption = {
	flag: true,
	default: false,
	help: 'Enables stack traces on errors',
};

parser.command('generate-config')
	.option('outfile', {
		abbr: 'o',
		help: 'File to write the config to',
		default: 'migrations.config.json',
	})
	.option('host', {
		abbr: 'h',
		help: 'The host to set. If not specified will be prompted for host',
	})
	.option('database', {
		abbr: 'd',
		help: 'The database to set. If not specified will be prompted for database',
	})
	.option('migrationsFolder', {
		abbr: 'f',
		help: 'The migrations folder to set. If not specified will be prompted for folder',
		full: 'migrations-folder',
	})
	.callback((inputOpts) => {
		var prompt = require('prompt');

		var opts = {
			host: inputOpts.host,
			database: inputOpts.database,
			migrationsFolder: inputOpts.migrationsFolder,
		};

		prompt.override = opts;
		prompt.colors = false;

		prompt.message = '';
		prompt.delimiter = '';

		prompt.start();

		// Not using defaults as it messes up the printing totally
		prompt.addProperties(opts, [
			{
				name: 'host',
				message: 'Enter CouchDB host name (http://localhost:5984): ',
			},
			{
				name: 'database',
				message: 'Enter database name (test): ',
			},
			{
				name: 'migrationsFolder',
				message: 'Enter the location of your migrations (migrations): ',
			},
		], function(err) {
			if (err) {
				console.error(err);
				process.exit(1);
			}

			if (opts.host.length === 0) {
				opts.host = 'http://localhost:5984';
			}

			if (opts.database.length === 0) {
				opts.database = 'test';
			}

			if (opts.migrationsFolder.length === 0) {
				opts.migrationsFolder = 'migrations';
			}

			opts.defaultTemplate = null;
			opts.templatesFolder = '.couch-templates';

			writeConfigFile(inputOpts.outfile, opts);
		});
	})
	.help('Generate the migration config');

parser.command('generate')
	.option('name', {
		abbr: 'n',
		help: 'Name of the migration',
		default: 'changeme',
	})
	.option('template', {
		abbr: 't',
		help: 'optional template to use. Default one is specified in migrations.config.json under defaultTemplate key',
	})
	.option('config', configOption)
	.option('debug', debugOption)
	.callback((inputOpts) => {
		var config = getConfig(makeAbsolute(inputOpts.config, process.cwd()));

		var template = inputOpts.template || config.defaultTemplate;

		if (template != null) {
			template = makeAbsolute(template, makeAbsolute(config.templatesFolder, config.configLocation));
		}
		var generator = new Generator(template, makeAbsolute(config.migrationsFolder, config.configLocation), inputOpts.name);
		generator.generate();
	})
	.help('Generate a new migration');

parser.command('migrate')
	.option('config', configOption)
	.option('paranoia', paranoiaOption)
	.option('debug', debugOption)
	.callback((opts) => {
		(async () => {
			var config = getConfig(makeAbsolute(opts.config, process.cwd()));
			var runner = new Runner(config, { failOnHashError: opts.paranoia });

			await runner.migrate();
			process.exit(0);
		})().catch((err) => {
			console.error(err.message);
			if (opts.debug) {
				console.error(err.stack);
			}
			process.exit(1);
		});
	})
	.help('Migrate the database fully up');

parser.command('migrate-up')
	.option('config', configOption)
	.option('paranoia', paranoiaOption)
	.option('numberOfMigrationsToRun', numberOfMigrationsToRunConfig)
	.option('debug', debugOption)
	.callback((opts) => {
		(async () => {
			var config = getConfig(makeAbsolute(opts.config, process.cwd()));
			var runner = new Runner(config, { failOnHashError: opts.paranoia });

			await runner.migrateUp(opts.numberOfMigrationsToRun);
			process.exit(0);
		})().catch((err) => {
			console.error(err.message);
			if (opts.debug) {
				console.error(err.stack);
			}
			process.exit(1);
		});
	})
	.help('Migrate the database N number of migrations up');

parser.command('migrate-down')
	.option('config', configOption)
	.option('paranoia', paranoiaOption)
	.option('numberOfMigrationsToRun', numberOfMigrationsToRunConfig)
	.option('debug', debugOption)
	.callback((opts) => {
		(async () => {
			var config = getConfig(makeAbsolute(opts.config, process.cwd()));
			var runner = new Runner(config, { failOnHashError: opts.paranoia });

			await runner.migrateDown(opts.numberOfMigrationsToRun);
			process.exit(0);
		})().catch((err) => {
			console.error(err.message);
			if (opts.debug) {
				console.error(err.stack);
			}
			process.exit(1);
		});
	})
	.help('Migrate the database N number of migrations down');

parser.nocommand()
	.option('version', {
		flag: true,
		help: 'Print version and exit',
		callback: () => {
			var fileName = path.join(__dirname, '..', 'package.json');
			return JSON.parse(fs.readFileSync(fileName)).version;
		},
	})
	.callback(() => {
		console.log(parser.getUsage());
	});

parser.script('couch-migrations');

parser.parse();
