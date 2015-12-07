/* @flow */
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

var r = require('./require');

var inlineRequire : (path: string) => ((name: string) => string);

export class Generator {
	template: string;
	migrationsFolder: string;
	name: string;

	constructor(template: string, migrationsFolder: string, name: string) {
		this.migrationsFolder = migrationsFolder;

		if (template != null) {
			this.template = template;
		} else {
			this.template = './default-template';
		}

		this.name = name;
	}

	generate() : void {
		var templateFn = inlineRequire(this.template);

		var now = new Date();

		var convertToTwoDigits = function(input: number) {
			if (input < 10) {
				return '0' + input.toString();
			}

			return input.toString();
		};

		var datePartName = now.getUTCFullYear().toString();
		datePartName += convertToTwoDigits(now.getUTCMonth()+1);
		datePartName += convertToTwoDigits(now.getUTCDate());
		datePartName += convertToTwoDigits(now.getUTCHours());
		datePartName += convertToTwoDigits(now.getUTCMinutes());
		datePartName += convertToTwoDigits(now.getUTCSeconds());
		var name = datePartName + '_' + this.name + '.js';

		var contents = templateFn(name);

		if (!fs.existsSync(this.migrationsFolder)) {
			mkdirp.sync(this.migrationsFolder);
		}
		fs.writeFileSync(path.join(this.migrationsFolder, name), contents);
		console.log('Migration (' + name + ') generated.');
	}
}
