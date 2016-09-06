function sortByCount(arr) {
	// Sort results by count.
	var map = arr.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});
	return Object.keys(map).sort(function (a, b) {
		return map[a] < map[b];
	});
}

function reduceByCount(arr, num) {
	var map = arr.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});

	var res = [];
	for (var x in map) {
		if (map[x] >= num) res.push(x);
	}
	return res;
}

function negativeFilter(arr, neg) {
	var map = neg.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});

	var res = [];
	for (var i=0; i<arr.length; i++) {
		if (!map[arr[i]]) res.push(arr[i]);
	}
	return res;
}

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
}

Eden.Statement.findFree = function() {
	for (var i=0; i<Eden.Statement.statements.length; i++) {
		if (Eden.Statement.statements[i] === undefined) return i;
	}
	return -1;
}

Eden.Statement.search = function(str) {
	var words = str.split(/[ ]+/);
	var res;
	var i = 0;
	var rcount = words.length;

	if (words.length > 0) {
		if (words[0] == "agents:") {
			i = 1;
		} else if (words[0] == "active:") {
			i = 1;
		} else if (words[0] == "inactive:") {
			i = 1;
		}
	}

	rcount -= i;

	for (; i<words.length; i++) {
		if (words[i] == "") continue;
		if (words[i].startsWith("depends:")) {
			// Do a dependency search
			var deps = words[i].split(":");
			if (deps[1] == "") continue;
			//console.log("DEPENDS: " + deps[1]);
			res = Eden.Statement.dependSearch(edenUI.regExpFromStr(deps[1]), undefined,res);
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
			res.active = negativeFilter(res.active, nres.active);
			res.inactive = negativeFilter(res.inactive, nres.inactive);
			res.agents = negativeFilter(res.agents, nres.agents);
			rcount--;
		} else {
			res = Eden.Statement._search(edenUI.regExpFromStr(words[i]), undefined,res);
		}
	}

	if (res) {
		if (words.length > 0) {
			if (words[0] == "agents:") {
				res.active = [];
				res.inactive = [];
			} else if (words[0] == "active:") {
				res.agents = [];
				res.inactive = [];
			} else if (words[0] == "inactive:") {
				res.agents = [];
				res.active = [];
			}
		}

		res.active = reduceByCount(res.active, rcount);
		res.inactive = reduceByCount(res.inactive, rcount);
		res.agents = reduceByCount(res.agents, rcount);

		return res;
	}
}

Eden.Statement._search = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	var agentres = (prev)?prev.agents:[];
	var activeres = (prev)?prev.active:[];
	var inactiveres = (prev)?prev.inactive:[];

	for (var i=0; i<Eden.Statement.statements.length; i++) {
		//if (results.length >= maxres) break;
		var stat = Eden.Statement.statements[i];
		if (stat.ast && stat.statement) {
			if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
				if (regex.test(stat.statement.lvalue.name)) {
					if (stat.isActive()) {
						activeres.push(i);
					} else {
						inactiveres.push(i);
					}
					continue;
				}
			} else if (stat.statement.type == "when") {
				for (var x in stat.statement.triggers) {
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

Eden.Statement.dependSearch = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	var agentres = (prev)?prev.agents:[];
	var activeres = (prev)?prev.active:[];
	var inactiveres = (prev)?prev.inactive:[];

	for (var i=0; i<Eden.Statement.statements.length; i++) {
		//if (results.length >= maxres) break;
		var stat = Eden.Statement.statements[i];
		if (stat.ast && stat.statement) {
			if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
				
				for (var x in stat.ast.dependencies) {
					if (regex.test(x)) {
						if (stat.isActive()) {
							activeres.push(i);
						} else {
							inactiveres.push(i);
						}
						break;
					}
				}
			} else if (stat.statement.type == "when") {
				for (var x in stat.statement.triggers) {
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

Eden.Statement.tagSearch = function(regex, m, prev) {
	var maxres = (m) ? m : 10;
	var agentres = (prev)?prev.agents:[];
	var activeres = (prev)?prev.active:[];
	var inactiveres = (prev)?prev.inactive:[];

	for (var x in Eden.Statement.tags) {
		if (regex.test(x)) {
			//if (results.length >= maxres) break;
			var stats = Eden.Statement.tags[x];

			for (var i in stats) {
				var stat = stats[i];
				if (stat.ast && stat.statement) {
					if (stat.statement.type == "definition" || stat.statement.type == "assignment" || stat.statement.type == "modify") {
						//if (regex.test(stat.statement.lvalue.name)) {
							if (stat.isActive()) {
								activeres.push(stat.id);
							} else {
								inactiveres.push(stat.id);
							}
							//continue;
						//}
					} else if (stat.statement.type == "when") {
						//for (var u in stat.statement.triggers) {
							//if (regex.test(x)) {
								agentres.push(stat.id);
								//break;
							//}
						//}
					}
				}
			}
		}
	}
	return {active: activeres, inactive: inactiveres, agents: agentres};
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

Eden.Statement.reload = function() {
	try {
		if (window.localStorage) {
			//console.log("LOADING STATEMENTS");
			Eden.Statement.statements = [];
			Eden.Statement.symbols = {};
			Eden.Statement.tags = {};
			Eden.Statement.active = {};

			var stats = JSON.parse(window.localStorage.getItem("statements"));

			if (stats && Array.isArray(stats) && stats.length > 0) {
				for (var i=0; i<stats.length; i++) {
					if (stats[i]) {
						var stat = new Eden.Statement();
						stat.setSource(stats[i].source, new Eden.AST(stats[i].source, undefined, true));
						if (stats[i].active) {
							//console.log("ACTIVATE: " + ((stat.statement.type == "definition") ? stat.statement.lvalue.name : ""));
							stat.activate();
						}
					} else {
						Eden.Statement.statements.push(undefined);
					}
				}
				return true;
			}
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
		var stats = [];
		for (var i=0; i<Eden.Statement.statements.length; i++) {
			var stat = Eden.Statement.statements[i];
			if (stat === undefined) {
				stats.push(undefined);
			} else {
				stats.push({source: stat.source, active: stat.isActive()});
			}
		}

		try {
			if (window.localStorage) {
				window.localStorage.setItem('statements',JSON.stringify(stats));
			}
		} catch(e) {

		}

		Eden.Statement.timeout = undefined;
	}, 2000);
}

Eden.Statement.prototype.setSource = function(src, ast, stat) {
	if (ast && stat === undefined) stat = ast.script;
	if (this.ast && this.statement && (this.statement.type == "definition" || this.statement.type == "assignment")) {
		if (Eden.Statement.symbols[this.statement.lvalue.name] && Eden.Statement.symbols[this.statement.lvalue.name][this.id]) {
			Eden.Statement.symbols[this.statement.lvalue.name][this.id] = undefined;
		}

		if (this.statement.doxyComment) {
			var tags = this.statement.doxyComment.getHashTags();
			for (var i=0; i<tags.length; i++) {
				//if (Eden.Statement.tags[tags[i]] === undefined) Eden.Statement.tags[tags[i]] = [];
				delete Eden.Statement.tags[tags[i]][this.id];
				Eden.Statement.tags[tags[i]].length--;
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
				else Eden.Statement.tags[tags[i]].length++;
				Eden.Statement.tags[tags[i]][this.id] = this;
			}
		}
	}

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
	eden.root.addGlobal(function(sym, create) {
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
						me.statement.execute(eden.root, undefined, me.ast, (whens[i].scope) ? whens[i].scope : eden.root.scope);
					}
					//gutter.generate(this.ast,-1);
					//me.clearExecutedState();
				}
			}
		}
	});
}

Eden.Statement.statements = [];
Eden.Statement.symbols = {};
Eden.Statement.tags = {};
Eden.Statement.active = {};
