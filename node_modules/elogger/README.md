elogger
=======

Exclusive logging for nodejs, expressjs, sailsjs and many other nodejs based applications.


<h4>Introduction</h4>
elogger is an exclusive logging middleware framework for different kind of nodejs application, which can be used either as an middleware or simple module. It reuses power & flexibility of morgan (https://www.npmjs.com/package/morgan) for HTTP logging. Find different examples below.

<h4>Installation:</h4>
```
$ npm install elogger
```

<h4>Examples:</h4>

<h6>As Middleware with ExpressJS:</h6>
```
var loggingtype = 'combined';
var express = require('express'),
    elogger = require('elogger');

app.use(elogger(loggingtype));
```
<p>Supported logging types: 'combined', 'common', 'tiny'</p>

<h6>For NodeJS command-line applications:</h6>
```
var logger = require('elogger');

logger.debug('My First Debug Test');
logger.info('My Second Info Test');
logger.warn('My Third Warn Test');
logger.error('My Fourth Error Test');
logger.trace('My Fifth Info Test');
```

