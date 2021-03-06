function disabledTest () {
	// no-op, for tests that are disabled for now
}

function assertTriggered(action, code) {
	var fired = false;
	code(function(context) {
		fired = true;
		action(context);
	});

	ok(fired, "Expected " + action.name + " to have fired");
}

function assertHasProperty(o, p) {
	ok(o.hasOwnProperty(p),  "Expected object to have property " + p);
}


QUnit.module("Folder");

test("results in a Symbol", 1, function (assert) {
	var root = new Folder();
	notEqual(root.lookup('a').value, undefined);
});

QUnit.module("Symbol");

test("A symbol just assigned to is marked up to date", function () {
	var root = new Folder();
	var A = root.lookup('A');

	A.assign(10, root.scope);
	equal(A.cache.up_to_date, true);
});

test("Assigning to a symbol sets the value", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	A.assign(10, root.scope);
	equal(A.value(), 10);
});

test("Querying the value of a symbol which relies on a definition should mark it up to date", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	var B = root.lookup('B');

	A.assign(10, root.scope);
	B.define(function() { return A.value(); }).subscribe('A');
	B.value();

	equal(B.cache.up_to_date, true);
});

test("Defining an observable in terms of a constant causes it's value to be the constant", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');

	A.define(function() { return 9001; });
	equal(A.value(), 9001);
});

test("should raise if a circular dependency introduced", 1, function (assert) {
	var root = new Folder();
	var A = root.lookup('A'),
		B = root.lookup('B');

	A.subscribe('B');
	raises(function () {
		B.subscribe('A');
	});
});

test("should raise if indirect circular dependency introduced", 1, function (assert) {
	var root = new Folder();
	var A = root.lookup('A'),
		B = root.lookup('B'),
		C = root.lookup('C');
		
		B.subscribe('C');
		C.subscribe('A');

	raises(function () {
		A.subscribe('B');
	});
});

test("Subscribing to symbol B adds a subscription in B", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	var B = root.lookup('B');
	A.subscribe(['B']);
	assertHasProperty(B.subscribers, A.name);
});

test("Observing symbol B adds an observer in B", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	var B = root.lookup('B');

	A.observe('B');
	assertHasProperty(B.observers, A.name);
});

test("Assigning to a symbol removes subscriptions from symbols subscribed to", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	var B = root.lookup('B');
	A.subscribe('B');
	A.assign(2, root.scope);

	equal(B.subscribers[A.name], undefined);
});

test("Defining a symbol removes subscriptions from symbols previously subscribed to", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');
	var B = root.lookup('B');
	A.subscribe('B');
	A.define(function() { return 2; });

	equal(B.subscribers[A.name], undefined);
});

test("Assigning to an observed symbol causes the triggered action to fire", function (assert) {
	var action = function() {};

	assertTriggered(action, function(action) {
		var root = new Folder();

		var watchB = root.lookup('watchB');
		var B = root.lookup('B');

		watchB.assign(action, root.scope);
		watchB.observe('B');

		B.assign(10, root.scope);
	});
});

test("An observed symbol updated via dependency causes its observer to fire", function (assert) {
	var action = function() {};

	assertTriggered(action, function(action) {
		var root = new Folder();

		var watchB = root.lookup('watchB');
		var A = root.lookup('A');
		var B = root.lookup('B');

		B.define(function() { A.value() + 1; }).subscribe('A');

		watchB.assign(action, root.scope);
		watchB.observe('B');

		A.assign(10, root.scope);
	});
});

test("Defining an observable in terms of a constant causes it's value to be the constant", function (assert) {
	var root = new Folder();
	var A = root.lookup('A');

	A.define(function() { return 9001; });
	equal(A.value(), 9001);
});
