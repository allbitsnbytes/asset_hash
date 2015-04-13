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
			oldFile: file,
			newFile: '',
			hash: hash,
			type: ext.replace('.', '')
		};

		// If file was hashed, set result object and rename/create hash file
		if (hash !== '') {
			result.hashed = true;
			result.newFile =  filePath + '/' + _.template(options.template)({
				name: name,
				hash: hash,
				ext: ext.replace('.', '')
			});

			// Pattern to match previously hashed files
			patterns.push(filePath + '/' + _.template(options.template)({
				name: name,
				hash: '=HASHREGEX=',
				ext: ext.replace('.', '')
			}).replace('=HASHREGEX=', '[0-9a-zA-Z_-]*'));

			// Find any previously hashed file versions
			hashedOldFiles = glob.sync(patterns.join('|'));

			// Delete old hash file(s)
			hashedOldFiles.forEach(function(file) {
				fs.unlinkSync(file);
			});

			// Create new hashed file
			fs.createReadStream(result.oldFile).pipe(fs.createWriteStream(result.newFile));

			// Remove original file if necessary
			if (options.replace) {
				fs.unlinkSync(result.oldFile);
			}

			// Add file to or update asset library
			assets[result.oldFile] = result;
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
		paths.forEach(function(path) {
			filePaths = glob.sync(path);

			filePaths.forEach(function(filePath) {
				fileInfo = fs.lstatSync(filePath);

				if (fileInfo.isDirectory()) {
					dirFiles = fs.readdirSync(filePath);

					dirFiles.forEach(function(dirFile) {
						var curPath = filePath + '/' + dirFile;
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


	/**
	 * Get asset library.  This is an object with information from all files that have been hashed
	 *
	 * @return {object} The asset library
	 */
	var getAssets = function() {
		return assets;
	};


	/**
	 * Save assets library to manifest file
	 *
	 * @param {object} options Options to configure the manifest file generated
	 */
	var saveManifest = function(options) {
		var curConfig = _.clone(config);
		
		// Set config options to use for t
		_.assign(curConfig, options);

		fs.writeFileSync(curConfig.manifest, JSON.stringify(assets));
	};


	/**
	 * Update file 
	 */

	return {
		set: set,
		get: get,
		hashFiles: hashFiles,
		getAssets: getAssets,
		saveManifest: saveManifest
	};

}


/**
 * Export
 */
module.exports = AssetHasher();