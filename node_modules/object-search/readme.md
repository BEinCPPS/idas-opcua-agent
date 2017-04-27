
# object-search

A node.js module for looking up deep paths inside of an object

## install

```bash
$ npm install [--save] object-search
```

## usage

```javascript
var objectSearch = require('object-search');

var obj = {
    abc: [
        {def: 'foo', ghi: 'baz'}
    ]
};

// Get a property
objectSearch.get(obj, 'abc.0.def');  // 'foo'

// Set a property
objectSearch.set(obj, 'abc.1', {def: 'bar'});

// Delete a property
objectSearch.del(obj, 'abc.0.ghi');

// Lookup a property for multiple/more complex operations
objectSearch.find(obj, 'abc.0');
//
// Returns an object:
//  {
//    "get": function() { },
//    "set": function(value) { },
//    "del": function() { },
//    "object": obj,
//    "key": "abc.0",
//    "keys": ["abc", "0"],
//    "lastKey": "0",
//    "scope": obj.abc
//  }
//
```


