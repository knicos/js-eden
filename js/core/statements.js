Eden.Statement = function() {
	Eden.Statement.statements.push(this);
	this.id = Eden.Statement.statements.length-1;
	this.source = "";
	this.ast = undefined;
}

Eden.Statement.prototype.setSource = function(src, ast) {
	if (this.ast && this.ast.script && (this.ast.script.type == "definition" || this.ast.script.type == "assignment") && Eden.Statement.symbols[this.ast.script.lvalue.name] && Eden.Statement.symbols[this.ast.script.lvalue.name][this.id]) {
		Eden.Statement.symbols[this.ast.script.lvalue.name][this.id] = undefined;
	}
	this.source = src;
	this.ast = ast;
	if (ast && ast.script && ast.script.errors.length == 0) {
		if (ast.script.type == "definition" || ast.script.type == "assignment") {
			if (Eden.Statement.symbols[ast.script.lvalue.name] === undefined) Eden.Statement.symbols[ast.script.lvalue.name] = {};
			Eden.Statement.symbols[ast.script.lvalue.name][this.id] = this;
		}
	}
}

// Watch to trigger whens
Eden.Statement.init = function() {
	eden.root.addGlobal(function(sym, create) {
		for (var x in Eden.Statement.active) {
			if (!Eden.Statement.active[x]) continue;
			console.log("TRIGGER");
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
