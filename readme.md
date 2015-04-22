# Asset Hash

Small library to hash filenames for static assets.  The hash is computed from the file contents so the hash only changes when the file actually changes.  A manifest file is generated which maps the original file path to the hashed file path. (example:  style.css => style-g7ba80c.css)



## Install

[![NPM](https://nodei.co/npm/asset_hash.png?mini=true)](https://nodei.co/npm/asset_hash/)


## Methods

### .set(options)

Update asset hasher configuration options.

```
var hash = require('asset_hash');

hash.set({hasher: 'sha1', length: 12});
```


### .get(key)

Get value for a configuration option using key.

```
var hash = require('asset_hash');

// Get length
var length = hash.get('length');

// Get object of all options
var allOptions = hash.get();
```


### .hashFiles(files, options)

Generate hash for specified glob, file path or file object.  Also supports an array of globs, file paths or file objects.  A configuration object can also be passed with settings to use for this hashing call instead of the default configuration options.

```
var hash = require('asset_hash');

hash.hashFiles('img/*', {length: 15});
hash.hashFiles('css/style.css');
```


### .getAsset(path)

Retrieve an entry from the asset library.  The asset library is an object containing reference to all files that have been hashed and mirrors the manifest file.

```
var hash = require('asset_hash');
var asset = hash.getAsset('assets/css/style.css');
```


### .getAssets()

Get asset library object.  This is a mirror of the asset manifest file.

```
var hash = require('asset_hash');
var assets = hash.getAssets();
```


### .getAssetFile()

Get path to an asset.  If asset was hashed, path to hashed file will be returned.  Otherwise, path to original file will be returned.

```
var hash = require('asset_hash');
var file = hash.getAssetFile(original_file);
```


### .updateAsset(path, data)

Update values in asset library for a specified file.

```
var hash = require('asset_hash');

hash.updateAsset('asset/css/style.css', {type: 'css'});
```


### .resetAssets()

Reset asset library.  Manifest file won't be reset/updated until .saveManifest() is called.

```
var hash = require('asset_hash');

hash.resetAssets();
```


### .saveManifest(options)

Save manifest file. Options can be passed to specify where to save the manifest file and what name to use.

```
var hash = require('asset_hash');
var files = ['asset/img/*'];

hash.hashFiles(files);
hash.saveManifest();
```


### .getHashers()

Get list of supported hash algorithms.  Supports node's crypto library algorithms [more info](https://nodejs.org/api/crypto.html#crypto_crypto)

```
var hash = require('asset_hash');
var hashers = hash.getHashers();
```



## Options

These are the configuration options that can be set for the asset hasher.  Use .set() and .get() methods to change and retrieve these options.


### base

The base directory for where to save assets.  Path for assets in the manifest file will be relative to this location.  

Type: String  
Default: ` . `


### hasher

The hash algorithm to used when generating content hash.

Type: String  
Default: ` sha1 `


### length

Length of the generated hash.  This is the maximum length the hash can be.  

Type: Integer  
Default: ` 10 `


### manifest

The name to use for the manifest file.  If this value is empty string or false manifest file won't be saved.  

Type: String  
Default: ` assets.json `


### path

The path where to save the manifest file.  

Type: String  
Default: ` . `


### replace

Set to true to replace the original file when hashed file is generated.  If set to false original file will be kept.  

Type: Boolean  
Default: ` false `


### save

When a file is hashed, the hashed version of the file is automatically written to the file system.  For stream build systems like gulp this behavior is not desired.  In that case set this to false.  

Type: Boolean  
Default: ` true `


### template

The template to use for the hashed file format.  

Type: String  
Default: ` <%= name %>-<%= hash %>.<%= ext %> `

```
var hash = require('asset_hash');
var file = 'logo.png';

// logo.png  =>  logo-a91bc920e.png
hash.hashFile(file);

// logo.png  =>  logo__a91bc920e.png
hash.set({template: '<%= name %>__<%= hash %>.<%= ext %>'});
hash.hashFile(file);
```
