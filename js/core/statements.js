

Eden.Statement = function() {
	var ffree = Eden.Statement.findFree();
	if (ffree == -1) {
		Eden.Statement.statements.push(this);
		this.id = Eden.Statement.statements.length-1;
	} else {
		this.id = ffree;
		Eden.Statement.statements[ffree] = this;
	}
	this.source = "";
	this.ast = undefined;
	this.owned = false;
	this.rid = undefined;
	this.timestamp = undefined;
}

Eden.Statement.findFree = function() {
	for (var i=0; i<Eden.Statement.statements.length; i++) {
		if (Eden.Statement.statements[i] === undefined) return i;
	}
	return -1;
}

Eden.Statement.getSources = function(res) {
	var srcs = [];
	if (res) {
		if (res.active) {
			for (var i=0; i<res.active.length; i++) {
				var stat = Eden.Statement.statements[res.active[i]];
				srcs.push(stat.source);
			}
		}

		if (res.inactive) {
			for (var i=0; i<res.inactive.length; i++) {
				var stat = Eden.Statement.statements[res.inactive[i]];
				srcs.push(stat.source);
			}
		}

		if (res.agents) {
			for (var i=0; i<res.agents.length; i++) {
				var stat = Eden.Statement.statements[res.agents[i]];
				srcs.push(stat.source);
			}
		}
	}

	return srcs;
}

Eden.Statement.search = function(str, cb) {
	var words = str.split(/[ ]+/);
	var res;
	var i = 0;
	var rcount = words.length;
	var tagres;
	var inittoken = false;
	var sortopts;
	var groupopt = "category";

	if (words.length > 0) {
		if (words[0].charAt(words[0].length-1) == ":") {
			i = 1;
			inittoken = true;
		} else if (words[0].charAt(0) == "#") {
			tagres = [];
			var regex = edenUI.regExpFromStr(words[0]);
			// Generate some hashtag results
			for (var x in Eden.Statement.tags) {
				if (regex.test(x)) {
					tagres.push(x);
				}
			}

			tagres.sort(function(a,b) {
				return Eden.Statement.tags[a].length < Eden.Statement.tags[b].length;
			});
			//console.log(tagres);
		}
	}

	rcount -= i;

	for (; i<words.length; i++) {
		if (words[i] == "") {
			rcount--;
			continue;
		}
		if (words[i].startsWith("sort:")) {
			var opts = words[i].split(":");
			sortopts = opts[1].split(",");
			rcount--;
		} else if (words[i].startsWith("group")) {
			var opts = words[i].split(":");
			groupopt = opts[1];
			rcount--;
		} else if (words[i].startsWith("depends:")) {
			// Do a dependency search
			var deps = words[i].split(":");
			if (deps[1] == "") continue;
			//console.log("DEPENDS: " + deps[1]);
			res = Eden.Statement.dependSearch(edenUI.regExpFromStr(deps[1]), undefined,res);
		} else if (words[i].startsWith("determines:")) {
			// Do a dependency search
			var deps = words[i].split(":");
			if (deps[1] == "") continue;
			//console.log("DEPENDS: " + deps[1]);
			res = Eden.Statement.determineSearch(edenUI.regExpFromStr(deps[1]), undefined,res);
		} else if (words[i].charAt(0) == "#") {
			res = Eden.Statement.tagSearch(edenUI.regExpFromStr(words[i]), undefined,res);
		} else if (words[i].charAt(0) == "-") {
			var nres;
			var theword = words[i].substring(1);
			if (theword == "") continue;
			if (words[i].charAt(1) == "#") {
				nres = Eden.Statement.tagSearch(edenUI.regExpFromStr(theword));
			} else {
				nres = Eden.Statement._search(edenUI.regExpFromStr(theword));
			}
			res = negativeFilter(res, nres);
			//res.inactive = negativeFilter(res.inactive, nres.inactive);
			//res.agents = negativeFilter(res.agents, nres.agents);
			rcount--;
		} else {
			res = Eden.Statement._search(edenUI.regExpFromStr(words[i]), undefined,res);
		}
	}

	if (res) {
		if (inittoken) {
			var tokens = words[0].split(":");

			for (var i=0; i<tokens.length; i++) {
				if (tokens[i] == "agents") {
					var newres = [];
					for (var j=0; j<res.length; j++) {
						if (Eden.Statement.statements[res[j]].isAgent()) newres.push(res[j]);
					}
					res = newres;
				} else if (tokens[i] == "active") {
					var newres = [];
					for (var j=0; j<res.length; j++) {
						if (Eden.Statement.statements[res[j]].isActive()) newres.push(res[j]);
					}
					res = newres;
				} else if (tokens[i] == "inactive") {
					var newres = [];
					for (var j=0; j<res.length; j++) {
						if (!Eden.Statement.statements[res[j]].isActive()) newres.push(res[j]);
					}
					res = newres;
				} else if (tokens[i] == "handles") {
					var ahandles = [];

					for (var j=0; j<res.length; j++) {
						var stat = Eden.Statement.statements[res[j]];
						if (stat.statement && stat.statement.type == "assignment") ahandles.push(res[j]);
						else if (stat.statement && stat.statement.type == "definition" && Object.keys(stat.ast.dependencies).length == 0) ahandles.push(res[j]);
					}

					res = ahandles;
				} else if (tokens[i] == "oracles") {
					var ahandles = [];

					for (var j=0; j<res.length; j++) {
						var stat = Eden.Statement.statements[res[j]];
						if (stat.statement && (stat.statement.type == "assignment" || stat.statement.type == "definition")) {
							var sym = eden.root.symbols[stat.statement.lvalue.name];
							if (sym && Object.keys(sym.subscribers).length == 0) ahandles.push(res[j]);
						}
					}

					res = ahandles;
				} else if (tokens[i] == "defs") {
					var newres = [];
					for (var j=0; j<res.length; j++) {
						if (!Eden.Statement.statements[res[j]].isAgent()) newres.push(res[j]);
					}
					res = newres;
				}
			}
		}

		res = reduceByCount(res, rcount);

		// Now apply sorting
		if (sortopts && sortopts.length > 0) {
			//var allres = [];
			//allres.push.apply(allres, res.active);
			//allres.push.apply(allres, res.inactive);

			if (sortopts[0] == "youngest") {
				//allres.push.apply(allres, res.agents);
				res.sort(function(a,b) {
					return Eden.Statement.statements[a].timestamp < Eden.Statement.statements[b].timestamp;
				});
			} else if (sortopts[0] == "oldest") {
				//allres.push.apply(allres, res.agents);
				res.sort(function(a,b) {
					return Eden.Statement.statements[a].timestamp > Eden.Statement.statements[b].timestamp;
				});
			} else if (sortopts[0] == "name") {
				// TODO REMOVE AGENTS.
				res.sort(function(a,b) {
					return Eden.Statement.statements[a].statement.lvalue.name.toUpperCase().localeCompare(Eden.Statement.statements[b].statement.lvalue.name.toUpperCase());
				});
			}
		}

		// Now perform grouping
		if (groupopt == "category") {
			// Default should be by category (active, inactive, agents)
			// Others are topdown or bottomup dependence, by tags
			var gres = {grouping: groupopt, active: [], inactive: [], agents: [], all: res};
			for (var i=0; i<res.length; i++) {
				var stat = Eden.Statement.statements[res[i]];
				if (stat.isAgent()) gres.agents.push(res[i]);
				else if (stat.isActive()) gres.active.push(res[i]);
				else gres.inactive.push(res[i]);
			}
			res = gres;
		}

		if (tagres) res.tags = tagres;
		return res;
	} else if (tagres) {
		return {tags: tagres};
	}
}

Eden.Statement.remoteSearch = function(str, cb) {
	if (Eden.Statement.connected) {
		Eden.Statement.querycb = cb;
		Eden.Statement.connection.send(JSON.stringify({action: "search", query: str}));
	}
}

Eden.Statement._search = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	//var agentres = (prev)?prev.agents:[];
	//var activeres = (prev)?prev.active:[];
	//var inactiveres = (prev)?prev.inactive:[];
	var res = (prev)?prev:[];

	for (var i=0; i<Eden.Statement.statements.length; i++) {
		//if (results.length >= maxres) break;
		var stat = Eden.Statement.statements[i];
		if (stat === undefined) continue;
		if (stat.ast && stat.statement) {
			if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
				if (regex.test(stat.statement.lvalue.name)) {
					//if (stat.isActive()) {
					//	activeres.push(i);
					//} else {
						res.push(i);
					//}
					continue;
				}
			} else if (stat.statement.type == "when") {
				for (var x in stat.statement.triggers) {
					if (regex.test(x)) {
						res.push(i);
						break;
					}
				}
			}
		}
	}
	return res;
}

Eden.Statement.dependSearch = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	//var agentres = (prev)?prev.agents:[];
	//var activeres = (prev)?prev.active:[];
	//var inactiveres = (prev)?prev.inactive:[];
	var res = (prev)?prev:[];

	for (var i=0; i<Eden.Statement.statements.length; i++) {
		//if (results.length >= maxres) break;
		var stat = Eden.Statement.statements[i];
		if (stat && stat.ast && stat.statement) {
			if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
				
				for (var x in stat.ast.dependencies) {
					if (regex.test(x)) {
						//if (stat.isActive()) {
						//	activeres.push(i);
						//} else {
							res.push(i);
						//}
						break;
					}
				}
			} else if (stat.statement.type == "when") {
				for (var x in stat.statement.triggers) {
					if (regex.test(x)) {
						res.push(i);
						break;
					}
				}
			}
		}
	}
	return res;
}

Eden.Statement.determineSearch = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	//var agentres = (prev)?prev.agents:[];
	//var activeres = (prev)?prev.active:[];
	//var inactiveres = (prev)?prev.inactive:[];
	var res = (prev)?prev:[];

	// Find all matching symbols
	// For each, get all dependencies recursively
	// For each dependency extract the origin statement (including agents).
	var syms = [];
	for (var s in eden.root.symbols) {
		//var name = s.slice(1);
		if (regex.test(s)) syms.push(eden.root.symbols[s]);
	}

	//console.log(syms);

	var done = {};

	for (var i=0; i<syms.length; i++) {
		if (done[syms[i].name] === undefined) {
			for (var d in syms[i].dependencies) {
				syms.push(syms[i].dependencies[d]);
			}
			done[syms[i].name] = syms[i];
		}
	}

	for (var x in done) {
		var statid = done[x].statid;
		if (statid !== undefined) {
			var stat = Eden.Statement.statements[statid];
			//if (stat.statement.type == "when") {
				res.push(statid);
			//} else {
			//	activeres.push(statid);
			//}
		}
	}

	
	return res;
}

Eden.Statement.tagSearch = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	//var agentres = (prev)?prev.agents:[];
	//var activeres = (prev)?prev.active:[];
	//var inactiveres = (prev)?prev.inactive:[];
	var res = (prev)?prev:[];

	for (var x in Eden.Statement.tags) {
		if (regex.test(x)) {
			//if (results.length >= maxres) break;
			var stats = Eden.Statement.tags[x];

			for (var i in stats) {
				var stat = stats[i];
				if (stat.ast && stat.statement) {
					//if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
						//if (regex.test(stat.statement.lvalue.name)) {
							//if (stat.isActive()) {
							//	activeres.push(stat.id);
							//} else {
								res.push(stat.id);
							//}
							//continue;
						//}
					//} else if (stat.statement.type == "when") {
						//for (var u in stat.statement.triggers) {
							//if (regex.test(x)) {
								//res.push(stat.id);
								//break;
							//}
						//}
					//}
				}
			}
		}
	}
	return res;
}

Eden.Statement.prototype.lock = function() {
	if (this.owned == false) {
		this.owned = true;
		return true;
	} else {
		return false;
	}
}

Eden.Statement.prototype.unlock = function() {
	this.owned = false;
}

Eden.Statement.prototype.valueStringFull = function() {
	var val = Eden.edenCodeForValue(this.value());
	if (this.statement.type == "definition") {
		return this.statement.lvalue.name + " is " + val;
	} else if (this.statement.type == "assignment") {
		return this.statement.lvalue.name + " = " + val;
	}
	return undefined;
}

Eden.Statement.prototype.value = function() {
	var active = this.isActive();

	if (active) {
		var sym = eden.root.lookup(this.statement.lvalue.name);
		return sym.boundValue(eden.root.scope);
	} else {
		if (this.statement.type == "definition" || this.statement.type == "assignment") {
			var dummyctx = {scopes: [], dependencies: {}};
			var rhs = "(function(context,scope) { \n";
			var express = this.statement.expression.generate(dummyctx, "scope",true);

			// Generate array of all scopes used in this definition (if any).
			if (dummyctx.scopes.length > 0) {
				//rhs += "\tvar _scopes = [];\n";
				for (var i=0; i<dummyctx.scopes.length; i++) {
					rhs += "\tvar scope" + (i+1) + " = " + dummyctx.scopes[i];
					rhs += ";\n";
				}
			}

			rhs += "return " + express;
			rhs += ";})";

			var val = eval(rhs).call(dummyctx,eden.root,eden.root.scope);
			return val;
		}
		return undefined;
	}
}

Eden.Statement.prototype.isActive = function() {
	if (this.ast && this.statement) {
		if (this.statement.type == "definition" || this.statement.type == "assignment") {
			var sym = eden.root.symbols[this.statement.lvalue.name];
			return (sym && sym.statid == this.id);
		} else if (this.statement.type == "when") {
			return Eden.Statement.active[this.id];
		}
	}
	return false;
}

Eden.Statement.prototype.isAgent = function() {
	return this.statement && this.statement.type == "when";
}

Eden.Statement.reset = function() {
	Eden.Statement.statements = [];
	Eden.Statement.symbols = {};
	Eden.Statement.tags = {};
	Eden.Statement.active = {};
	Eden.Statement.shared = {};
}

Eden.Statement.load = function(object) {
	Eden.Statement.reset();

	var stats = object;

	if (stats && Array.isArray(stats) && stats.length > 0) {
		for (var i=0; i<stats.length; i++) {
			if (stats[i]) {
				var stat = new Eden.Statement();
				if (stats[i].rid) {
					stat.rid = stats[i].rid;
					Eden.Statement.shared[stats[i].rid] = stat;
				}
				stat.setSource(stats[i].source, new Eden.AST(stats[i].source, undefined, true));
				if (stats[i].active) {
					//console.log("ACTIVATE: " + ((stat.statement.type == "definition") ? stat.statement.lvalue.name : ""));
					stat.activate();
				}
			} else {
				Eden.Statement.statements.push(undefined);
			}
		}
		this.autosave();
		return true;
	}
}

Eden.Statement.save = function() {
	var stats = [];
	for (var i=0; i<Eden.Statement.statements.length; i++) {
		var stat = Eden.Statement.statements[i];
		if (stat === undefined) {
			stats.push(undefined);
		} else {
			stats.push({source: stat.source, active: stat.isActive(), rid: stat.rid});
		}
	}
	return stats;
}

Eden.Statement.restore = function() {
	try {
		if (window.localStorage) {
			var stats = JSON.parse(window.localStorage.getItem("statements"));
			return Eden.Statement.load(stats);
		}
	} catch(e) {

	}

	return false;
}

Eden.Statement.autosave = function() {
	if (Eden.Statement.timeout) clearTimeout(Eden.Statement.timeout);
	var me = this;
	Eden.Statement.timeout = setTimeout(function() {
		//console.log("AUTOSAVE STATEMENTS");
		var stats = Eden.Statement.save();

		try {
			if (window.localStorage) {
				window.localStorage.setItem('statements',JSON.stringify(stats));
			}
		} catch(e) {

		}

		Eden.Statement.timeout = undefined;
	}, 2000);
}

Eden.Statement.prototype.setSource = function(src, ast, stat, net) {
	if (this.source == src) return;
	if (ast === undefined) ast = new Eden.AST(src,undefined, true);
	if (ast && stat === undefined) stat = ast.script;
	//if (stat === undefined || stat.errors.length > 0) return;
	if (this.ast && this.statement && (this.statement.type == "definition" || this.statement.type == "assignment")) {
		if (Eden.Statement.symbols[this.statement.lvalue.name] && Eden.Statement.symbols[this.statement.lvalue.name][this.id]) {
			Eden.Statement.symbols[this.statement.lvalue.name][this.id] = undefined;
		}

		if (this.statement.doxyComment) {
			var tags = this.statement.doxyComment.getHashTags();
			for (var i=0; i<tags.length; i++) {
				//if (Eden.Statement.tags[tags[i]] === undefined) Eden.Statement.tags[tags[i]] = [];
				if (Eden.Statement.tags[tags[i]][this.id]) {
					delete Eden.Statement.tags[tags[i]][this.id];
					Eden.Statement.tags[tags[i]].length--;
				}
				if (Eden.Statement.tags[tags[i]].length == 0) delete Eden.Statement.tags[tags[i]];
			}
		}
	}
	this.source = src;
	this.ast = ast;
	this.statement = stat;
	if (ast && stat && stat.errors.length == 0) {
		ast.statid = this.id;
		if (stat.type == "definition" || stat.type == "assignment") {
			if (Eden.Statement.symbols[stat.lvalue.name] === undefined) Eden.Statement.symbols[stat.lvalue.name] = {};
			Eden.Statement.symbols[stat.lvalue.name][this.id] = this;

			var sym = eden.root.symbols[stat.lvalue.name];
			if (sym && sym.statid == this.id) {
				if (stat.type == "definition") sym.define(stat, this.id, this.ast);
				//else ast.script.execute(eden.root, ast, ast, eden.root.scope);
			}
		}

		if (stat.doxyComment) {
			var tags = stat.doxyComment.getHashTags();
			for (var i=0; i<tags.length; i++) {
				if (Eden.Statement.tags[tags[i]] === undefined) Eden.Statement.tags[tags[i]] = {length:1};
				else if (Eden.Statement.tags[tags[i]][this.id] === undefined) Eden.Statement.tags[tags[i]].length++;
				Eden.Statement.tags[tags[i]][this.id] = this;
			}
		}
		if (!net) {
			//var controls = stat.doxyComment.getControls();
			//if (controls && controls["@shared"]) {
				if (Eden.Statement.connected) {
					//console.log("SEND");
					if (this.rid === undefined) {
						this.rid = makeRandomName();
						Eden.Statement.shared[this.rid] = this;
					}
					Eden.Statement.connection.send(JSON.stringify({action: "update", rid: this.rid, source: this.source}));
				}
			//}
		}
	}

	this.timestamp = Date.now();
	Eden.Statement.autosave();
}

Eden.Statement.prototype.activate = function() {
	if (this.statement) {
		if (this.statement.type == "when") {
			Eden.Statement.active[this.id] = true;
		}
		this.statement.execute(eden.root, this.ast, this.ast, eden.root.scope);
	}

	Eden.Statement.autosave();
}


// Watch to trigger whens
Eden.Statement.init = function() {
	eden.root.addGlobal(function(sym, create, scope) {
		for (var x in Eden.Statement.active) {
			if (!Eden.Statement.active[x]) continue;
			//console.log("TRIGGER");
			var me = Eden.Statement.statements[x];
			if (me.ast && me.statement.errors.length == 0) {
				var whens = me.statement.triggers[sym.name.slice(1)];
				if (whens) {
					//console.log("TRIGGER WITH " + sym.name);
					//clearExecutedState();
					for (var i=0; i<whens.length; i++) {
						me.statement.execute(eden.root, undefined, me.ast, (whens[i].scope) ? whens[i].scope : scope);
					}
					//gutter.generate(this.ast,-1);
					//me.clearExecutedState();
				}
			}
		}
	});
}

//==============================================================================

Eden.Statement.connect = function(addr) {
	var ipaddr = addr;
	var port = 8001;
	var key = "1234";

	window.WebSocket = window.WebSocket || window.MozWebSocket;
	 
	if (!window.WebSocket) {
		console.log("WebSockets not supported");
		return;
	}
	 
	// open connection
	var url = "ws://" + ipaddr + ":" + port + '/'; 
	Eden.Statement.connection = new WebSocket(url);
	

	/*Eden.Agent.listenTo('executeline',this,function(origin,lineno){
		if(origin) {
			var data = JSON.stringify({action: "executeline", name: origin.name, lineno: lineno});
			connection.send(data);
		}
	});
	Eden.Agent.listenTo('patch',this,function(origin,patch,lineno){
		if(origin) {
			var data = JSON.stringify({action: "patch", name: origin.name, patch: patch, lineno: lineno});
			connection.send(data);
		}
	});
	Eden.Agent.listenTo("owned", this, function(origin, cause) {
		if (cause == "net") return;
		connection.send(JSON.stringify({action: "ownership", name: origin.name, owned: origin.owned}));
	});
	eden.listenTo('beforeAssign',this,function(symbol, value, origin){
		if (origin != "net") {
			console.log("ASSIGN: " + symbol.name + " = " + Eden.edenCodeForValue(value));
			connection.send(JSON.stringify({action: "assign", symbol: symbol.name.slice(1), value: value}));
			//connection.send(symbol.name.slice(1) + "=" + Eden.edenCodeForValue(value) + ";");						
		}
	});
	$("#nr-status").html('<p>Connected to: ' + url + "</p>");*/

	Eden.Statement.connection.onopen = function (error) {
		Eden.Statement.connection.send(key);
		//viewData.confirmClose = true;
		//Make sure the pseudorandom numbers generated by different JS-EDEN instances
		//are the same.
		/*randomSeedSym = edenUI.eden.root.lookup("randomSeed");
		randomSeed = randomSeedSym.value();
		
		if (randomSeed === undefined) {
			randomSeedSym.assign((new Date()).getTime(), eden.root.scope, undefined, true);
		} else {
			pushSymbol("randomSeed");
		}
		pushSymbol("randomGenerator");
		connected = true;*/
		Eden.Statement.connected = true;

		// Make sure ownership data is sent
		/*for (var a in Eden.Agent.agents) {
			if (Eden.Agent.agents[a].owned) {
				connection.send(JSON.stringify({action: "ownership", name: a, owned: true}));
			}
		}*/

		// Go through all existing statements and check for sharing...

		//eden.root.lookup("network_connected").assign(true, eden.root.scope);
	};
	Eden.Statement.connection.onerror = function (error) {
		Eden.Statement.connected = false;
		//eden.root.lookup("network_connected").assign(false, eden.root.scope);
		//eden.root.lookup("network_error").assign(error, eden.root.scope);
	};

	Eden.Statement.connection.onclose = function() {
		Eden.Statement.connected = false;
		//eden.root.lookup("network_connected").assign(false, eden.root.scope);
	}
	 

	// Forces the current definition of an observable to be sent to the remote clients,
	// e.g. one defined before the connection was established.
	/*function pushSymbol(name) {
		var root = edenUI.eden.root;
		var currentDef = root.lookup("definitionOf").definition(root)(name);
		connection.send(JSON.stringify({code: currentDef}));
	}*/

	/*me.sendControl = function(key, value) {
		console.log("Send Control: " + key + "= " + value);
		console.log(value);
		connection.send(JSON.stringify({action: "control", key: key, value: value}));
	}

	me.sendAssign = function(sym) {
		if (sym.last_modified_by != "net") {
			connection.send(JSON.stringify({action: "assign", symbol: sym.name.slice(1), value: sym.value()}));
		}
	}*/

	// most important part - incoming messages
	Eden.Statement.connection.onmessage = function (message) {
		program = JSON.parse(message.data);
		
		for(var i = 0; i < program.length; i++){
			line = program[i].code;
			//console.log(line);

			/*switch (line.action) {
			case "patch"		:	Eden.Agent.importAgent(line.name, "default", ["noexec","create"], function(ag) { ag.applyPatch(line.patch, line.lineno) });
									break;
			case "ownership"	:	Eden.Agent.importAgent(line.name, "default", ["noexec","create"], function(ag) { ag.setOwned(line.owned, "net"); });
									break;
			case "executeline"	:	//if (line.lineno >= 0) {
									Eden.Agent.importAgent(line.name, "default", ["noexec"], function(ag) { ag.executeLine(line.lineno, true); });
									//}
									break;
			case "assign"		:	eden.root.lookup(line.symbol).assign(line.value,eden.root.scope, {name: "net"});
									break;
			}*/

			//console.log(line);

			if (line.action == "update") {
				if (Eden.Statement.shared[line.rid]) {
					Eden.Statement.shared[line.rid].setSource(line.source, undefined, undefined, true);
				}
			} else if (line.action == "results" && Eden.Statement.querycb) {
				var nres = {agents: [], inactive: []};
				for (var i=0; i<line.results.inactive.length; i++) {
					if (Eden.Statement.shared[line.results.inactive[i].rid] === undefined) nres.inactive.push(line.results.inactive[i]);
				}
				Eden.Statement.querycb(nres);
				Eden.Statement.querycb = undefined;
			}

			/*continue;

			if (line.code) {
				$("#nr-status").html('<p>Received: ' + line.code + "</p>");
				var ast = new Eden.AST(line.code);
				if (Eden.Agent.agents[line.name]) {
					ast.script.execute(eden.root, undefined, Eden.Agent.agents[line.name].ast);
				} else {
					ast.script.execute(eden.root, undefined, ast);
				}
			} else if (line.owned !== undefined) {
				console.log("OWNED BY OTHER: " + line.name + " = " + line.owned);
				if (Eden.Agent.agents[line.name]) {
					Eden.Agent.agents[line.name].setOwned(line.owned, "net");
				}
			}*/
		}
		//me.playCode(0);
		return;

	};
}

Eden.Statement.statements = [];
Eden.Statement.symbols = {};
Eden.Statement.tags = {};
Eden.Statement.active = {};
Eden.Statement.shared = {};
