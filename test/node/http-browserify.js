// These tests are taken from http-browserify to ensure compatibility with
// that module
var test = require('node:test')
var assert = require('node:assert')
var url = require('url')

var location = 'http://localhost:8081/foo/123'

var noop = function() {}
global.location = url.parse(location)
global.XMLHttpRequest = function() {
	this.open = noop
	this.send = noop
	this.abort = noop
	this.setRequestHeader = noop
	this.withCredentials = false
}
// These tests simulate an XHR-based browser and mock only XMLHttpRequest.
// Modern Node exposes a global `fetch`, which stream-http would otherwise
// prefer; clear it so the XHR code path (the one these mocks cover) is used.
global.fetch = undefined

var moduleName = require.resolve('../../')
delete require.cache[moduleName]
var http = require('../../')

test('Make sure http object has correct properties', function () {
	assert.ok(http.Agent, 'Agent defined')
	assert.ok(http.ClientRequest, 'ClientRequest defined')
	assert.ok(http.ClientRequest.prototype, 'ClientRequest.prototype defined')
	assert.ok(http.IncomingMessage, 'IncomingMessage defined')
	assert.ok(http.IncomingMessage.prototype, 'IncomingMessage.prototype defined')
	assert.ok(http.METHODS, 'METHODS defined')
	assert.ok(http.STATUS_CODES, 'STATUS_CODES defined')
	assert.ok(http.get, 'get defined')
	assert.ok(http.globalAgent, 'globalAgent defined')
	assert.ok(http.request, 'request defined')
})

test('Test simple url string', function() {
	var testUrl = { path: '/api/foo' }
	var request = http.get(testUrl, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'http://localhost:8081/api/foo', 'Url should be correct')
})

test('Test full url object', function() {
	var testUrl = {
		host: "localhost:8081",
		hostname: "localhost",
		href: "http://localhost:8081/api/foo?bar=baz",
		method: "GET",
		path: "/api/foo?bar=baz",
		pathname: "/api/foo",
		port: "8081",
		protocol: "http:",
		query: "bar=baz",
		search: "?bar=baz",
		slashes: true
	}

	var request = http.get(testUrl, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'http://localhost:8081/api/foo?bar=baz', 'Url should be correct')
})

test('Test alt protocol', function() {
	var params = {
		protocol: "foo:",
		hostname: "localhost",
		port: "3000",
		path: "/bar"
	}

	var request = http.get(params, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'foo://localhost:3000/bar', 'Url should be correct')
})

test('Test page with \'file:\' protocol', function () {
	var params = {
		hostname: 'localhost',
		port: 3000,
		path: '/bar'
	}

	var fileLocation = 'file:///home/me/stuff/index.html'

	var normalLocation = global.location
	global.location = url.parse(fileLocation) // Temporarily change the location
	var request = http.get(params, noop)
	global.location = normalLocation // Reset the location

	var resolved = url.resolve(fileLocation, request._opts.url)
	assert.strictEqual(resolved, 'http://localhost:3000/bar', 'Url should be correct')
})

test('Test string as parameters', function() {
	var testUrl = '/api/foo'
	var request = http.get(testUrl, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'http://localhost:8081/api/foo', 'Url should be correct')
})

test('Test withCredentials param', async function() {
	var reqUrl = '/api/foo'

	// The XHR is created in _onFinish, which runs on the async 'finish' event,
	// so wait for it before inspecting request._xhr.
	function withCredentialsOf(opts) {
		return new Promise(function (resolve) {
			var request = http.get(opts, noop)
			request.on('finish', function () {
				resolve(request._xhr.withCredentials)
			})
		})
	}

	assert.strictEqual(await withCredentialsOf({ url: reqUrl, withCredentials: false }), false,
		'xhr.withCredentials should be false')
	assert.strictEqual(await withCredentialsOf({ url: reqUrl, withCredentials: true }), true,
		'xhr.withCredentials should be true')
	assert.strictEqual(await withCredentialsOf({ url: reqUrl }), false,
		'xhr.withCredentials should be false')
})

test('Test ipv6 address', function() {
	var testUrl = 'http://[::1]:80/foo'
	var request = http.get(testUrl, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'http://[::1]:80/foo', 'Url should be correct')
})

test('Test relative path in url', function() {
	var params = { path: './bar' }
	var request = http.get(params, noop)

	var resolved = url.resolve(location, request._opts.url)
	assert.strictEqual(resolved, 'http://localhost:8081/foo/bar', 'Url should be correct')
})

test('Cleanup', function () {
	// Leave global.location / global.XMLHttpRequest in place: the request-building
	// tests above call http.get(), whose _onFinish runs asynchronously (on the
	// stream's 'finish' tick) and may construct an XMLHttpRequest after the test
	// that scheduled it has already returned. Removing the globals here would make
	// that late construction throw. The process exits right after, so no reset is
	// needed.
	delete require.cache[moduleName]
})
