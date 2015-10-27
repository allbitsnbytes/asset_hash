/**
 * Test Asset Hash
 */

var _			= require('lodash');
var	crypto		= require('crypto');
var	expect		= require('chai').expect;
var fs			= require('fs');
var glob		= require('glob');
var	hasher		= require('../');
var path		= require('path');
var vinyl		= require('vinyl-file');


// Test variables

var tmpDir		= 'tmp/';
var testFiles	= [
	tmpDir + 'img/bg.jpg',
	tmpDir + 'img/favicon.png',
	tmpDir + 'img/logo.png',
	tmpDir + 'css/landing.css',
	tmpDir + 'css/promos.css',
	tmpDir + 'css/styles.css',
	tmpDir + 'js/main.js',
	tmpDir + 'js/shoestring.min.js'
];

var testManifestFilename = 'image-assets.json';
var testManifest = {};

testManifest[tmpDir + 'img/bg.jpg'] = {
	hashed: false,
	hash: '',
	original: tmpDir + 'img/bg.jpg',
	path: tmpDir + 'img/bg.jpg',
	type: 'jpg'
};
testManifest[tmpDir + 'img/favicon.png'] = {
	hashed: false,
	hash: '',
	original: tmpDir + 'img/favicon.png',
	path: tmpDir + 'img/favicon.png',
	type: 'png'
};
testManifest[tmpDir + 'img/logo.png'] = {
	hashed: false,
	hash: '',
	original: tmpDir + 'img/logo.png',
	path: tmpDir + 'img/logo.png',
	type: 'png'
};

var jsDir		= path.join(tmpDir, 'js');


// Utility Functions

/**
 * Clean up  test environment
 *
 * @param {string} path The path to directory to remove
 */
function removeTestDir(dirPath) {
	var files = [];

	if(fs.lstatSync(dirPath).isDirectory()) {
		files = fs.readdirSync(dirPath);

		files.forEach(function(file, index) {
			var curPath = path.join(dirPath, file);

			if(fs.lstatSync(curPath).isDirectory()) {
				removeTestDir(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});

		fs.rmdirSync(dirPath);
    }
}


/**
 * Add test files
 *
 * @param {array} files Test files to create
 */
function addTestFiles(files) {
	if (!_.isArray(files)) {
		files = [files];
	}

	// Loop and add files
	files.forEach(function(file, index) {
		var filePath 	= path.dirname(file).split('/');
		var curDir 		= '';

		// Create parent directories for file if necessary
		while (filePath.length > 0) {
			curDir = path.join(curDir, filePath.shift());

			try {
				fs.lstatSync(curDir);
			}
			catch(e) {
				fs.mkdirSync(curDir);
			}
		}

		fs.writeFileSync(file, 'test file '+index);
	});
}


/**
 * Add test manifest file
 *
 * @param {string} filename The name of the file to create
 * @param {object} contents The file contents
 */
function addTestManifest(filename, contents) {
	var paths = filename.split('/');
	var curDir = '';

	while (paths.length > 0) {
		curDir = path.join(curDir, paths.shift());

		try {
			fs.lstatSync(curDir);
		}
		catch(e) {
			fs.mkdirSync(curDir);
		}
	}

	fs.writeFileSync(filename, JSON.stringify(contents));
}


/**
 * Remove test files
 *
 * @param  {array} files The files to remove
 */
function removeTestFiles(files) {
	if (!_.isArray(files)) {
		files = [files];
	}

	files.forEach(function(file, index) {
		fs.unlinkSync(file);
	});
}


describe('Test if Asset Hasher is defined', function() {

	it('Should be an object', function() {
		expect(hasher).to.exist.and.to.be.an('object');
	})

});


describe('Test utility functions', function() {

	it('Should add a test file', function() {
		addTestFiles(testFiles[0]);

		expect(fs.lstatSync(testFiles[0]).isFile()).to.be.ok;
	})

	it('Should remove test file', function() {
		removeTestFiles(testFiles[0]);

		expect(fs.lstatSync.bind(fs.lstatSync, testFiles[0])).to.throw(Error, 'ENOENT, no such file or directory');
	})

	it('Should add test files', function() {
		addTestFiles(testFiles);

		testFiles.forEach(function(file) {
			expect(fs.lstatSync(file).isFile()).to.be.ok;
		});
	})

	it('Should remove test files', function() {
		removeTestFiles(testFiles);

		testFiles.forEach(function(file) {
			expect(fs.lstatSync.bind(fs.lstatSync, file)).to.throw(Error, 'ENOENT, no such file or directory');
		})
	})

	it('Should remove "' + tmpDir + '" directory', function() {
		try {
			removeTestDir(tmpDir);
		}
		catch(e) {
			expect(removeTestDir.bind(removeTestDir, tmpDir)).to.throw(Error, "ENOENT, no such file or directory");
		}
	})

});


describe('Test methods exist', function() {

	var methods = ['get', 'set', 'hashFiles', 'loadManifest', 'getAsset', 'getAssets', 'getAssetFile', 'resetAssets', 'saveManifest', 'updateAsset'];

	methods.forEach(function(method) {
		it('Should have a ' + method + ' method', function() {
			expect(hasher[method]).to.be.a('function');
		})
	});

});


describe('Test config functionality', function() {

	it('Should get all config', function() {
		var config = hasher.get();

		expect(config).to.be.a('object');
	})

	it('Should have default config values', function() {
		var defaults = ['base', 'hasher', 'hashKey', 'length', 'manifest', 'path', 'replace', 'save', 'template'];
		var	config = hasher.get();

		expect(config).to.have.all.keys(defaults);
	})

	it('Should get config value', function() {
		var length = hasher.get('length');

		expect(length).to.not.be.empty;
	})

	it('Should return empty string for config keys that are not present', function() {
		var bogusValue = hasher.get('bogus_key_name');

		expect(bogusValue).to.be.a('string').and.be.empty;
	})

	it('Should set config value and also not delete previous entries', function() {
		hasher.set({'key1abc': 'val1abc'});
		hasher.set({'key2abc': 'val2abc'});

		expect(hasher.get('key1abc')).to.be.equal('val1abc');
		expect(hasher.get('key2abc')).to.be.equal('val2abc');
	})

});


describe('Test default config is valid', function() {

	it('Default hasher should be sha1', function() {
		expect(hasher.get('hasher')).to.be.a('string').and.be.equal('sha1');
	})

	it('Default hash key should be aH4urS', function() {
		expect(hasher.get('hashKey')).to.be.a('string').and.be.equal('aH4urS');
	})

	it('Default hash length should be 8', function() {
		expect(hasher.get('length')).to.be.a('number').and.be.equal(8);
	})

	it('Default replace should be false', function() {
		expect(hasher.get('replace')).to.be.a('boolean').and.be.equal(false);
	})

	it('Defualt manifest file should be assets.json', function() {
		expect(hasher.get('manifest')).to.match(/[a-zA-Z0-9_/\-]+\.json/).and.be.equal('assets.json');
	})

	it('Default base should be .', function() {
		expect(hasher.get('base')).to.be.a('string').and.be.equal('.');
	})

	it('Default path should be .', function() {
		expect(hasher.get('path')).to.be.a('string').and.be.equal('.');
	})

	it('Default save should be true', function() {
		expect(hasher.get('save')).to.be.a('boolean').and.be.equal(true);
	})

	it('Default hashed filename template should be <%= name %>-<%= hash %>.<%= ext %>', function() {
		expect(hasher.get('template')).to.be.a('string').and.be.equal('<%= name %>-<%= hash %>.<%= ext %>');
	})

	it('Should have a valid template format', function() {
		hasher.set({template: '<%= name %>_<%= hash %>.<%= ext %>'});

		addTestFiles(testFiles[0]);

		var hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo.original).to.equal(hashInfo.path.replace('_' + hashInfo.hash, ''));

		removeTestDir(tmpDir);
	})
});


describe('Test hashing functionality', function() {

	beforeEach(function() {
		addTestFiles(testFiles);
		hasher.resetAssets();
	})

	afterEach(function() {
		removeTestDir(tmpDir);
	})

	it('Should get a list of hashers', function() {
		expect(hasher.getHashers()).to.be.a('array').and.have.length.greaterThan(0);
	})

	it('Should return an object if only one file is hashed', function() {
		expect(hasher.hashFiles(testFiles[0])).to.be.an('object');
	})

	it('Should return object with default fields', function() {
		var hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo.hashed).to.exist;
		expect(hashInfo.path).to.be.a('string');
		expect(hashInfo.original).to.be.a('string');
		expect(hashInfo.hash).to.be.a('string');
		expect(hashInfo.type).to.be.a('string');
	})

	it('Should hash single file', function() {
		var	hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo.hashed).to.be.true;
		expect(hashInfo.original).to.equal(testFiles[0]);
		expect(hashInfo.path).to.have.length.greaterThan(hashInfo.original.length);
		expect(fs.lstatSync(hashInfo.path).isFile()).to.be.ok;
	})

	it('Should hash single file and keep original file', function() {
		var hashInfo = hasher.hashFiles(testFiles[0], {replace: false});

		expect(fs.lstatSync(hashInfo.path).isFile()).to.be.ok;
		expect(fs.lstatSync(hashInfo.original).isFile()).to.be.ok;
	})

	it('Should hash single file and replace original file', function() {
		var hashInfo = hasher.hashFiles(testFiles[0], {replace: true});

		expect(fs.lstatSync(hashInfo.path).isFile()).to.be.ok;
		expect(fs.lstatSync.bind(fs.lstatSync, hashInfo.original)).to.throw(Error, "ENOENT, no such file or directory");
	})

	it('Should hash single file twice, keep the original and remove the first hashed file', function() {
		var hash1Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(fs.lstatSync(hash1Info.path).isFile()).to.be.ok;

		// Update original file contents to second hash will be different
		fs.appendFileSync(testFiles[0], 'appending more test content');

		var hash2Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(hash1Info.original).to.equal(hash2Info.original);
		expect(fs.lstatSync(hash1Info.original).isFile()).to.be.ok;
		expect(fs.lstatSync(hash2Info.path).isFile()).to.be.ok;
		expect(fs.lstatSync.bind(fs.lstatSync, hash1Info.path)).to.throw(Error, "ENOENT, no such file or directory");
	})

	it('Should have same hash for single unchanged file which is hashed multiple times', function() {
		var hash1Info = hasher.hashFiles(testFiles[0], {replace: false});
		var hash2Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(hash1Info.path).to.equal(hash2Info.path);
	})

	it('Should return an array if multiple files are hashed', function() {
		expect(hasher.hashFiles(testFiles)).to.be.a('array');
	})

	it('Should hash multiple individual files', function() {
		var hashInfo = hasher.hashFiles(testFiles);

		testFiles.forEach(function(file, index) {
			expect(hashInfo[index].original).to.equal(file);
			expect(fs.lstatSync(hashInfo[index].path).isFile()).to.be.ok;
		});
	})

	it('Should hash files specified by single glob entry', function() {
		var testGlob = path.join(tmpDir, 'css/*');
		var files = glob.sync(testGlob);
		var hashInfo = hasher.hashFiles(testGlob);

		expect(files.length).to.equal(hashInfo.length);

		hashInfo.forEach(function(fileInfo) {
			expect(fileInfo.hashed).to.be.true;
			expect(fs.lstatSync(fileInfo.path).isFile()).to.be.ok;
		});
	})

	it('Should hash files specified by multiple glob entries', function() {
		var test1Glob = path.join(tmpDir, 'css/*');
		var test2Glob = path.join(tmpDir, 'js/*');
		var files1 = glob.sync(test1Glob);
		var files2 = glob.sync(test2Glob);
		var hashInfo = hasher.hashFiles([test1Glob, test2Glob]);

		expect(files1.concat(files2).length).to.equal(hashInfo.length);

		hashInfo.forEach(function(fileInfo) {
			expect(fileInfo.hashed).to.be.true;
			expect(fs.lstatSync(fileInfo.path).isFile()).to.be.ok;
		});
	})

	it('Should hash files in a directory', function() {
		var files = glob.sync(path.join(jsDir, '**/*.js'));
		var hashInfo = hasher.hashFiles(jsDir);

		expect(hashInfo).to.be.a('array').and.have.length(files.length);
	})

	it('Should hash vinyl file', function() {
		var file = vinyl.readSync(testFiles[0]);
		var hashInfo = hasher.hashFiles(file);

		expect(hashInfo.hashed).to.be.true;
		expect(fs.lstatSync(hashInfo.path).isFile()).to.be.ok;
	})

	it('Should hash array of vinyl files', function() {
		var files = [vinyl.readSync(testFiles[0]), vinyl.readSync(testFiles[1])];
		var hashInfo = hasher.hashFiles(files);

		expect(hashInfo.length).to.equal(files.length);

		hashInfo.forEach(function(fileInfo) {
			expect(fileInfo.hashed).to.be.true;
			expect(fs.lstatSync(fileInfo.path).isFile()).to.be.ok;
		});
	})

});


describe('Test asset library and manifest', function() {

	beforeEach(function() {
		addTestFiles(testFiles);
	})

	afterEach(function() {
		removeTestDir(tmpDir);
	})

	it('Should return an empty object when asset library is reset', function() {
		var assets = hasher.resetAssets();

		expect(assets).to.be.an('object');
		expect(_.size(assets)).to.equal(0);
	})

	it('Should return an object for asset library', function() {
		hasher.hashFiles(testFiles);

		var info = hasher.getAsset(testFiles[0]);

		expect(info).to.be.an('object');
		expect(info.original).to.equal(testFiles[0]);
	})

	it('Should return null if asset library entery does not exist', function() {
		hasher.hashFiles(testFiles);

		expect(hasher.getAsset('this-is-a-bogus-entry-asdgir82')).to.be.null;
	})

	it('Should update asset library entry', function() {
		hasher.hashFiles(testFiles);

		var data = hasher.getAsset(testFiles[0]);
		var prefixed = 'testupdate_' + data.path;

		hasher.updateAsset(testFiles[0], {path: prefixed});

		var updatedData = hasher.getAsset(testFiles[0]);

		expect(updatedData.path).to.equal(prefixed);
	})

	it('Should return object for assets library', function() {
		expect(hasher.getAssets()).to.be.a('object');
	})

	it('Should have same number of entries as total number of files hashed', function() {
		expect(_.keys(hasher.getAssets()).length).to.equal(testFiles.length);
	})

	it('Should load test manifest file');

	it('Should add new hashed image to test manifest file');

	it('Should save asset manifest file', function() {
		var manifestFile = hasher.get('manifest');

		hasher.saveManifest();

		expect(fs.lstatSync(manifestFile).isFile()).to.be.ok;

		removeTestFiles(manifestFile);
	})

	it('Should merge new and existing manifest files');

	it('Should overwrite existing manifest with new manifest files');

	it('Should get hashed file for original file', function() {
		hasher.hashFiles(testFiles[1]);

		var file = hasher.getAssetFile(testFiles[1]);

		expect(file).to.be.a('string').with.length.greaterThan(0);
		expect(file).to.not.equal(testFiles[1]);
	})

	it('Should save asset manifest file with custom name provided in saveManifest options', function() {
		var oldManifestFile = hasher.get('manifest');
		var manifestFile = 'test_manifest.json';

		hasher.saveManifest({manifest: manifestFile});

		expect(manifestFile).to.not.equal(oldManifestFile);
		expect(fs.lstatSync(manifestFile).isFile()).to.be.ok;

		removeTestFiles(manifestFile);
	})

	it('Should not save a manifest file if manifest config is false or null', function() {
		var manifestFile = path.join(hasher.get('path'), hasher.get('manifest'));

		hasher.set({manifest: false});
		hasher.hashFiles(testFiles[0]);
		hasher.saveManifest();

		expect(hasher.getAssets()).to.be.an('object');
		expect(fs.lstatSync.bind(fs.lstatSync, manifestFile)).to.throw(Error, "ENOENT, no such file or directory");
	})

});