Small library to hash asset filenames.  An asset manifest can also be created with a reference to all hashed files.

**Example of hashed filename**

logo.png  -->  logo-a8gs915av908081235nxt.png
main.js   -->  main-t89b8b82m34f9avja02mv.js

**Generated asset manifest**

{
	'images/logo.png':  'logo-a8gs915av908081235nxt.png',
	'js/main.js': 'main-t89b8b82m34f9avja02mv.js'
}
