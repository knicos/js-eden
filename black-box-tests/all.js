// usage: node black-box-tests/all.js [line-number]
// passing line number will execute just the test at that line number from
// all.e
var fs = require('fs');
var exec = require('child_process').exec;

var limit;
var firstLine;

if (process.argv[2]) {
	firstLine = parseInt(process.argv[2], 10);
	limit = 1;
} else {
	firstLine = 0;
}

var testsFile = fs.readFileSync('black-box-tests/all.e');
var lines = testsFile.toString().split('\n').slice(firstLine);
var sections = [];
var descriptionLines = [];
var sectionLines = [];
var i;
var sectionLineNumber;
var match;
for (i = 0; i < lines.length; ++i) {
	match = lines[i].match(/^##(.*)/);
	if (match) {
		if (sectionLines.length !== 0) {
			sections.push({
				description: descriptionLines.join(' '),
				section: sectionLines.join('\n'),
				lineNumber: sectionLineNumber
			});
			descriptionLines = [];
			sectionLines = [];
			sectionLineNumber = undefined;
		}
		descriptionLines.push(match[1].trim());
		if (sectionLineNumber === undefined) {
			sectionLineNumber = firstLine + i;
		}
	} else {
		sectionLines.push(lines[i]);
	}
}

var before = fs.readFileSync('black-box-tests/before.e');
var after = fs.readFileSync('black-box-tests/after.e');

var failures = [];
function testNumber(i) {
	if (i === (limit !== undefined ? limit : sections.length)) {
		if (failures.length === 0) {
			return;
		}

		console.log('\nFailures:\n');

		failures.forEach(function (failure) {
			console.log(sections[failure.i].description);
			console.log(failure.stdout);
		});

		return;
	}

	var testCase = before+'\n'+sections[i].section+'\n'+after;
	fs.writeFileSync('__tmptest.e', testCase);
	exec('node ttyeden.js __tmptest.e', function (error, stdout) {
		var result = stdout === '' ? 'PASS' : 'FAIL';
		console.log(result+' '+sections[i].lineNumber+' '+sections[i].description);
		if (stdout !== '') {
			failures.push({
				i: i,
				stdout: stdout
			});
		}
		testNumber(i + 1);
	});
}

testNumber(0);
