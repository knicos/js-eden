var root;
var eden;

function edenModule(description) {
	QUnit.module("foo", {
		setup: function () {
			root = new Folder();
			eden = new Eden(root);
			eden.execute("trace = []; func t { append trace, $1; return $2; }");
		}
	});
}

//
// language switching
//
edenModule("Language switching");

test("No language token", function () {
	eden.execute("x = 2;");
	equal(root.lookup('x').value(), 2);
});

// monk: toggling these tests off as they are currently broken

//test("%eden", function () {
//	eden.execute("%eden\nx = 2;");
//	equal(root.lookup('x').value(), 2);
//	eden.execute("%eden\nx = 3;%eden");
//	equal(root.lookup('x').value(), 3);
//	eden.execute("x = 4;%eden");
//	equal(root.lookup('x').value(), 4);
//	eden.execute("%eden\nx = 1;%js\nroot.lookup('x').assign(root.lookup('x').value() + 1);");
//	equal(root.lookup('x').value(), 2);
//});

//
// observables
//
edenModule("Observables");

test("Underscores in observable names works", function () {
	eden.execute('x_1 = 20;');
	equal(root.lookup('x_1').value(), 20);
});

test("Assignment sets the correct value", function () {
	eden.execute("x = 2;");
	equal(root.lookup('x').value(), 2);
});

//
// modulus
//
edenModule("Modulus");

test("Modulus operator without whitespace doesn't get confused by language switching", function () {
	eden.execute("a = 1; b = 1; x = a%b;");
	equal(root.lookup('a').value(), 1);
});

//
// ternary
//
edenModule("Ternary");

test("Ternary precedence", function () {
	eden.execute("x = 1 ? 1 : 2 + 1;");
	equal(root.lookup('x').value(), 1);
});

//
// char
//
edenModule("Char type");

test("Single quoting a character works", function () {
	eden.execute("x = 'a';");
	equal(root.lookup('x').value(), "a");
});

test("Empty quotes won't parse", function () {
	try {
		eden.translateToJavaScript("'';");
	} catch (e) {
		ok(true);
	}
});

test("Single quoting an escaped quote character works", function () {
	eden.execute("x = '\\\'';");
	equal(root.lookup('x').value(), "'");
});

//
// string
//
edenModule("String type");

test("Nested strings work", function () {
	eden.execute('x = "\\\"";');
	equal(root.lookup('x').value(), '"');
});

test("Multiline strings work", function () {
	eden.execute('x = "\n\nfoo\n\n";');
	equal(root.lookup('x').value(), '\n\nfoo\n\n');
});

//
// numbers
//
edenModule("Number type");

test("Increment results in a value 1 greater", function () {
	eden.execute("x = 2; x++;");
	equal(root.lookup('x').value(), 3);
});

test("+= op works", function () {
	eden.execute("x = 2; x += 2;");
	equal(root.lookup('x').value(), 4);
});

test("number comparison", function () {
	eden.execute("b = 1 == 1;");
	equal(root.lookup('b').value(), true);
	eden.execute("b = 1 == 2;");
	equal(root.lookup('b').value(), false);
});

//
// control flow
//
edenModule("Control flow");

test("Do while loop", function () {
	eden.execute("x = 0; do { x++; } while (x < 5);");
	equal(root.lookup('x').value(), 5);
});

test("For loop", function () {
	eden.execute("x = 0; for (i = 0; i < 10; ++i) { x++; }");
	equal(root.lookup('i').value(), 10);
	equal(root.lookup('x').value(), 10);
});

//
// functions and procs
//
edenModule("Functions and procs");

test("Function definition stores a function in the symbol table", function () {
	eden.execute("func f {}");
	equal(typeof root.lookup('f').value(), "function");
});

test("Procedure definition stores a function in the symbol table", function () {
	eden.execute("proc p {}");
	equal(typeof root.lookup('p').value(), "function");
});

test("Function calls work", function () {
	eden.execute("func f { x = 2; } f();");
	equal(root.lookup('x').value(), 2);
});

test("Return statement from a function works", function () {
	eden.execute("func power { return 9000; }");
	equal(root.lookup('power').value()(), 9000);
});

test("Function parameters work", function () {
	eden.execute("func id { return $1; }");
	equal(root.lookup('id').value()(9001), 9001);
});

test("Parameter aliases work", function () {
	eden.execute("func id { para x; return x; }");
	equal(root.lookup('id').value()(9001), 9001);
});

test("Multiple function definitions with locals works", function () {
	eden.execute('func f { auto x; x; } func g { auto y; y; }');
	ok(true);
});

test("Autos work in a function definition", function () {
	eden.execute('func f { auto x; x = 3; return x; }');
	equal(root.lookup('f').value()(), 3);
});

test("Multiple sets of autos work", function () {
	eden.execute('func f { auto x; auto y; x = 1; y = 2; return y; }');
	equal(root.lookup('f').value()(), 2);
});

test("Autos work in a procedure definition", function () {
	eden.execute('proc p { auto x; x = 4; return x; }');
	equal(root.lookup('p').value()(), 4);
});

test("Autos protect the outside scope", function () {
	eden.execute('x = 2; func f { auto x; x = 10; } f();');
	equal(root.lookup('x').value(), 2);
});

//
// triggered actions
//
edenModule("Triggered actions");

test("Scoping for triggered actions", function () {
	// the parser used to get confused about triggered actions, causing scoping problems
	eden.execute("x = 1; proc p : z {} func f { para x; } y is x;");
	equal(root.lookup('y').value(), 1);
});

test("Triggered action definition stores a function in the symbol table", function () {
	eden.execute("proc p : x {}");
	equal(typeof root.lookup('p').value(), "function");
});

test("Triggered action definition observes a requested symbol", function () {
	eden.execute("proc p : x {}");
	notEqual(root.lookup('p').observees['/x'], undefined);
});

test("Triggered actions immediately fire if all their observees have been defined", function () {
	eden.execute("x = @; proc p : x { y = 1; }");
	equal(root.lookup('y').value(), 1);
});

test("Triggered actions don't fire until all their observees have been defined", function () {
	eden.execute("proc p : x, y { z = 1; }");
	equal(root.lookup('z').value(), undefined);
	eden.execute("x = @;");
	equal(root.lookup('z').value(), undefined);
	eden.execute("y = @;");
	equal(root.lookup('z').value(), 1);
});

//
// formula vars
//
edenModule("Formula vars");

test("The value after formula definition is correct", function () {
	eden.execute("x = 3; a is x;");
	equal(root.lookup('a').value(), 3);
});

test("A formula var is undefined until the terms it depends on have been defined", function () {
	eden.execute("x is y + z;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("y = 1;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("z = 1;");
	equal(root.lookup('x').value(), 2);
});

test("A formula var is evaluated after definition if all it's terms are defined", function () {
	eden.execute('x is 2; y is t("y", x);');
	deepEqual(root.lookup('trace').value(), ["y"]);
});

test("A formula var is not evaluated after definition if not all it's terms are defined", function () {
	eden.execute('y is t("y", x);');
	deepEqual(root.lookup('trace').value(), []);
});

test("An unevaluated formula var is evaluated when it is assigned to something else", function () {
	eden.execute('y is t("y", x); z = y;');
	deepEqual(root.lookup('trace').value(), ["y"]);
});

//
// list formula vars
//
edenModule("List formula vars");

test("Unevaluated", function () {
	eden.execute('l is t("l", [a, b, c]);');
	deepEqual(root.lookup('trace').value(), []);
});

test("Length operator forces", function () {
	eden.execute('l is t("l", [a, b, c]); l#;');
	deepEqual(root.lookup('trace').value(), ['l']);
});

test("Using length of list whose parts are not yet defined", function () {
	eden.execute('l is [a, b, c]; n = l#;');
	equal(root.lookup('n').value(), 3);
});

test("Value when parts are not yet defined", function () {
	eden.execute('l is [a, b, c]; b = l == [@,@,@];');
	equal(root.lookup('b').value(), true);
});

//
// autocalc
//
edenModule("Autocalc");

test("autocalc off defers dependency", function () {
	eden.execute("x is y; y = 1; autocalc = 0; y = 2;");
	equal(root.lookup('x').value(), 1);
	eden.execute("autocalc = 1;");
	equal(root.lookup('x').value(), 2);
});

test("autocalc off defers agents", function () {
	eden.execute('x = 0; proc p : y { x++; } autocalc = 0; y = 0; y = 1;');
	equal(root.lookup('x').value(), 0);
	eden.execute('autocalc = 1;');
	equal(root.lookup('x').value(), 1);
});

//
// last modified by
//
edenModule("Last modified by");

test("last modified is undefined by default", function () {
	equal(root.lookup('x').last_modified_by, undefined);
});

test("readonly doesn't set last modified by", function () {
	eden.execute('x = y;');
	equal(root.lookup('y').last_modified_by, undefined);
});

test("assignment sets last modified by", function () {
	eden.execute('x = 1;');
	equal(root.lookup('x').last_modified_by, 'input');
});

test("assignment from proc invoked directly sets last modified by", function () {
	eden.execute('proc p { x = 2; } p();');
	equal(root.lookup('x').last_modified_by, 'input');
});

test("assignment from triggered proc sets last modified by", function () {
	eden.execute('proc p : y { x = 2; } y = 2;');
	equal(root.lookup('x').last_modified_by, 'p');
});

test("definition sets last modified by", function () {
	eden.execute('x is 1;');
	equal(root.lookup('x').last_modified_by, 'input');
});

test("definition from proc invoked directly sets last modified by", function () {
	eden.execute('proc p { x is 2; } p();');
	equal(root.lookup('x').last_modified_by, 'input');
});

test("definition from triggered proc sets last modified by", function () {
	eden.execute('proc p : y { x is 2; } y = 2;');
	equal(root.lookup('x').last_modified_by, 'p');
});

test("function definition sets last modified by", function () {
	eden.execute('func f {}');
	equal(root.lookup('f').last_modified_by, 'input');
});

test("proc definition sets last modified by", function () {
	eden.execute('proc p {}');
	equal(root.lookup('p').last_modified_by, 'input');
});

//
// lists
//
edenModule("List type");

test("Lists are 1 indexed", function () {
	eden.execute("x = [20,30,40]; y = x[1];");
	equal(root.lookup('y').value(), 20);
});

test("Lists are value types", function () {
	eden.execute("x = [1,2,3]; func f { $1 = 9000; } f(x);");
	equal(root.lookup('x').value()[0], 1);
});

test("assigning a list and modifying", function () {
	eden.execute("x = y = [1,2,3]; b = x == y;");
	equal(root.lookup('b').value(), true);
	eden.execute("x[1]++; b = x == y;");
	equal(root.lookup('b').value(), false);
});

test("defining a list and modifying", function () {
	eden.execute("x is y; y = [1,2,3]; b = x == y;");
	equal(root.lookup('b').value(), true);
	eden.execute("x[1] = [2]; b = x == y;");
	equal(root.lookup('b').value(), false);
});

test("passing a list and modifying", function () {
	eden.execute("x = [1,2,3]; proc p { b = $1 == x; } p(x);");
	equal(root.lookup('b').value(), true);
	eden.execute("proc p { $1[1] = 2; b = $1 == x; } p(x);");
	equal(root.lookup('b').value(), false);
});

test("list comparison", function () {
	eden.execute("b = [1,2,3] == [1,2,3];");
	equal(root.lookup('b').value(), true);
	eden.execute("b = [1,2,3] == [1,2,4];");
	equal(root.lookup('b').value(), false);
	eden.execute("b = [] == [];");
	equal(root.lookup('b').value(), true);
	eden.execute("b = [[1]] == [[1]];");
	equal(root.lookup('b').value(), true);
	eden.execute("b = [[1]] == [[2]];");
	equal(root.lookup('b').value(), false);
	eden.execute("b = [] == @;");
	equal(root.lookup('b').value(), false);
});

//
// @
//
edenModule("@");

test("arithmetic with @ should return @", function () {
	eden.execute("x = @ + 1;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ + @;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ * 1;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ * @;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ / 1;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ / @;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ % 1;");
	equal(root.lookup('x').value(), undefined);
	eden.execute("x = @ % @;");
	equal(root.lookup('x').value(), undefined);
});

//
// include
//
edenModule("Include statement");

test("include defers execution", function () {
	var include = eden.include;
	eden.include = function (url, prefix, success) {
		equal(url, "https://test.com/test.js");
		setTimeout(function () {
			equal(root.lookup('x').value(), undefined);
			// allow script which called "include" to continue
			success();
			equal(root.lookup('x').value(), 2);
			start();
		}, 0);
	};

	stop();
	try {
		eden.execute('include("https://test.com/test.js"); x = 2;');
	} catch (e) {
		eden.include = include;
		throw e;
	}
});

// the following tests only work in browser
if (typeof window !== "undefined") {
	test("@browser include jse same host", function () {
		eden.execute('include("test-models/test.jse");', function () {
			equal(root.lookup('x').value(), 9000);
			start();
		});
		stop();
	});

	test("@browser include jse different host", function () {
		rt.config = {
			"jseProxyBaseUrl": "http://stormy-peak-6294.herokuapp.com/"
		};
		eden.execute('include("https://gist.githubusercontent.com/itsmonktastic/29997e30182295a5dbc8/raw/d6cfa96eb2eae3f6dddc1b86f6ee04eb65b24b01/test.jse");', function () {
			equal(root.lookup('x').value(), 9001);
			start();
		});
		stop();
	});
}
