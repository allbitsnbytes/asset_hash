/**
 * Small library to hash assets and generate asset manifest
 *
 * TODO: Add support to merge existing manifest file and computed asset library
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
	 * 			path: 'logo-b91nbave2.png',
	 * 			original: logo.png,
	 * 			hashed: true,
	 * 			hash: 'b91nbave2',
	 * 			type: png
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
	 * The hash key is prepended to the hash.  This makes it easy to identify hashed versions of a file
	 * @type {string}
	 */
	config.hashKey = 'aH4urS';

	/**
	 * The length of the generated hash.  Only used if generated hash is longer than length
	 * @type {number}
	 */
	config.length = 8;

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
	config.base = process.cwd();

	/**
	 * Path where to save manifest file
	 * @type {string}
	 */
	config.path = '';

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
	 * Check if file is a vinyl file or file object.  To be a file object, the following properties are required: path, contents
	 *
	 * @private
	 * @param {vinyl|object} file The object to check to see if it's a valid file
	 * @return {boolean} Whether file is a valid file object
	 */
	var isFile = function(file) {
		return  !_.isString(file) && !_.isUndefined(file.path) && !_.isUndefined(file.contents) ? true : false;
	};


	/**
	 * Load assets from manifest if present
	 *
	 * @private
	 * @param {object} options The options specified
	 * @return {boolean} Whether the manifest was loaded
	 */
	var loadManifest = function(opt) {
		var options = _.clone(config);
		_.assign(options, opt);

		try {
			var manifestPath = path.join(options.path, options.manifest);

			if (!_.isEmpty(manifestPath)) {
				assets = require(path.join(process.cwd(), manifestPath)) || {};
				return true;
			}
		}
		catch(e) {}

		return false;
	};


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
	};


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
		var contents = '';
		var filePath = '';
		var patterns = [];

		// Get file contents and path
		if (isFile(file)) {
			contents = Buffer.isBuffer(file.contents) ? file.contents.toString() : file.contents;
			filePath = path.relative(options.base, file.path);
		} else {
			contents = fs.readFileSync(file);
			filePath = path.relative(options.base, file);
		}

		// Get file name details
		var ext 		= path.extname(filePath);
		var name		= path.basename(filePath, ext);
		var dirPath		= path.dirname(filePath);

		// Initialize results object
		var result 		= {
			hashed: false,
			hash: '',
			original: filePath,
			path: filePath,
			type: ext.replace('.', '')
		};

		// If this is a hashed file, return.  Nothing else to do here
		var hashedVersion = _.isString(filePath) && filePath.indexOf(options.hashKey) === -1 ? false : true;

		if (!hashedVersion) {
			var originalPath = result.original;

			// If file was already hashed, get old hash
			if (assets[originalPath]) {
				result.hashed = assets[originalPath].hashed;
				result.hash = assets[originalPath].hash;
				result.path = assets[originalPath].path;
			} else {
				result.hashed = true;
			}

			// Generate hash from content
			var newHash = options.hashKey + generateHash(contents, options.hasher, options.length);

			// If hash was generated
			if (result.hash !== newHash) {
				result.hash =  newHash;
				result.path = path.relative(options.base, path.join(dirPath, _.template(options.template)({
					name: name,
					hash: result.hash,
					ext: result.type
				})));

				// Pattern to match previously hashed files
				patterns.push(path.join(dirPath, _.template(options.template)({
					name: name,
					hash: '==HASHREGEX==',
					ext: result.type
				})).replace('==HASHREGEX==', options.hashKey + '*'));

				// Find any previously hashed file versions
				var hashedOldFiles = glob.sync(patterns.join('|'));

				// Delete old hash file(s)
				hashedOldFiles.forEach(function(filePath) {
					fs.unlinkSync(filePath);
				});

				// Create new hashed file unless instructed to skip
				if (options.save) {
					fs.createReadStream(originalPath).pipe(fs.createWriteStream(result.path));
				}

				// Remove original file if necessary
				if (options.replace) {
					fs.unlinkSync(originalPath);
				}

				// Add file to or update asset library
				assets[originalPath] = result;
			}
		}

		return result;
	};


	return {

		/**
		 * Update configuration options
		 *
		 * @param {object} options Config options to add or update
		 */
		set: function(options) {
			_.assign(config, options);
		},


		/**
		 * Get config option for specified key
		 *
		 * @param {*} key The key for find value for.  If not present and empty string will be returned.  If key is undefined/none provided then the whole config object will be returned
		 * @return {*} Config value for specified key
		 */
		get: function(key) {
			if (typeof key === 'undefined' || key === '') {
				return config;
			}

			return config.hasOwnProperty(key) ? config[key] : '';
		},


		/**
		 * Hash file(s) based on path(s) provided.  Specified options will override same in config
		 *
		 * @param {string|array} paths The path or array of paths to files to hash
		 * @param {object} opt Options to use for specified files
		 * @return {array|object} Single object for single file or array of objects for each file.  Object will have result of file hashing
		 */
		hashFiles: function(paths, opt) {
			var options = _.clone(config);
			var results = [];

			// Set config options to use for this hash session
			_.assign(options, opt);

			if (!_.isArray(paths)) {
				paths = [paths];
			}

			loadManifest(options);

			// Process files for each path
			paths.forEach(function(filePaths) {
				if (_.isString(filePaths)) {
					filePaths = glob.sync(filePaths);

					filePaths.forEach(function(filePath) {
						var fileInfo = fs.lstatSync(filePath);

						if (fileInfo.isDirectory()) {
							var dirFiles = fs.readdirSync(filePath);

							dirFiles.forEach(function(dirFile) {
								var curPath = path.join(filePath, dirFile);
								var curFileInfo = fs.lstatSync(curPath);

								if (curFileInfo.isDirectory()) {
									results = results.concat(hashFiles(curPath, options));
								} else if (curFileInfo.isFile()) {
									results.push(hashFile(curPath, options));
								}
							});
						} else if (fileInfo.isFile()) {
							results.push(hashFile(filePath, options));
						}
					});
				} else {
					results.push(hashFile(filePaths, options));
				}
			});

			return results.length > 1 ? results : results.shift();
		},


		/**
		 * Load assets from manifest if present
		 *
		 * @private
		 * @param {object} options The options specified
		 * @return {boolean} Whether the manifest was loaded
		 */
		loadManifest: function(options) {
			return loadManifest(options);
		},


		/**
		 * Get asset library information for a specified original file
		 *
		 * @param  {string} file The path to the original file.  This is based off the base directory specified in the config
		 * @return {object}
		 */
		getAsset: function(file) {
			return _.isObject(assets[file]) ? assets[file] : null;
		},


		/**
		 * Get asset library.  This is an object with information from all files that have been hashed
		 *
		 * @return {object} The asset library
		 */
		getAssets: function() {
			return assets;
		},


		/**
		 * Get hashed file for specified original file.  Will return path to provided file if file is not in the asset library
		 *
		 * @param {string} file The original file to find hashed file for
		 * @return {string}
		 */
		getAssetFile: function(file) {
			return _.isObject(assets[file]) ? assets[file].path : file;
		},


		/**
		 * Update asset in asset library
		 *
		 * @param {string} file The path to the file to update
		 * @param {object} data The options keys and values to update.  If key is not present in for file, key and value will be added
		 */
		updateAsset: function(file, data) {
			if (_.isObject(assets[file]) && _.isObject(data)) {
				_.assign(assets[file], data);
			}
		},


		/**
		 * Reset asset library.
		 *
		 * @return {object} The asset library
		 */
		resetAssets: function() {
			return (assets = {});
		},


		/**
		 * Save assets library to manifest file
		 *
		 * @param {object} opt Options to configure the manifest file generated
		 */
		saveManifest: function(opt) {
			var options = _.clone(config);

			_.assign(options, opt);

			if (options.manifest !== false && (typeof options.manifest === 'string' && options.manifest !== ''))
				fs.writeFileSync(path.join(options.path, options.manifest), JSON.stringify(assets));
		},


		/**
		 * Get list of valid hashers
		 *
		 * @return {array} List of available hashers
		 */
		getHashers: function() {
			return crypto.getHashes();
		}
	};

};


/**
 * Export
 */
module.exports = AssetHasher();
