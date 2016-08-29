Eden.Statement = function() {
	Eden.Statement.statements.push(this);
	this.id = Eden.Statement.statements.length-1;
	this.source = "";
	this.ast = undefined;
}

Eden.Statement.search = function(regex, m) {
	var maxres = (m) ? m : 10;
	var agentres = [];
	var activeres = [];
	var inactiveres = [];
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

Eden.Statement.prototype.setSource = function(src, ast, stat) {
	if (ast && stat === undefined) stat = ast.script;
	if (this.ast && this.statement && (this.statement.type == "definition" || this.statement.type == "assignment")) {
		if (Eden.Statement.symbols[this.statement.lvalue.name] && Eden.Statement.symbols[this.statement.lvalue.name][this.id]) {
			Eden.Statement.symbols[this.statement.lvalue.name][this.id] = undefined;
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
	}
}

Eden.Statement.prototype.activate = function() {
	if (this.statement) {
		if (this.statement.type == "when") {
			Eden.Statement.active[this.id] = true;
		}
		this.statement.execute(eden.root, this.ast, this.ast, eden.root.scope);
	}
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
					console.log("TRIGGER WITH " + sym.name);
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
Eden.Statement.active = {};
