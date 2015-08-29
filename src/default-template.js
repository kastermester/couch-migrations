module.exports = function(name) {
	var res = [];

	res.push('/* ' + name + ' */\n\n');

	res.push('module.exports = {\n');
	res.push('\tup: function(host, database) {\n');
	res.push('\t\t // Code to migrate up goes here\n');
	res.push('\t},\n');
	res.push('\tdown: function(host, database) {\n');
	res.push('\t\t // Code to migrate down goes here\n');
	res.push('\t},\n');
	res.push('};\n');

	return res.join('');
};
