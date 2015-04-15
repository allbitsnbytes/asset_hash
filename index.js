/**
 * Small library to hash assets and generate asset manifest
 */

var _			= require('lodash');
var	crypto		= require('crypto');
var	fs			= require('fs');
var glob		= require('glob');
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
	 * @type {string}
	 */
	config.hasher = 'sha1';

	/**
	 * The length of the generated hash.  Only used if generated hash is longer than length
	 * @type {number}
	 */
	config.length = 10;

	/**
	 * Whether to replace original file or keep original file and create hashed file
	 * @type {string}
	 */
	config.replace = false;

	/**
	 * The name and path to asset manifest file
	 * @type {string}
	 */
	config.manifest = 'assets.json';

	/**
	 * The base directory from which to save assets
	 * @type {string}
	 */
	config.base = '.';

	/**
	 * Path where to save manifest file
	 * @type {string}
	 */
	config.path = '.';

	/**
	 * Set this to false to skip saving hashed files.  Hashed filename will be generated and added to asset library but not saved to file system.
	 * The reason for this feature is to allow build scripts like gulp to write the files themselves.
	 * @type {boolean}
	 */
	config.save = true;

	/**
	 * Template for hashed filename
	 * @type {string}
	 */
	config.template = '<%= name %>-<%= hash %>.<%= ext %>';


	/**
	 * Generate hash based on contents
	 *
	 * @private
	 * @param {string} contents File contents for file to hash
	 * @param {string} hash The has type to use
	 * @param {number} length The length of the hash
	 * @return {string} The generated hash
	 */
	var generateHash = function(contents, hash, length) {
		if (contents) {
			return crypto.createHash(hash).update(contents).digest('hex').slice(0, length);
		}

		return '';
	}


	/**
	 * Generate hashed file and keep original unhashed file or rename original unhashed
	 *
	 * @private
	 * @param {string} file The file to hash
	 * @param {object} options Options to use to hash the file
	 * @param {boolean} keepOriginal Whether to keep unhashed original file or hash original file
	 * @return {object} Hash results
	 */
	var hashFile = function(file, options) {
		var ext 		= path.extname(file);
		var name		= path.basename(file, ext);
		var filePath	= path.dirname(file);
		var contents 	= fs.readFileSync(file);
		var hash 		= generateHash(contents, options.hasher, options.length);
		var patterns 	= [];
		var result 		= {
			hashed: false,
			original: path.relative(options.base, file),
			path: '',
			hash: hash,
			type: ext.replace('.', '')
		};

		// If file was hashed, set result object and rename/create hash file
		if (hash !== '') {
			result.hashed = true;
			result.path = path.relative(options.base, path.join(filePath, _.template(options.template)({
				name: name,
				hash: hash,
				ext: ext.replace('.', '')
			})));

			// Pattern to match previously hashed files
			patterns.push(path.join(filePath, _.template(options.template)({
				name: name,
				hash: '=HASHREGEX=',
				ext: ext.replace('.', '')
			})).replace('=HASHREGEX=', '[0-9a-zA-Z_-]*'));

			// Find any previously hashed file versions
			hashedOldFiles = glob.sync(patterns.join('|'));

			// Delete old hash file(s)
			hashedOldFiles.forEach(function(file) {
				fs.unlinkSync(file);
			});

			// Create new hashed file unless instructed to skip
			if (options.save) {
				fs.createReadStream(result.original).pipe(fs.createWriteStream(result.path));
			}

			// Remove original file if necessary
			if (options.replace) {
				fs.unlinkSync(result.original);
			}

			// Add file to or update asset library
			assets[result.original] = result;
		} else {
			result.path = result.original;
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
	 * @param {*} key The key for find value for.  If not present and empty string will be returned.  If key is undefined/none provided then the whole config object will be returned.
	 * @return {*} Config value for specified key
	 */
	var get = function(key) {
		if (typeof key === 'undefined' || key === '') {
			return config;
		}

		return config.hasOwnProperty(key) ? config[key] : '';
	};


	/**
	 * Hash file(s) based on path(s) provided.  Specified options will override same in config
	 *
	 * @param {string|array} paths The path or array of paths to files to hash
	 * @param {object} options Options to use for specified files
	 * @return {array|object} Single object for single file or array of objects for each file.  Object will have result of file hashing.
	 */
	var hashFiles = function(paths, options) {
		var curConfig = _.clone(config);
		var results = [];

		// Set config options to use for this hash session
		_.assign(curConfig, options);

		if (!_.isArray(paths)) {
			paths = [paths];
		}

		// Process files for each path
		paths.forEach(function(filePaths) {
			filePaths = glob.sync(filePaths);

			filePaths.forEach(function(filePath) {
				fileInfo = fs.lstatSync(filePath);

				if (fileInfo.isDirectory()) {
					dirFiles = fs.readdirSync(filePath);

					dirFiles.forEach(function(dirFile) {
						var curPath = path.join(filePath, dirFile);
						var curFileInfo = fs.lstatSync(curPath);

						if (curFileInfo.isDirectory()) {
							hashFiles(curPath, options);
						} else if (curFileInfo.isFile()) {
							results.push(hashFile(curPath, curConfig));
						}
					});
				} else if (fileInfo.isFile()) {
					results.push(hashFile(filePath, curConfig));
				}
			})
		});

		return results.length > 1 ? results : results.shift();
	};


	var getAsset = function(file) {
		return _.isObject(assets[file]) ? assets[file] : null;
	};


	/**
	 * Get asset library.  This is an object with information from all files that have been hashed
	 *
	 * @return {object} The asset library
	 */
	var getAssets = function() {
		return assets;
	};


	/**
	 * Update asset in asset library.
	 *
	 * @param {string} file The path to the file to update
	 * @param {object} data The options keys and values to update.  If key is not present in for file, key and value will be added
	 */
	var updateAsset = function(file, data) {
		if (_.isObject(assets[file]) && _.isObject(data)) {
			_.assign(assets[file], data);
		}
	};


	/**
	 * Reset asset library.
	 *
	 * @return {object} The asset library
	 */
	var resetAssets = function() {
		return assets = {};
	};


	/**
	 * Save assets library to manifest file
	 *
	 * @param {object} options Options to configure the manifest file generated
	 */
	var saveManifest = function(options) {
		var curConfig = _.clone(config);
		
		_.assign(curConfig, options);

		fs.writeFileSync(path.join(curConfig.path, curConfig.manifest), JSON.stringify(assets));
	};


	/**
	 * Get list of valid hashers
	 *
	 * @return {array} List of available hashers
	 */
	var getHashers = function() {
		return crypto.getHashes();
	}


	/**
	 * Update file 
	 */

	return {
		get: get,
		set: set,
		hashFiles: hashFiles,
		getAsset: getAsset,
		getAssets: getAssets,
		resetAssets: resetAssets,
		updateAsset: updateAsset,
		saveManifest: saveManifest,
		getHashers: getHashers
	};

}


/**
 * Export
 */
module.exports = AssetHasher();