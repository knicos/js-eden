Eden.Statement = function() {
	Eden.Statement.statements.push(this);
	this.id = Eden.Statement.statements.length-1;
	this.source = "";
	this.ast = undefined;
	this.owned = false;
}

Eden.Statement.search = function(regex, m, prev) {
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
					var stat = new Eden.Statement();
					stat.setSource(stats[i].source, new Eden.AST(stats[i].source, undefined, true));
					if (stats[i].active) {
						//console.log("ACTIVATE: " + ((stat.statement.type == "definition") ? stat.statement.lvalue.name : ""));
						stat.activate();
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
			stats.push({source: stat.source, active: stat.isActive()});
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
