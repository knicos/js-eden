/**
 * This script runs a simple webserver which is capable of passing through
 * requests to various ruby scripts we use. It's intended as an alternative to
 * running a vagrant box with apache.
 *
 * While running this a jseden instance should be visible at localhost:8000
 */
var connect = require('connect');
var serveStatic = require('serve-static');
Eden = {};
eden = {root: {}};
require("./js/language/lang.js");
require("./js/language/en.js");
require("./js/core/lex.js");
require("./js/core/translator2.js");
require("./js/core/ast.js");
require("./js/query.js");
var port = 8000;

var app = connect();
app.use(serveStatic('.')).listen(port, function () {
  console.log('JS-Eden instance running at http://localhost:'+port);
});

// =============================================================================

/*
To setup the server on its default port, run:

nodejs state-listener-server.js

If running this file results in an error 'cannot find ws', run 'npm install ws' in this directory
then try the above nodejs command again. You should then have a server running on port 8001

To send messages to the server (and therefore any connected JS-Eden browsers)
You should then be able to run: 
PATH_TO_JSEDEN/node_modules/ws/wscat/bin/wscat -c wc://127.0.0.1:8001/
Any EDEN commands typed into the wscat terminal will be sent to all connected browsers  

*/


//Array of sockets to syncronize data with
/*TODO: Make this into a 2D array, with the key to the first key to the array 
acting as a 'password' allowing one server to host many separate 'channels'
*/
var socketKeys = [];

var allSockets = {};
var sessionKeys = [];

var WebSocketServer = require('ws').Server
var fs = require('fs');
var portNR = 8001;
var debug = false;

var agents = {};

var savefilename;

function printUsage(){
        console.log("Usage:\nnode network-remote-server.js FILENAME [--port=PORT] [--debug]");
}

process.argv.forEach(function(val, index, array){
	if(index == 2)
		savefilename = val;
	if(val == "--debug")
		debug = true;
	var options = val.split("=");
        if(options[0] == "--port")
        	portNR = options[1];
});

if(savefilename === undefined){
	console.log("No filename defined");
	savefilename = "./log.txt";
	//return;
}
	

var wss = new WebSocketServer({port: portNR});
function receiveData(socket, data){
	//For each received command, send it to every known socket 
	//(apart from the socket that sent the data)
	var socketKey = socket.upgradeReq.headers["sec-websocket-key"];
	var sessionKey = socketKeys[socketKey];
	if(typeof sessionKey == 'undefined'){
		//authenticate
		sessionKey = data;
		socketKeys[socketKey] = sessionKey;
		if(typeof allSockets[sessionKey] == 'undefined')
			allSockets[sessionKey] = [];
		allSockets[sessionKey].push(socket);
		var msg = "REPLAY:"+(allSockets[sessionKey].length -1)+":"+sessionKey+":C:"+socketKey;
		if(debug)
			console.log(msg);
		logToFile(msg);
	}else{
		processCode(socket,data);
	}
}

function logToFile(msg){
	fs.appendFile(savefilename, msg + "\n", function(err){
		if(err) throw err;
	});
}

function sendToAllExcept(sessionKey, except, data) {
	var socketsInSession = allSockets[sessionKey];
	var str = JSON.stringify(data);
	for(var i = 0; i < socketsInSession.length; i++){
		if(socketsInSession[i] !== except){
			socketsInSession[i].send(str);
		}
	}
}


function SharedStatement(rid, source) {
	this.rid = rid;
	this.source = undefined;
	this.ast = undefined;
}

SharedStatement.prototype.setSource = function(source) {
	var stat = (this.ast) ? this.ast.script : undefined;

	if (stat && (stat.type == "definition" || stat.type == "assignment")) {
		if (symbols[stat.lvalue.name] && symbols[stat.lvalue.name][this.rid]) {
			symbols[stat.lvalue.name][this.rid] = undefined;
		}

		if (stat.doxyComment) {
			var tags = stat.doxyComment.getHashTags();
			for (var i=0; i<tags.length; i++) {
				//if (Eden.Statement.tags[tags[i]] === undefined) Eden.Statement.tags[tags[i]] = [];
				delete hashtags[tags[i]][this.rid];
				hashtags[tags[i]].length--;
				if (hashtags[tags[i]].length == 0) delete hashtags[tags[i]];
			}
		}
	}

	this.source = source;
	this.ast = new Eden.AST(source,undefined,true);
	stat = this.ast.script;

	if (stat.type == "definition" || stat.type == "assignment") {
		if (symbols[stat.lvalue.name] === undefined) symbols[stat.lvalue.name] = {};
		symbols[stat.lvalue.name][this.rid] = this;
	}

	if (stat.doxyComment) {
		var tags = stat.doxyComment.getHashTags();
		for (var i=0; i<tags.length; i++) {
			if (hashtags[tags[i]] === undefined) hashtags[tags[i]] = {length:1};
			else hashtags[tags[i]].length++;
			hashtags[tags[i]][this.rid] = this;
		}
	}
}

regExpFromStr = function (str, flags, exactMatch, searchLang) {
	var regExpStr, regExpObj;
	var valid = true;
	var minWordLength = 3;


	if (flags === undefined) {
		flags = "";
	}

	//Determine the syntax that the user used to express their search.
	var simpleWildcards;
	if (searchLang === undefined) {
		//The following line should match the same heuristic check in showObservables in core.js-e
		if (/[\\+^$|({[]|(\.\*[^\s*?])/.test(str)) {
			//User appears to be using a regular expression even though their usual preference might be simple search.
			simpleWildcards = false;
		} else {
			simpleWildcards = true; //this.getOptionValue("optSimpleWildcards") !== "false";
		}
	} else if (searchLang == "simple") {
		simpleWildcards = true;
	} else if (searchLang == "regexp") {
		simpleWildcards = false;
	} else {
		//throw new Error("EdenUI.regExpFromStr: Unsupported search language " + searchLang);
	}

	//Guess desirability of case sensitivity based on the presence or absence of capital letters.
	if (!/[A-Z]/.test(str)) {
		flags = flags + "i";
	}

	//Handle substitutions to replace simple wildcards with real regexp ones.
	if (simpleWildcards) {
		//Mode where * acts as .* , ? as .? , or as |, no other special characters.
		str = str.replace(/([\\+^$.|(){[])/g, "\\$1").replace(/([*?])/g, ".$1");
		var alternatives = str.split(new RegExp("\\s+(?:" + Eden.Language.ui.search.disjunction + "|or)\\s+", "i"));
		for (var i = 0; i < alternatives.length; i++) {
			var alternative = alternatives[i];
			if (exactMatch || /[?*]/.test(alternative)) {
				alternatives[i] = "^(" + alternative + ")$";
			} else if (alternative.length < minWordLength) {
				//Assume very short strings are intended to be prefixes in simple search mode.
				alternatives[i] = "^(" + alternative + ")";
			}
		}
		regExpStr = alternatives.join("|");
		regExpObj = new RegExp(regExpStr, flags);

	} else {

		//Attempt to construct a regexp.
		try {
			regExpStr = str;
			if (exactMatch) {
				regExpStr = "^(" + regExpStr + ")$";
			}
			regExpObj = new RegExp(regExpStr, flags);
		} catch (e) {
			//User typed in a bad regexp string.  Unmatched (, ) or [ or begins with *, +, ? or { or ends with backslash.
			valid = false;
			var validPart = str.match(/^([^*+?\\(){[]([^\\()[]*(\\.)?)*)?/)[0];
			if (exactMatch) {
				validPart = "^(" + validPart + ")";
			}
			regExpObj = new RegExp(validPart, flags);
		}
	}

	return regExpObj;
}

SharedStatement.search = function(str) {
	var words = str.split(/[ ]+/);
	var res;
	var i = 0;
	var rcount = words.length;
	var inittoken = false;

	if (words.length > 0) {
		if (words[0].charAt(words[0].length-1) == ":") {
			i = 1;
			inittoken = true;
		}
	}

	rcount -= i;

	for (; i<words.length; i++) {
		if (words[i] == "") {
			rcount--;
			continue;
		}
		if (words[i].startsWith("depends:")) {
			// Do a dependency search
			var deps = words[i].split(":");
			if (deps[1] == "") continue;
			//console.log("DEPENDS: " + deps[1]);
			res = SharedStatement.dependSearch(regExpFromStr(deps[1]), undefined,res);
		} else if (words[i].charAt(0) == "#") {
			res = SharedStatement.tagSearch(regExpFromStr(words[i]), undefined,res);
		} else if (words[i].charAt(0) == "-") {
			var nres;
			var theword = words[i].substring(1);
			if (theword == "") continue;
			if (words[i].charAt(1) == "#") {
				nres = SharedStatement.tagSearch(regExpFromStr(theword));
			} else {
				nres = SharedStatement._search(regExpFromStr(theword));
			}
			res.active = Eden.Query.negativeFilter(res.active, nres.active);
			res.inactive = Eden.Query.negativeFilter(res.inactive, nres.inactive);
			res.agents = Eden.Query.negativeFilter(res.agents, nres.agents);
			rcount--;
		} else {
			res = SharedStatement._search(regExpFromStr(words[i]), undefined,res);
		}
	}

	if (res) {
		if (inittoken) {
			/*var tokens = words[0].split(":");
			//console.log(tokens);
			for (var i=0; i<tokens.length; i++) {
				if (tokens[i] == "agents") {
					res.active = [];
					res.inactive = [];
				} else if (tokens[i] == "active") {
					//res.agents = [];
					var aagents = [];
					for (var j=0; j<res.agents.length; j++) {
						if (Eden.Statement.statements[res.agents[j]].isActive()) aagents.push(res.agents[j]);
					}
					res.agents = aagents;
					res.inactive = [];
				} else if (tokens[i] == "inactive") {
					//res.agents = [];
					var aagents = [];
					for (var j=0; j<res.agents.length; j++) {
						if (!Eden.Statement.statements[res.agents[j]].isActive()) aagents.push(res.agents[j]);
					}
					res.agents = aagents;
					res.active = [];
				} else if (tokens[i] == "defs") {
					res.agents = [];
				}*/
			//}
		}

		res.active = Eden.Query.reduceByCount(res.active, rcount);
		res.inactive = Eden.Query.reduceByCount(res.inactive, rcount);
		res.agents = Eden.Query.reduceByCount(res.agents, rcount);

		return res;
	}
}

SharedStatement.dependSearch = function(regex, m, prev) {
	return prev;
}

SharedStatement.tagSearch = function(regex, m, prev) {
	return prev;
}

SharedStatement._search = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	var agentres = (prev)?prev.agents:[];
	var activeres = (prev)?prev.active:[];
	var inactiveres = (prev)?prev.inactive:[];

	for (var i in statements) {
		//if (results.length >= maxres) break;
		var stat = statements[i];
		if (stat === undefined) continue;
		if (stat.ast && stat.ast.script) {
			if (stat.ast.script.type == "definition" || stat.ast.script.type == "assignment" || stat.ast.script.type == "modify") {
				if (regex.test(stat.ast.script.lvalue.name)) {
					inactiveres.push(i);
					continue;
				}
			} else if (stat.ast.script.type == "when") {
				for (var x in stat.ast.script.triggers) {
					if (regex.test(x)) {
						agentres.push(i);
						break;
					}
				}
			}
		}
	}
	return {active: activeres, inactive: inactiveres, agents: agentres};
}

statements = {};
symbols = {};
hashtags = {};


function processCode(socket, data){
	var sessionKey = socketKeys[socket.upgradeReq.headers["sec-websocket-key"]];
	var socketsInSession = allSockets[sessionKey];
	var sender = -1;
	var replay = false;
	var code = JSON.parse(data);
	var codeLines = [];

	if (code.action == "update") {
		if (statements[code.rid] === undefined) {
			statements[code.rid] = new SharedStatement(code.rid);
		}
		var stat = statements[code.rid];
		stat.setSource(code.source);

		codeLines.push({time: 0, code: code});
		var str = JSON.stringify(codeLines);
		for(var i = 0; i < socketsInSession.length; i++){
			if(socketsInSession[i] !== socket){
				socketsInSession[i].send(str);
			}else{
				sender = i;
			}
		}
	} else if (code.action == "search") {
		var res = SharedStatement.search(code.query);

		// Process results.
		var res2 = {inactive: [], agents: []};
		if (res && res.inactive) {
			for (var i=0; i<res.inactive.length; i++) {
				res2.inactive.push({rid: statements[res.inactive[i]].rid, source: statements[res.inactive[i]].source});
			}
		}

		codeLines.push({time: 0, code: {action: "results", results: res2}});
		var str = JSON.stringify(codeLines);
		socket.send(str);
	}

	//sendToAllExcept(socket, codeLines);

	var msg = "REPLAY: " + sender + ":" + sessionKey + ":" + Date.now() + ":" + data;
	if(debug)
		console.log(msg);
	//logToFile(msg);
}


wss.on('connection', function(socket) {
//	console.log(socket);
	socket.on('message', function(data) {
		receiveData(socket,data);	
	});
	socket.on('close', function(){
		closeSocket(socket);
	});
}); 

function receiveDataAuthenticate(socket,data){
}

function closeSocket(socket){
	//Remove closed socket from array of known sockets
	var socketKey = socket.upgradeReq.headers["sec-websocket-key"];
	var sessionKey = socketKeys[socketKey];
	var session = sessionKeys[sessionKey];

	// Unlock all scripts owned by this socket.
	var unlocks = [];
	if (agents[sessionKey]) {
		for (var a in agents[sessionKey]) {
			if (agents[sessionKey][a] && agents[sessionKey][a].socket === socket) {
				agents[sessionKey][a].owned = false;
				agents[sessionKey][a].socket = undefined;
				unlocks.push({time: 0, code :{action: "ownership", name: a, owned: false}});
			}
		}
		sendToAllExcept(sessionKey, socket, unlocks);
	}

	var i = allSockets[sessionKey].indexOf(socket);
	if(i != -1)
		allSockets[sessionKey].splice(i,1);
	var msg = "REPLAY:?:" + sessionKey + ":D:" + socketKey;
	if(debug)
		console.log(msg);
	//logToFile(msg);
	delete socketKeys[socketKey];
}
