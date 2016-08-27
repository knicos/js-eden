Eden.Statement = function() {
	Eden.Statement.statements.push(this);
	this.id = Eden.Statement.statements.length-1;
	this.source = "";
	this.ast = undefined;
}

Eden.Statement.search = function(regex, m) {
	var maxres = (m) ? m : 10;
	var results = [];
	for (var i=0; i<Eden.Statement.statements.length; i++) {
		//if (results.length >= maxres) break;
		var stat = Eden.Statement.statements[i];
		if (stat.ast && stat.ast.script) {
			if (stat.ast.script.type == "definition" || stat.ast.script.type == "assignment") {
				if (regex.test(stat.ast.script.lvalue.name)) {
					if (stat.isActive()) {
						var nres = [i];
						nres.push.apply(nres,results);
						results = nres;
					} else {
						results.push(i);
					}
					continue;
				}
			} else if (stat.ast.script.type == "when") {
				for (var x in stat.ast.triggers) {
					if (regex.test(x)) {
						if (stat.isActive()) {
							var nres = [i];
							nres.push.apply(nres,results);
							results = nres;
						} else {
							results.push(i);
						}
						break;
					}
				}
			}
		}
	}
	return results;
}

Eden.Statement.prototype.isActive = function() {
	if (this.ast && this.ast.script) {
		if (this.ast.script.type == "definition" || this.ast.script.type == "assignment") {
			var sym = eden.root.symbols[this.ast.script.lvalue.name];
			return (sym && sym.statid == this.id);
		} else if (this.ast.script.type == "when") {
			return Eden.Statement.active[this.id];
		}
	}
	return false;
}

Eden.Statement.prototype.setSource = function(src, ast) {
	if (this.ast && this.ast.script && (this.ast.script.type == "definition" || this.ast.script.type == "assignment")) {
		if (Eden.Statement.symbols[this.ast.script.lvalue.name] && Eden.Statement.symbols[this.ast.script.lvalue.name][this.id]) {
			Eden.Statement.symbols[this.ast.script.lvalue.name][this.id] = undefined;
		}
	}
	this.source = src;
	this.ast = ast;
	if (ast && ast.script && ast.script.errors.length == 0) {
		ast.statid = this.id;
		if (ast.script.type == "definition" || ast.script.type == "assignment") {
			if (Eden.Statement.symbols[ast.script.lvalue.name] === undefined) Eden.Statement.symbols[ast.script.lvalue.name] = {};
			Eden.Statement.symbols[ast.script.lvalue.name][this.id] = this;

			var sym = eden.root.symbols[ast.script.lvalue.name];
			if (sym && sym.statid == this.id) {
				if (ast.script.type == "definition") sym.define(this.ast.script, this.id, this.ast);
				//else ast.script.execute(eden.root, ast, ast, eden.root.scope);
			}
		}
	}
}

// Watch to trigger whens
Eden.Statement.init = function() {
	eden.root.addGlobal(function(sym, create) {
		for (var x in Eden.Statement.active) {
			if (!Eden.Statement.active[x]) continue;
			//console.log("TRIGGER");
			var me = Eden.Statement.statements[x];
			if (me.ast && me.ast.script.errors.length == 0) {
				var whens = me.ast.triggers[sym.name.slice(1)];
				if (whens) {
					console.log("TRIGGER WITH " + sym.name);
					//clearExecutedState();
					for (var i=0; i<whens.length; i++) {
						whens[i].statement.execute(eden.root, undefined, me.ast, (whens[i].scope) ? whens[i].scope : eden.root.scope);
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
