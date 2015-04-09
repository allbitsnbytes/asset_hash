/**
 * Small library to hash assets and generate asset manifest
 */

var _			= require('lodash');
var	crypto		= require('crypto');
var	fs			= require('fs');
var	path		= require('path');


/**
 * Create an instance of Asset Hash
 */
var AssetHasher = function() {

	/**
	 * Asset manifest
	 * @type {object}
	 * @example
	 * {
	 * 		'logo.png': {
	 * 			file: 'logo-b91nbave2.png',
	 * 			hashed: true
	 * 		}
	 * }
	 */
	var assets = {};

	/**
	 * Default configuration
	 * @type {object}
	 */
	var config = {};

	/**
	 * The algorithm to use to generate hash
	 * @type {String}
	 */
	config.hasher = 'sha1';

	/**
	 * The length of the generated hash.  Only used if generated hash is longer than length
	 * @type {Number}
	 */
	config.length = 10;

	/**
	 * The name and path to asset manifest file
	 * @type {String}
	 */
	config.manifest = 'assets.json';

	/**
	 * Template for hashed filename
	 * @type {String}
	 */
	config.template = '<%= name %>-<%= hash %><%= ext %>';


	/**
	 * Generate hash based on contents
	 *
	 * @private
	 * @param {string} contents File contents for file to hash
	 * @return {string} The generated hash
	 */
	var generateHash = function(contents) {
		if (contents) {
			return crypto.createHash(config.hasher).update(contents).digest('hex').slice(0, config.length);
		}

		return '';
	}


	/**
	 * Generate hashed file and keep original unhashed file or rename original unhashed
	 *
	 * @private
	 * @param {string} file The file to hash
	 * @param {string} hash The has to use
	 * @param {boolean} keepOriginal Whether to keep unhashed original file or hash original file
	 * @return {object} Hash results
	 */
	var hashFile = function(file, hash, keepOriginal) {
		var ext = path.extname(file);
		var contents = fs.readFileSync(file);
		var hash = generateHash(contents);
		var result = {
			hashed: false,
			oldFile: file,
			newFile: ''
		};
console.log('hash: '+hash);
		keepOriginal = keepOriginal || true;

		// If file was hashed, set result object and rename/create hash file
		if (hash !== '') {
			result.hashed = true;
			result.newFile =  path.dirname(file) + '/' + _.template(config.template)({
				name: path.basename(file, ext),
				hash: hash,
				ext: ext
			});

			fs.createReadStream(result.oldFile).pipe(fs.createWriteStream(result.newFile));
		}

		return result;
	}


	/**
	 * Update configuration options.
	 *
	 * @param {object} options Config options to add or update.
	 */
	var set = function(options) {
		_.assign(config, options);
	};


	/**
	 * Get config option for specified key.
	 *
	 * @param {*} key The key for find value for.  If not present and empty string will be returned.
	 * @return {*} Config value for specified key
	 */
	var get = function(key) {
		if (typeof key === 'undefined' || key === '') {
			return config;
		}

		return config[key] || ''
	};


	/**
	 * Hash file(s) based on path(s) provided.  Specified options will override same in config
	 *
	 * @param {string|array} paths The path or array of paths to files to hash
	 * @param {object} options Options to use for specified files
	 * @return {array|object} Single object for single file or array of objects for each file.  Object will have result of file hashing.
	 */
	var hashFiles = function(paths, options) {
		var result = [];

		if (!_.isArray(paths)) {
			paths = [paths];
		}

		paths.forEach(function(path) {
			fileInfo = fs.lstatSync(path);

			if (fileInfo.isDirectory()) {
				files = fs.readdirSync(path);

				files.forEach(function(file) {
					var curPath = path + '/' + file;
					var curFileInfo = fs.lstatSync(curPath);

					if (curFileInfo.isDirectory()) {
						hashFiles(curPath, options);
					} else if (curFileInfo.isFile()) {
						result.push(hashFile(curPath));
					}
				});
			} else if (fileInfo.isFile()) {
				result.push(hashFile(path));
			}
		});

		return result.length > 1 ? result : result.shift();
	};


	/**
	 * Save assets reference to asset manifest file
	 *
	 * @param {object} options Options to configure the manifest file generated
	 */
	var saveManifest = function(options) {

	};


	/**
	 * Update file 
	 */

	return {
		set: set,
		get: get,
		hashFiles: hashFiles,
		saveManifest: saveManifest
	};

}


/**
 * Export
 */
module.exports = AssetHasher();