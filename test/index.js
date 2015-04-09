/**
 * Tests for hasher module
 */

var _			= require('lodash');
var	assert		= require('assert');
var	crypto		= require('crypto');
var	expect		= require('chai').expect;
var fs			= require('fs');
var	hasher		= require('../');


// Utility Functions

/**
 * Test directory
 * @type {string}
 */
var tmpDir		= './tmp/';
var testFiles	= [
	tmpDir + 'logo.png',
	tmpDir + 'styles.css',
	tmpDir + 'main.js'
];

/**
 * Setup test environment
 */
function createTestDir(path) {
	fs.mkdirSync(path);
}

/**
 * Clean up  test environment
 */
function removeTestDir(path) {
	var files = [];

	if(fs.lstatSync(path).isDirectory()) {
		files = fs.readdirSync(path);

		files.forEach(function(file, index) {
			var curPath = path + "/" + file;

			if(fs.lstatSync(curPath).isDirectory()) { 
				removeTestDir(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});

		fs.rmdirSync(path);
    }
}

/**
 * Add test files
 * @param {Array} files Test files to create
 */
function addTestFiles(files) {
	if (!_.isArray(files)) {
		files = [files];
	}

	files.forEach(function(file, index) {
		fs.writeFileSync(file, 'test file '+index);
	});
}

/**
 * Remove test files
 * @param  {Array} files The files to remove
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
	it('Should create a "tmp" directory', function() {
		try {
			createTestDir(tmpDir);

			expect(fs.lstatSync(tmpDir).isDirectory()).to.be.ok;
		}
		catch(e) {
			expect(createTestDir.bind(createTestDir, tmpDir)).to.throw(Error, "EEXIST, file already exists");
		}
	})

	it('Should add test file', function() {
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

	it('Should remove "tmp" directory', function() {
		try {
			removeTestDir(tmpDir);
		}
		catch(e) {
			expect(removeTestDir.bind(removeTestDir, tmpDir)).to.throw(Error, "ENOENT, no such file or directory");
		}
	})

});


describe('Test methods exist', function() {

	it('Should have a set method', function() {
		expect(hasher.set).to.be.a('function');
	})

	it('Should have a get method', function() {
		expect(hasher.get).to.be.a('function');
	})

	it('Should have a hash method', function() {
		expect(hasher.hashFiles).to.be.a('function');
	})

	it('Should have a saveManifest method', function() {
		expect(hasher.saveManifest).to.be.a('function');
	})

});


describe('Test config functionality', function() {

	it('Should get all config', function() {
		var config = hasher.get();

		expect(config).to.be.a('object');
	})

	it('Should have default config values', function() {
		var defaults = ['hasher', 'length', 'manifest', 'replace', 'template'];
		var	config = hasher.get();

		expect(config).to.have.all.keys(defaults);
		expect(_.keys(config)).to.have.length(defaults.length);
	})

	it('Should get config value', function() {
		var length = hasher.get('length');

		expect(length).to.not.be.empty;
	})

	it('Should return empty string for config keys that are not present', function() {
		var bogusValue = hasher.get('bogus_key_name');

		expect(bogusValue).to.be.a('string').and.be.empty;
	})

	it('Should set config', function() {
		hasher.set({'key1abc': 'val1abc'});

		expect(hasher.get('key1abc')).to.be.equal('val1abc');
	})

	it('Should set config value without deleting previous entries', function() {
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

	it('Should have a valid length', function() {
		var length = hasher.get('length');

		expect(length).to.be.a('number').and.be.at.least(10);
	})

	it('Should have a manifest file', function() {
		var manifest = hasher.get('manifest');

		expect(manifest).to.match(/[a-zA-Z0-9_/\-]+\.json/)
	})

	it('Should have a hashed filename template', function() {
		var template = hasher.get('template');

		expect(template).to.not.be.empty;
	})

	it('Should have a replace option', function() {
		var replace = hasher.get('replace');

		expect(replace).to.be.false;
	})

});


describe('Test hashing functionality', function() {

	beforeEach(function() {
		createTestDir(tmpDir);
		addTestFiles(testFiles);
	})

	afterEach(function() {
		removeTestDir(tmpDir);
	})

	it('Should hash single file', function() {
		var	hashInfo = hasher.hashFiles(testFiles[0]);

		expect(hashInfo).to.be.an('object');
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


	// it('Should hash an array of files', function() {
	// 	var	hashedFiles = hasher.hashFiles(testFiles);

	// 	expect(hashedFiles).to.not.be.empty;
	// 	expect(hashedFiles).to.be.an('array').and.have.lengthOf(testFiles.length);

	// 	testFiles.forEach(function(file, index) {
	// 		expect(file).to.be.a('string').with.length.lt(hashedFiles[index].length);
	// 	})
	// })

	// it('Should match default hash filename template', function() {
	// 	expect(hasher.hashFiles('./test_style.css')).to.match(/^[a-zA-Z0-9]+-[a-zA-Z0-9]+\.[a-zA-Z0-9]+/);
	// })
	
	// it('Should match custom hash filename template', function() {
	// 	hasher.set({template: '_<%= name %>_<%= hash %><%= ext %>'});

	// 	expect(hasher.hashFiles('style.css')).to.match(/^_[a-zA-Z0-9]+_[a-zA-Z0-9]+\.[a-zA-Z0-9]+/);
	// })
	
});
