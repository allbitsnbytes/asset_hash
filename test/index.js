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


// Test variables

var tmpDir		= './tmp/';
var testFiles	= [
	path.join(tmpDir, 'img/bg.jpg'),
	path.join(tmpDir, 'img/favicon.png'),
	path.join(tmpDir, 'img/logo.png'),
	path.join(tmpDir, 'css/landing.css'),
	path.join(tmpDir, 'css/promos.css'),
	path.join(tmpDir, 'css/styles.css'),
	path.join(tmpDir, 'js/main.js'),
	path.join(tmpDir, 'js/shoestring.min.js')
];


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

	var methods = ['get', 'set', 'hashFiles', 'getAsset', 'getAssets', 'resetAssets', 'saveManifest', 'updateAsset'];

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
		var defaults = ['base', 'hasher', 'length', 'manifest', 'path', 'replace', 'save', 'template'];
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

	it('Should have a valid hasher', function() {
		var hashers = crypto.getHashes();
		var	myHasher = hasher.get('hasher');

		expect(myHasher).to.be.a('string');
		expect(hashers).to.be.an('array').and.contains(myHasher);
	})

	it('Should have a base', function() {
		expect(hasher.get('base')).to.be.a('string').and.not.be.empty;
	})

	it('Should have a valid length', function() {
		expect(hasher.get('length')).to.be.a('number').and.be.at.least(10);
	})

	it('Should have a manifest file', function() {
		expect(hasher.get('manifest')).to.match(/[a-zA-Z0-9_/\-]+\.json/)
	})

	it('Should have a path', function() {
		expect(hasher.get('path')).to.be.a('string').and.not.be.empty;
	})

	it('Should have a boolean save value', function() {
		expect(hasher.get('save')).to.be.a('boolean');
	})

	it('Should have a hashed filename template', function() {
		expect(hasher.get('template')).to.not.be.empty;
	})

	it('Should have a replace option', function() {
		expect(hasher.get('replace')).to.be.a('boolean');
	})

	it('Should have a valid template format', function() {
		hasher.set({template: '<%= name %>_<%= hash %>.<%= ext %>'});

		addTestFiles(testFiles[0]);
		
		var hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo.oldFile).to.equal(hashInfo.newFile.replace('_' + hashInfo.hash, ''));

		removeTestDir(tmpDir);
	})
});


describe('Test hashing functionality', function() {

	beforeEach(function() {
		addTestFiles(testFiles);
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
		expect(hashInfo.newFile).to.be.a('string');
		expect(hashInfo.oldFile).to.be.a('string');
		expect(hashInfo.hash).to.be.a('string');
		expect(hashInfo.type).to.be.a('string');
	})

	it('Should hash single file', function() {
		var	hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo.hashed).to.be.true;
		expect(hashInfo.oldFile).to.equal(testFiles[0]);
		expect(hashInfo.newFile).to.have.length.greaterThan(hashInfo.oldFile.length);
		expect(fs.lstatSync(hashInfo.newFile).isFile()).to.be.ok;
	})

	it('Should hash single file and keep original file', function() {
		var hashInfo = hasher.hashFiles(testFiles[0], {replace: false});

		expect(fs.lstatSync(hashInfo.newFile).isFile()).to.be.ok;
		expect(fs.lstatSync(hashInfo.oldFile).isFile()).to.be.ok;
	})

	it('Should hash single file and replace original file', function() {
		var hashInfo = hasher.hashFiles(testFiles[0], {replace: true});

		expect(fs.lstatSync(hashInfo.newFile).isFile()).to.be.ok;
		expect(fs.lstatSync.bind(fs.lstatSync, hashInfo.oldFile)).to.throw(Error, "ENOENT, no such file or directory");
	})

	it('Should hash single file twice, keep the original and remove the first hashed file', function() {
		var hash1Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(fs.lstatSync(hash1Info.newFile).isFile()).to.be.ok;

		// Update original file contents to second hash will be different
		fs.appendFileSync(testFiles[0], 'appending more test content');

		var hash2Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(hash1Info.oldFile).to.equal(hash2Info.oldFile);
		expect(fs.lstatSync(hash1Info.oldFile).isFile()).to.be.ok;
		expect(fs.lstatSync(hash2Info.newFile).isFile()).to.be.ok;
		expect(fs.lstatSync.bind(fs.lstatSync, hash1Info.newFile)).to.throw(Error, "ENOENT, no such file or directory");
	})

	it('Should have same hash for single unchanged file which is hashed multiple times', function() {
		var hash1Info = hasher.hashFiles(testFiles[0], {replace: false});
		var hash2Info = hasher.hashFiles(testFiles[0], {replace: false});

		expect(hash1Info.newFile).to.equal(hash2Info.newFile);
	})

	it('Should return an array if multiple files are hashed', function() {
		expect(hasher.hashFiles(testFiles)).to.be.a('array');
	})

	it('Should hash multiple individual files', function() {
		var hashInfo = hasher.hashFiles(testFiles);

		testFiles.forEach(function(file, index) {
			expect(hashInfo[index].oldFile).to.equal(file);
			expect(fs.lstatSync(hashInfo[index].newFile).isFile()).to.be.ok;
		});
	})

	it('Should hash files specified by single glob entry', function() {
		var testGlob = path.join(tmpDir, 'css/*');
		var files = glob.sync(testGlob);
		var hashInfo = hasher.hashFiles(testGlob);

		expect(files.length).to.equal(hashInfo.length);

		hashInfo.forEach(function(fileInfo) {
			expect(fileInfo.hashed).to.be.true;
			expect(fs.lstatSync(fileInfo.newFile).isFile()).to.be.ok;
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
			expect(fs.lstatSync(fileInfo.newFile).isFile()).to.be.ok;
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
		expect(info.oldFile).to.equal(testFiles[0]);
	})

	it('Should return null if asset library entery does not exist', function() {
		hasher.hashFiles(testFiles);

		expect(hasher.getAsset('this-is-a-bogus-entry-asdgir82')).to.be.null;
	})

	it('Should update asset library entry', function() {
		hasher.hashFiles(testFiles);

		var data = hasher.getAsset(testFiles[0]);
		var prefixed = 'testupdate_' + data.newFile;

		hasher.updateAsset(testFiles[0], {newFile: prefixed});

		var updatedData = hasher.getAsset(testFiles[0]);

		expect(updatedData.newFile).to.equal(prefixed);
	})

	it('Should return object for assets library', function() {
		expect(hasher.getAssets()).to.be.a('object');
	})

	it('Should have same number of entries as total number of files hashed', function() {
		expect(_.keys(hasher.getAssets()).length).to.equal(testFiles.length);
	})

	it('Should save asset manifest file', function() {
		var manifestFile = hasher.get('manifest');

		hasher.saveManifest();

		expect(fs.lstatSync(manifestFile).isFile()).to.be.ok;

		removeTestFiles(manifestFile);
	})

	it('Should save asset manifest file with custom name provided in saveManifest options', function() {
		var oldManifestFile = hasher.get('manifest');
		var manifestFile = 'test_manifest.json';

		hasher.saveManifest({manifest: manifestFile});

		expect(manifestFile).to.not.equal(oldManifestFile);
		expect(fs.lstatSync(manifestFile).isFile()).to.be.ok;

		removeTestFiles(manifestFile);
	})

});