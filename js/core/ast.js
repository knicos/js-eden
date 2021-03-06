/*
 * Copyright (c) 2015, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

/**
 * Abstract Syntax Tree Structures
 *
 * When a script is parsed a tree is constructed, and the structures at the
 * nodes and leaves of the tree are defined here. Each node and leaf has a type
 * and a list of errors. Most also have the following set of standard
 * functions:
 *     - error: to add a syntax or run-time error to this node.
 *     - setSource: statement nodes need to know start and end source position
 *     - generate: to generate javascript output from this node and its subtree
 *     - execute: to directly execute the tree, which may go via generate above
 *
 * Generate functions require two parameters: 1) a context which is a
 * definition, assignment, procedure, function or script. This gives the scope
 * of local variables etc. 2) A scope string, a string containing the name of
 * the javascript variable for the scope to use (scope as in js-eden scoping
 * not javascript scope).
 *
 * Execute functions require three parameters: 1) Root symbol table, as in
 * eden.root. 2) Context, same as for the generate function. 3) Base of the
 * abstract syntax tree so that it knows how to call actions defined elsewhere
 * within it.
 *
 * Additionally, each node may have type specific functions for setting node
 * specific children or data items during construction. On the whole, these
 * extra methods should bubble all errors found in child nodes up, ultimately
 * to the root node.
 *
 * @see translator2.js for the parser that generates the tree from these nodes.
 */


/* Generic functions to be reused */
function fnEdenASTerror(err) {
	this.errors.unshift(err);
};

function fnEdenASTleft(left) {
	this.l = left;
	if (left.errors.length > 0) {
		this.errors.push.apply(this.errors, left.errors);
	}
};


////////////////////////////////////////////////////////////////////////////////

/**
 * A doxygen style comment node. The content is not parsed, the entire comment
 * is stored raw.
 */
Eden.AST.DoxyComment = function(content, start, end) {
	this.type = "doxycomment";
	this.content = content;
	this.startline = start;
	this.endline = end;
	this.tags = undefined;
	this.controls = undefined;
}

Eden.AST.DoxyComment.prototype.getHashTags = function() {
	if (this.tags) return this.tags;

	var words = this.content.split(/[ \n\t]+/);
	var tags = {};
	var controls = {};
	for (var i=0; i<words.length; i++) {
		if (words[i].charAt(0) == "#") tags[words[i]] = true;
		if (words[i].charAt(0) == "@") controls[words[i]] = true;
	}
	this.tags = tags;
	this.controls = controls;
	return Object.keys(tags);
}

Eden.AST.DoxyComment.prototype.hasTag = function(tag) {
	if (this.tags === undefined) this.getHashTags();
	return (this.tags[tag]) ? true : false;
}

Eden.AST.DoxyComment.prototype.getControls = function() {
	if (this.controls) return this.controls;
	this.getHashTags();
	return this.controls;
}

Eden.AST.DoxyComment.prototype.stripped = function() {
	var words = this.content.substring(3,this.content.length-2).split(/[ \n\t]+/);
	var res = "";
	for (var i=0; i<words.length; i++) {
		if (words[i].charAt(0) != "#" && words[i].charAt(0) != "@") {
			res += words[i]+" ";
		}
	}
	return res.trim();
}


////////////////////////////////////////////////////////////////////////////////

/**
 * Literals such as numbers, strings, lists and also JavaScript expressions.
 * These literals may or may not require execution to obtain their value.
 */
Eden.AST.Literal = function(type, literal) {
	this.type = "literal";
	this.parent = undefined;
	this.datatype = type;
	this.value = literal;
	this.errors = [];
	this.start = 0;
	this.end = 0;
	this.bound = false;
}
Eden.AST.Literal.prototype.error = fnEdenASTerror;

Eden.AST.Literal.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Literal.prototype.doesReturnBound = function() {
	return this.bound;
}

Eden.AST.Literal.prototype.unparse = function() {
	switch (this.datatype) {
	case "NUMBER"	:	return this.value;
	case "LIST"		:	var res = "[";
						// Loop over each element and generate that also.
						for (var i=0; i<this.value.length; i++) {
							res += this.value[i].unparse();
							if (i != this.value.length-1) res += ",";
						}
						res += "]";
						return res;
	case "CHARACTER":
	case "STRING"	:	var str = this.value.replace(/\n/g,"\\n");
						return "\""+str+"\"";
	case "BOOLEAN"	:	return this.value;
	case "JAVASCRIPT"	: return this.value;
	}
}

Eden.AST.Literal.prototype.generate = function(ctx,scope) {
	switch (this.datatype) {
	case "NUMBER"	:	return this.value;
	case "LIST"		:	var res = "rt.scopebreakout([";
						// Loop over each element and generate that also.
						for (var i=0; i<this.value.length; i++) {
							res += this.value[i].generate(ctx,scope,true);
							if (this.value[i].doesReturnBound && this.value[i].doesReturnBound()) {
								//res += ".value";
								this.bound = true;
							}
							if (i != this.value.length-1) res += ",";
						}
						res += "],"+this.bound+","+scope+")";
						return res;
	case "CHARACTER":
	case "STRING"	:	var str = this.value.replace(/\n/g,"\\n");
						return "\""+str+"\"";
	case "BOOLEAN"	:	return this.value;
	case "JAVASCRIPT"	: return this.value;
	}
}

/**
 * Execute this literal to obtain its actual javascript value, particularly
 * important for lists and JavaScript expression literals.
 */
Eden.AST.Literal.prototype.execute = function(root, ctx, base, scope) {
	switch(this.datatype) {
	case "NUMBER"	:
	case "CHARACTER":
	case "BOOLEAN"	:	return this.value
	case "STRING"	:	return eval("\""+this.value+"\"");
	case "LIST"		:	var rhs = "(function(context,scope) { return ";
						rhs += this.generate(ctx, "scope");
						rhs += ";})";
						return eval(rhs).call(ctx,root,scope);
	case "JAVASCRIPT"	: return eval(this.value);
	}
}


//------------------------------------------------------------------------------

/**
 * Scope Override pattern
 */

Eden.AST.ScopePattern = function() {
	this.type = "scopepattern";
	this.observable = "NONAME";
	this.components = [];
	this.errors = [];
	this.isdefault = false;
	this.isin = false;
	this.increment = undefined;
	this.start = undefined;
	this.end = undefined;
	this.oneshot = false;
	this.range = false;
}

Eden.AST.ScopePattern.prototype.error = fnEdenASTerror;

Eden.AST.ScopePattern.prototype.setObservable = function(obs) {
	this.observable = obs;
}

Eden.AST.ScopePattern.prototype.addListIndex = function(express) {
	this.components.push(express);
	if (express) {
		this.errors.push.apply(this.errors, express.errors);
	}
}

Eden.AST.ScopePattern.prototype.setDefault = function(isdefault) {
	this.isdefault = isdefault;
}

Eden.AST.ScopePattern.prototype.setIn = function(isin) {
	this.isin = isin;
}

Eden.AST.ScopePattern.prototype.setStart = function(start) {
	this.start = start;
	if (start) {
		this.errors.push.apply(this.errors, start.errors);
	}
}

Eden.AST.ScopePattern.prototype.setEnd = function(end) {
	this.end = end;
	if (end) {
		this.errors.push.apply(this.errors, end.errors);
		this.range = true;
	}
}

Eden.AST.ScopePattern.prototype.setIncrement = function(inc) {
	this.increment = inc;
	if (inc) {
		this.errors.push.apply(this.errors, inc.errors);
	}
}


Eden.AST.ScopePattern.prototype.setOneshot = function(oneshot) {
	this.oneshot = oneshot;
}

Eden.AST.ScopePattern.prototype.unparse = function() {
	var res = this.observable;
	if (this.isin) {
		res += " in ";
	} else if (this.oneshot) {
		res += " = ";
	} else if (this.isdefault) {
		res += " @= ";
	} else {
		res += " is ";
	}

	res += this.start.unparse();

	if (this.increment) {
		res += ".." + this.increment.unparse();
		res += ".." + this.end.unparse();
	} else if (this.end) {
		res += ".." + this.end.unparse();
	}

	return res;
}

Eden.AST.ScopePattern.prototype.generate = function(ctx, scope) {
	var startstr = this.start.generate(ctx,scope,true);
	if (this.range) {
		//if (this.start.doesReturnBound && this.start.doesReturnBound()) {
		//	startstr += ".value";
		//}
	}
	var optstr = "{";
	if (this.end) {
		var endstr = this.end.generate(ctx,scope);
		if (this.end.doesReturnBound && this.end.doesReturnBound()) {
			endstr += ".value";
		}
		optstr += "end: " + endstr + ", range: true, ";

		if (this.increment) {
			var incstr = this.increment.generate(ctx,scope);
			if (this.increment.doesReturnBound && this.increment.doesReturnBound()) {
				incstr += ".value";
			}
			optstr += "increment: " + incstr + ",";
		}
	} else {
		optstr += "range: false, ";
	}

	optstr += "isin: " + this.isin + ", ";
	optstr += "isdefault: " + this.isdefault + ", ";
	//optstr += "source: \"" + this.unparse().replace(/\"/g,"\\\"") + "\",";
	optstr += "oneshot: " + this.oneshot + "}";

	//console.log(this.unparse());

	return "new ScopeOverride(\""+this.observable+"\", " + startstr + ", " + optstr + ")";
}



/**
 * Scope node, as specified using "with" statement. This needs to store a bunch
 * of overrides and an expression to which these overrides are applied. It may
 * also contain range overrides and if this is the case the scope node range
 * property is set to true.
 */
Eden.AST.Scope = function() {
	this.type = "scope";
	this.errors = [];
	this.range = false;
	this.overrides = {};
	this.expression = undefined; // = new Eden.AST.Primary();
}

Eden.AST.Scope.prototype.error = fnEdenASTerror;

Eden.AST.Scope.prototype.prepend = function(extra) {
	this.primary.prepend(extra);
}

Eden.AST.Scope.prototype.unparse = function() {
	var res = this.expression.unparse() + " ::";
	for (var o in this.overrides) {
		res += "\n\t" + this.overrides[o].unparse() + ",";
	}
	res = res.substr(0,-1);
	return res;
}

/*Eden.AST.Scope.prototype.setObservable = function(obs) {
	this.primary.setObservable(obs);
}

Eden.AST.Scope.prototype.getObservable = function() {
	return this.primary.getObservable();
}*/

/**
 * Set the LHS expression the scope overrides are to be applied to.
 */
Eden.AST.Scope.prototype.setExpression = function(express) {
	this.expression = express;
	// Bubble errors if there are any
	if (express) {
		this.errors.push.apply(this.errors, express.errors);
	}
}

/**
 * Check if the expression returns a bound value or plain value.
 */
Eden.AST.Scope.prototype.doesReturnBound = function() {
	//return (this.expression && this.expression.doesReturnBound) ? this.expression.doesReturnBound() : false;
	return true;
}

/**
 * Add child nodes for an override. First parameter is a string observable
 * name that has been parsed, and second is the first override value and the
 * third is an optional second value for a range override. The second and third
 * parameters are AST nodes containing a literal or expression.
 */
Eden.AST.Scope.prototype.addOverride = function(over) {
	this.errors.push.apply(this.errors, over.errors);
	this.overrides[over.observable] = over;
	if (over.range || over.isin) this.range = true;
}

Eden.AST.Scope.prototype.generateConstructor = function(ctx, scope) {
	var res;

	//if (ctx.scopes.length > 0) {
		res = "new Scope(context, "+scope+", [";
	//} else {
	//	res = "new Scope(context, scope, [";
	//}

	// Generate script for each override expression.
	for (var o in this.overrides) {
		res += this.overrides[o].generate(ctx, scope);
		res += ",";
	}
	// remove last comma
	res = res.slice(0,-1);

	res += "], "+this.range+", this)"; //context.lookup(\""+this.primary.getObservable()+"\"))";
	return res;
}

Eden.AST.Scope.prototype.generate = function(ctx, scope) {
	if (this.range) {
		var express = this.expression.generate(ctx,"scope", true);

		// Remove unwanted dependencies.
		for (var o in this.overrides) {
			if (this.overrides[o].isdefault) {
				ctx.dependencies[o] = true;
			} else {
				if (ctx.dependencies[o]) ctx.dependencies[o] = false;
			}
		} 

		//console.log(ctx);

		var res = "(function(scope) {\n";
		res += "\t\tvar _scope = " + this.generateConstructor(ctx, "scope") + ";\n";
		res += "\t\t_scope.range = false;\n";
		res += "\t\tvar results = [];\n";
		res += "\t\tvar scoperesults = [];\n";
		res += "\t\tif (_scope.first()) {\n";
		res += "\t\twhile(true) {\n";
		res += "\t\t\tvar scope = _scope.clone();\n";
		res += "\t\t\tvar val = "+express;
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			//res += ".value";
			res += ";\n\t\t\tif (val.value !== undefined) { if (val.scopes) scoperesults.push(val.scopes); else scoperesults.push(val.scope); }\n\tval = val.value";
		} else {
			res += ";\n\t\t\tif (val !== undefined) scoperesults.push("+scope+")";
		}
		res += ";\n";
		res += "\t\t\tif (val !== undefined) results.push(val);\n";
		res += "\t\t\tif (_scope.next() == false) break;\n";
		res += "\t\t}}\n_scope.range = true;\n";

		//if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			res += "\t\treturn new BoundValue(results,_scope,scoperesults);}).call(this,"+scope+")";
			//res += "if (cache) cache.scopes = scoperesults;\n return results;})()";
		//} else {
		//	res += "\t\treturn results;}).call(this,"+scope+")";
		//}
		return res;
	} else {
		var me = this.generateConstructor(ctx,"scope"+((ctx.scopes === undefined || ctx.scopes.length == 0) ? "" : ctx.scopes.length));
		var res;

		if (ctx.scopes === undefined) {
			res = this.expression.generate(ctx,me, true);
		} else {
			ctx.scopes.push(me);
			res = this.expression.generate(ctx,"scope"+(ctx.scopes.length), true);
		}

		// Remove unwanted dependencies.
		for (var o in this.overrides) {
			//delete ctx.dependencies[o];
			//console.log(this.overrides[o]);
			if (this.overrides[o].isdefault) {
				ctx.dependencies[o] = true;
			} else {
				if (ctx.dependencies[o]) ctx.dependencies[o] = false;
			}
		}
		
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			return res;
		} else {
			return "new BoundValue("+res+", scope"+(ctx.scopes.length)+")";
		}
	}
}

Eden.AST.Scope.prototype.execute = function(root, ctx, base, scope, bound) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope",bound);
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}


//------------------------------------------------------------------------------

/**
 * An individual list index. Usually this is some expression that needs to have
 * its value adjusted from js-eden 1 base to 0 base.
 */
Eden.AST.Index = function() {
	this.type = "index";
	this.expression = undefined;
	this.errors = [];
}

Eden.AST.Index.prototype.setExpression = function(express) {
	this.expression = express;
	// Bubble the errors
	if (express.errors.length > 0) {
		this.errors.push.apply(this.errors,express.errors);
	}
}

Eden.AST.Index.prototype.generate = function(ctx, scope) {
	var ix = this.expression.generate(ctx, scope);
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		ix += ".value";
	}
	// Return final string with -1 adjustment applied.
	return "[rt.index("+ix+")]";
}

Eden.AST.Index.prototype.error = fnEdenASTerror;


//------------------------------------------------------------------------------

/**
 * A Dot notation scope path structure. There is a scope on the left, applied
 * to some primary observable name on the right. Most functions in this node
 * forward on to children.
 */
Eden.AST.ScopePath = function() {
	this.type = "scopepath";
	this.errors = [];
	this.primary = undefined;
	this.path = new Eden.AST.Primary();
	this.scopestr = undefined;
}

Eden.AST.ScopePath.prototype.prepend = function(extra) {
	this.path.prepend(extra);
}

Eden.AST.ScopePath.prototype.setObservable = function(obs) {
	this.path.setObservable(obs);
}

Eden.AST.ScopePath.prototype.setBackticks = function(btick) {
	this.path.setBackticks(btick);
}

Eden.AST.ScopePath.prototype.getObservable = function() {
	return this.primary.getObservable();
}

Eden.AST.ScopePath.prototype.doesReturnBound = function() {
	return this.primary.doesReturnBound();
}

Eden.AST.ScopePath.prototype.getScopeString = function() {
	return this.scopestr;
}

Eden.AST.ScopePath.prototype.setPrimary = function(prim) {
	this.primary = prim;
	// Bubble errors from children
	if (this.primary.errors.length > 0) {
		this.errors.push.apply(this.errors, prim.errors);
	}
}

Eden.AST.ScopePath.prototype.generate = function(ctx, scope) {
	// Add scope to list of scopes in the context
	//console.log(ctx);
	//ctx.scopes.push(this.path.generate(ctx, scope, true)+".scope");
	var path = this.path.generate(ctx, scope, true)+".scope"
	//this.scopestr = "_scopes[" + (ctx.scopes.length-1) + "]";
	// And then use that scope to access the primary.
	//return this.primary.generate(ctx, "_scopes["+(ctx.scopes.length-1)+"]");
	return this.primary.generate(ctx, path, true);
}

Eden.AST.ScopePath.prototype.execute = function(root, ctx, base, scope, bound) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope",bound);
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}

Eden.AST.ScopePath.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

/**
 * Dollar numeric action parameters as used in expressions.
 */
Eden.AST.Parameter = function(index) {
	this.type = "parameter";
	this.index = index;
	this.errors = [];
	this.returnsbound = false;
}

Eden.AST.Parameter.prototype.error = fnEdenASTerror;

Eden.AST.Parameter.prototype.doesReturnBound = function() {
	return this.returnsbound;
}

Eden.AST.Parameter.prototype.generate = function(ctx, scope) {
	// If -1 then get the number of parameters available.
	if (this.index == -1) {
		if (ctx && ctx.parameters) return ""+ctx.parameters.length;
		this.returnsbound = false;
		return "0";
	}
	if (ctx && ctx.getParameterByNumber) {
		// An action cannot be compiled if it uses action parameters...
		ctx.dirty = true;
		// Search the context for this parameter to determine scope binding
		var res = ctx.getParameterByNumber(this.index);
		if (res instanceof BoundValue) this.returnsbound = true;
		else this.returnsbound = false;
		//return ""+res;
		// Generate run-time code to obtain parameters value.
		return "ctx.getParameterByNumber("+this.index+")";
	}
}



//------------------------------------------------------------------------------

/**
 * Unary Operators.
 */
Eden.AST.UnaryOp = function(op, right) {
	this.type = "unaryop";
	this.op = op;
	this.errors = right.errors;
	this.r = right;
}
Eden.AST.UnaryOp.prototype.error = fnEdenASTerror;

Eden.AST.UnaryOp.prototype.unparse = function() {
	return this.op + this.r.unparse();
}

Eden.AST.UnaryOp.prototype.generate = function(ctx, scope) {
	var r = this.r.generate(ctx, scope);
	if (this.r.doesReturnBound && this.r.doesReturnBound()) {
		r += ".value";
	}
	if (this.op == "!") {
		return "!("+r+")";
	} else if (this.op == "&") {
		return r;
	} else if (this.op == "-") {
		return "-("+r+")";
	} else if (this.op == "*") {
		return r + ".value("+scope+")";
	}
}

Eden.AST.UnaryOp.prototype.execute = function(root, ctx, base, scope) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope");
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}



//------------------------------------------------------------------------------

Eden.AST.TernaryOp = function(op) {
	this.type = "ternaryop";
	this.op = op;
	this.errors = [];
	this.first = undefined;
	this.second = undefined;
	this.condition = undefined;
	this.returnsbound = true;
}
Eden.AST.TernaryOp.prototype.error = fnEdenASTerror;

Eden.AST.TernaryOp.prototype.setFirst = function(first) {
	this.first = first;
	if (first.errors.length > 0) {
		this.errors.push.apply(this.errors, first.errors);
	}
};

Eden.AST.TernaryOp.prototype.setSecond = function(second) {
	this.second = second;
	if (second.errors.length > 0) {
		this.errors.push.apply(this.errors, second.errors);
	}
};

Eden.AST.TernaryOp.prototype.setCondition = function(cond) {
	this.condition = cond;
	if (cond.errors.length > 0) {
		this.errors.push.apply(this.errors, cond.errors);
	}
};

Eden.AST.TernaryOp.prototype.left = function(pleft) {
	if (this.condition === undefined) {
		this.condition = pleft;
	} else {
		this.first = pleft;
	}
	this.errors.push.apply(this.errors, pleft.errors);
};

Eden.AST.TernaryOp.prototype.doesReturnBound = function() {
	return this.returnsbound;
}

Eden.AST.TernaryOp.prototype.unparse = function() {
	return this.first.unparse() + " if " + this.condition.unparse() + " else " + this.second.unparse();
}

Eden.AST.TernaryOp.prototype.generate = function(ctx, scope) {
	var cond = this.condition.generate(ctx, scope);
	var first = this.first.generate(ctx, scope,true);
	var second = this.second.generate(ctx, scope,true);

	if (this.condition.doesReturnBound && this.condition.doesReturnBound()) {
		cond += ".value";
	}

	if (this.first.doesReturnBound && this.second.doesReturnBound && this.first.doesReturnBound() && this.second.doesReturnBound()) {
		return "("+cond+")?("+first+"):("+second+")";
	} else {
		if (this.first.doesReturnBound && this.first.doesReturnBound()) {
			first += ".value";
		}
		if (this.second.doesReturnBound && this.second.doesReturnBound()) {
			second += ".value";
		}
		this.returnsbound = false;
		return "("+cond+")?("+first+"):("+second+")";
	}
}

Eden.AST.TernaryOp.prototype.execute = function(root, ctx, base, scope) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope");
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}



//------------------------------------------------------------------------------

Eden.AST.BinaryOp = function(op) {
	this.type = "binaryop";
	this.op = op;
	this.errors = [];
	this.l = undefined;
	this.r = undefined;
	this.returnsbound = false;
}
Eden.AST.BinaryOp.prototype.left = fnEdenASTleft;
Eden.AST.BinaryOp.prototype.error = fnEdenASTerror;

Eden.AST.BinaryOp.prototype.setRight = function(right) {
	this.r = right;
	this.errors.push.apply(this.errors, right.errors);
}

Eden.AST.BinaryOp.prototype.unparse = function() {
	return this.l.unparse() + " " + this.op + " " + this.r.unparse();
}

Eden.AST.BinaryOp.prototype.doesReturnBound = function() {
	return this.returnsbound;
}

Eden.AST.BinaryOp.prototype.generate = function(ctx, scope) {
	var left = this.l.generate(ctx, scope, true);
	var right = this.r.generate(ctx, scope, true);
	var opstr;

	var lbound = this.l.doesReturnBound && this.l.doesReturnBound();
	var rbound = this.r.doesReturnBound && this.r.doesReturnBound();

	if (lbound && rbound && this.op == "+") {
		this.returnsbound = true;
		return "rt.addbound(("+left+"),("+right+"))";
	} else {
		// Get values out of any BoundValues
		if (lbound) {
			left += ".value";
		}
		if (rbound) {
			right += ".value";
		}
	}

	switch(this.op) {
	//case "//"	: opstr = "concat"; break;
	case "+"	: opstr = "add"; break;
	case "-"	: opstr = "subtract"; break;
	case "/"	: opstr = "divide"; break;
	case "*"	: opstr = "multiply"; break;
	case "=="	: opstr = "equal"; break;
	case "%"	: opstr = "mod"; break;
	case "^"	: opstr = "pow"; break;
	default		: opstr = "RAW";
	}

	if (opstr != "RAW") {
		return "rt."+opstr+"(("+left+"),("+right+"))";
	} else {
		return "(" + left + ") " + this.op + " (" + right + ")";
	}
}

Eden.AST.BinaryOp.prototype.execute = function(root, ctx, base, scope) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope");
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}



//------------------------------------------------------------------------------

Eden.AST.Length = function() {
	this.type = "length";
	this.errors = [];
	this.l = undefined;
}

Eden.AST.Length.prototype.left = fnEdenASTleft;

Eden.AST.Length.prototype.error = fnEdenASTerror;

Eden.AST.Length.prototype.unparse = function() {
	return this.l.unparse()+"#";
}

Eden.AST.Length.prototype.generate = function(ctx, scope) {
	var left = this.l.generate(ctx, scope);
	// Get value out of a BoundValue
	if (this.l.doesReturnBound && this.l.doesReturnBound()) {
		left += ".value";
	}
	return "rt.length(" + left + ")";
}



//------------------------------------------------------------------------------

Eden.AST.LValue = function() {
	this.type = "lvalue";
	this.errors = [];
	this.name = undefined;
	this.express = undefined;
	this.primary = undefined;
	this.lvaluep = undefined;
	this.islocal = false;
};

Eden.AST.LValue.prototype.error = fnEdenASTerror;


Eden.AST.LValue.prototype.setExtras = function(extras) {
	this.lvaluep = extras;
	if (extras) {
		for (var i = 0; i < extras.length; i++) {
			this.errors.push.apply(this.errors, extras[i].errors);
		}
	}
}


Eden.AST.LValue.prototype.setObservable = function(name) {
	this.name = name;
}

Eden.AST.LValue.prototype.setPrimary = function(primary) {
	this.primary = primary;
	if (primary && primary.errors.length > 0) {
		this.errors.push.apply(this.errors, primary.errors);
	}
}

Eden.AST.LValue.prototype.setExpression = function(express) {
	this.express = express;
	if (express && express.errors.length > 0) {
		this.errors.push.apply(this.errors, express.errors);
	}
}

Eden.AST.LValue.prototype.getSymbol = function(root, ctx, base, scope) {
	if (this.name) return root.lookup(this.name);
	if (this.primary) {
		var sym = this.primary.execute(root,ctx,base,scope);
		if (sym instanceof BoundValue) sym = sym.value;
		return sym;
	}
	if (this.express) {
		console.log(this.express);
		var name = this.express.execute(root,ctx,base,scope);
		console.log(name);
		if (name instanceof BoundValue) name = name.value;
		return root.lookup(name);
	}
}


Eden.AST.LValue.prototype.hasListIndices = function() {
	return this.lvaluep && this.lvaluep.length > 0 && this.lvaluep[0].kind == "index";
}

Eden.AST.LValue.prototype.generateCompList = function(ctx, scope) {
	var res = "[";
	for (var i=0; i<this.lvaluep.length; i++) {
		if (this.lvaluep[i].kind == "scope") {
			res += this.lvaluep[i].generateIndices(ctx, scope) + "." + this.lvaluep[i].observable;
		} else {
			res += "rt.index("+this.lvaluep[i].indexexp.generate(ctx,scope)+")";
		}
		if (i < this.lvaluep.length-1) res += ",";
	}
	res += "]";
	return res;
}

Eden.AST.LValue.prototype.generateIndexList = function(ctx, scope) {
	var res = "[";
	for (var i=0; i<this.lvaluep.length; i++) {
		res += "rt.index("+this.lvaluep[i].indexexp.generate(ctx,scope)+")";
		if (i < this.lvaluep.length-1) res += "][";
	}
	res += "]";
	return res;
}

Eden.AST.LValue.prototype.generateIdStr = function() {
	return "\""+this.generateCompList()+"\"";
}

Eden.AST.LValue.prototype.executeCompList = function(ctx, scope) {
	var res = [];
	for (var i=0; i<this.lvaluep.length; i++) {
		if (this.lvaluep[i].kind == "index") {
			var iexp = this.lvaluep[i].indexexp.generate(ctx, "scope");
			if (this.lvaluep[i].indexexp.doesReturnBound && this.lvaluep[i].indexexp.doesReturnBound()) {
				iexp += ".value";
			}
			res.push(rt.index(eval("(function(context,scope) { return "+iexp+"; })")(eden.root,scope)));
		}
	}
	return res;
}

Eden.AST.LValue.prototype.generate = function(ctx) {
	if (this.name) {
		/*if (ctx && ctx.locals && ctx.locals.list.indexOf(this.name) != -1) {
			this.islocal = true;
			var res = this.name;
			for (var i=0; i<this.lvaluep.length; i++) {
				res += this.lvaluep[i].generate(ctx, "scope");
			}
			return res;
		}
		if (ctx && ctx.params && ctx.params.list.indexOf(this.name) != -1) {
			this.islocal = true;
			var res = this.name;
			for (var i=0; i<this.lvaluep.length; i++) {
				res += this.lvaluep[i].generate(ctx, "scope");
			}
			return res;
		}*/

		return "context.lookup(\"" + this.name + "\")";
	}

	if (this.primary) return this.primary.generate(ctx);
	if (this.express) return "context.lookup("+this.express.generate(ctx, "scope")+")";

	// TODO: Pointer dependencies currently causing huge page redraw problems.
	//if (ctx && ctx.dependencies) {
	//	ctx.dependencies[this.observable] = true;
	//}
}





Eden.AST.LValueComponent = function(kind) {
	this.type = "lvaluecomponent";
	this.errors = [];
	this.kind = kind;
	this.indexexp = undefined;
	this.observable = undefined;
	this.components = undefined;
};

Eden.AST.LValueComponent.prototype.setObservable = function(obs) {
	this.observable = obs;
}

Eden.AST.LValueComponent.prototype.generateIndices = function(ctx, scope) {
	if (this.components === undefined || this.components.length == 0) return "";
	var res = "[";
	for (var i=0; i<this.components.length; i++) {
		res += "rt.index("+this.components[i].indexexp.generate(ctx,scope)+")";
		if (i < this.components.length-1) res += "][";
	}
	res += "]";
	return res;
}

Eden.AST.LValueComponent.prototype.setComponents = function(comps) {
	this.components = comps;
	for (var i=0; i<comps.length; i++) {
		if (comps[i].errors.length > 0) this.errors.push.apply(this.errors, comps[i].errors);
	}
}

Eden.AST.LValueComponent.prototype.index = function(pindex) {
	this.indexexp = pindex;
	this.errors.push.apply(this.errors, pindex.errors);
};

Eden.AST.LValueComponent.prototype.property = function(pprop) {
	this.observable = pprop;
	//this.errors.push.apply(this.errors, pprop.errors);
}

Eden.AST.LValueComponent.prototype.generate = function(ctx) {
	if (this.kind == "index") {
		return "[rt.index("+this.indexexp.generate(ctx)+")]";
	//} else if (this.kind == "property") {
	//	return "[context.lookup(\""+obs+"\").value(scope)[0][1].indexOf(\""+this.observable+"\")+1]";
	}
}

Eden.AST.LValueComponent.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.After = function () {
	this.type = "after";
	this.errors = [];
	this.expression = undefined;
	this.statement = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
}

Eden.AST.After.prototype.setExpression = function(express) {
	this.expression = express;
	if (express.errors.length > 0) {
		this.errors.push.apply(this.errors,express.errors);
	}
}

Eden.AST.After.prototype.setStatement = function(state) {
	this.statement = state;
	if (state.errors.length > 0) {
		this.errors.push.apply(this.errors,state.errors);
	}
}

Eden.AST.After.prototype.generate = function(ctx, scope) {
	if (scope === undefined) scope = "eden.root.scope";
	var statement = "(function() {" + this.statement.generate(ctx, scope)+"})";
	var express = this.expression.generate(ctx,scope);
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		express += ".value";
	}
	return "setTimeout("+statement+", "+express+");\n";
}

Eden.AST.After.prototype.execute = function(root, ctx, base, scope) {
	var statement = "(function() { var scope = eden.root.scope;\n" + this.statement.generate(ctx, "root.scope")+"})";
	setTimeout(eval(statement),this.expression.execute(root,ctx,base,scope));
}

Eden.AST.After.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.After.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Require = function() {
	this.type = "require";
	this.errors = [];
	this.expression = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
}

Eden.AST.Require.prototype.setExpression = function(express) {
	this.expression = express;
	if (express.errors.length > 0) {
		this.errors.push.apply(this.errors,express.errors);
	}
}

Eden.AST.Require.prototype.generate = function(ctx) {
	return "edenUI.loadPlugin("+this.expression.generate(ctx, "scope")+");";
}

Eden.AST.Require.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	edenUI.loadPlugin(this.expression.execute(root, ctx, base, scope));
}

Eden.AST.Require.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Require.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Include = function() {
	this.type = "include";
	this.errors = [];
	this.expression = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
}

Eden.AST.Include.prototype.prepend = function(express) {
	this.expression = express;
	if (express.errors.length > 0) {
		this.errors.push.apply(this.errors,express.errors);
	}
}

Eden.AST.Include.prototype.generate = function(ctx) {
	return "eden.include2("+this.expression.generate(ctx, "scope")+");";
}

Eden.AST.Include.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	root.base.include2(this.expression.execute(root, ctx, base, scope));
}

Eden.AST.Include.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Include.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Import = function() {
	this.type = "import";
	this.errors = [];
	this.path = "";
	this.start = 0;
	this.end = 0;
	this.executed = 0;
	this.options = [];
	this.tag = "default";
}

Eden.AST.Import.prototype.setPath = function(path) {
	this.path = path;
}

Eden.AST.Import.prototype.setTag = function(tag) {
	this.tag = tag;
}

Eden.AST.Import.prototype.addOption = function(opt) {
	if (opt == "local") {
		if (this.options.indexOf("local") >= 0) return true;
		if (this.options.indexOf("remote") >= 0) return false;
		if (this.options.indexOf("rebase") >= 0) return false;
	} else if (opt == "remote") {
		if (this.options.indexOf("local") >= 0) return false;
		if (this.options.indexOf("remote") >= 0) return true;
		if (this.options.indexOf("rebase") >= 0) return false;
	}  else if (opt == "rebase") {
		if (this.options.indexOf("local") >= 0) return false;
		if (this.options.indexOf("remote") >= 0) return false;
		if (this.options.indexOf("rebase") >= 0) return true;
	}  else if (opt == "noexec") {
		if (this.options.indexOf("noexec") >= 0) return true;
		if (this.options.indexOf("force") >= 0) return false;
	}  else if (opt == "force") {
		if (this.options.indexOf("noexec") >= 0) return false;
		if (this.options.indexOf("force") >= 0) return true;
	}

	this.options.push(opt);
	return true;
}

Eden.AST.Import.prototype.generate = function(ctx) {
	return "Eden.Agent.importAgent(\""+this.path+"\");";
}

Eden.AST.Import.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var me = this;
	Eden.Agent.importAgent(this.path, this.tag, this.options, function(ag, msg) {
		if (ag) {
			for (var i=0; i<base.imports.length; i++) {
				if (base.imports[i] === ag) return;
			}
			base.imports.push(ag);
		} else {
			me.executed = 3;
			me.errors.push(new Eden.RuntimeError(base, Eden.RuntimeError.NOAGENT, me, "\""+me.path+"@"+me.tag+"\" does not exist: "+msg));
			if (me.parent) me.parent.executed = 3;
		}
	});
}

Eden.AST.Import.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Import.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Append = function() {
	this.type = "append";
	this.destination = undefined;
	this.index = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
}

Eden.AST.Append.prototype.setDest = function(dest) {
	this.destination = dest;
	if (dest.errors.length > 0) {
		this.errors.push.apply(this.errors, dest.errors);
	}
}

Eden.AST.Append.prototype.setIndex = function(index) {
	this.index = index;
	if (index.errors.length > 0) {
		this.errors.push.apply(this.errors, index.errors);
	}
}

Eden.AST.Append.prototype.generate = function(ctx) {
	var express = this.index.generate(ctx, "scope");
	if (this.index.doesReturnBound && this.index.doesReturnBound()) {
		express += ".value";
	}
	var lvalue = this.destination.generate(ctx);

	if (this.destination.islocal) {
		return lvalue + ".push("+express+");\n";
	} else {
		return lvalue + ".mutate(scope, function(s) { scope.lookup(s.name).value.push("+express+"); }, this);";
	}
}

Eden.AST.Append.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var val = this.index.execute(root,ctx,base, scope);
	if (val instanceof BoundValue) val = val.value;
	root.lookup(this.destination.name).mutate(scope, function(s) {
		s.value().push(val);
	}, undefined);
}

Eden.AST.Append.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Append.prototype.error = fnEdenASTerror;


//------------------------------------------------------------------------------

Eden.AST.Insert = function() {
	this.type = "insert";
	this.destination = undefined;
	this.index = undefined;
	this.value = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
	this.executed = 0;
}

Eden.AST.Insert.prototype.setDest = function(dest) {
	this.destination = dest;
	if (dest.errors.length > 0) {
		this.errors.push.apply(this.errors, dest.errors);
	}
}

Eden.AST.Insert.prototype.setIndex = function(index) {
	this.index = index;
	if (index.errors.length > 0) {
		this.errors.push.apply(this.errors, index.errors);
	}
}

Eden.AST.Insert.prototype.setValue = function(value) {
	this.value = value;
	if (value.errors.length > 0) {
		this.errors.push.apply(this.errors, value.errors);
	}
}

Eden.AST.Insert.prototype.generate = function(ctx) {
	var ix = this.index.generate(ctx, "scope");
	if (this.index.doesReturnBound && this.index.doesReturnBound()) {
		ix += ".value";
	}
	var val = this.value.generate(ctx, "scope");
	if (this.value.doesReturnBound && this.value.doesReturnBound()) {
		val += ".value";
	}
	var lvalue = this.destination.generate(ctx);
	if (this.destination.islocal) {
		return lvalue + ".splice(rt.index("+ix+"), 0, ("+val+"));";
	} else {
		return lvalue + ".mutate(scope, function(s) { scope.lookup(s.name).value.splice(rt.index("+ix+"), 0, ("+val+")); }, this);";
	}
}

Eden.AST.Insert.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var ix = this.index.execute(root,ctx,base,scope);
	var val = this.value.execute(root,ctx,base,scope);
	if (ix instanceof BoundValue) ix = ix.value;
	if (val instanceof BoundValue) val = val.value;
	root.lookup(this.destination.name).mutate(scope, function(s) {
		s.value().splice(ix-1, 0, val);
	}, undefined);
}

Eden.AST.Insert.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Insert.prototype.error = fnEdenASTerror;


//------------------------------------------------------------------------------

Eden.AST.Query = function() {
	this.type = "query";
	this.query = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
	this.attrib = "source";
}

Eden.AST.Query.prototype.setQuery = function(q) {
	this.query = q;
	if (q.errors.length > 0) {
		this.errors.push.apply(this.errors, q.errors);
	}
}

Eden.AST.Query.prototype.setAttribute = function(str) {
	this.attrib = str;
	switch(str) {
	case "source" :
	case "tags" :
	case "active" :
	case "observable" :
	case "dependencies" :
	case "id" :
	case "rid" :
	case "locked": return true;
	default: return false;
	}
}

Eden.AST.Query.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Query.prototype.generate = function(ctx, scope) {
	var res = "Eden.Statement.getSources(Eden.Statement.search(" + this.query.generate(ctx,scope) + "))";
	return res;
}

Eden.AST.Query.prototype.execute = function(root, ctx, base, scope) {

}

Eden.AST.Query.prototype.error = fnEdenASTerror;

//------------------------------------------------------------------------------

Eden.AST.Delete = function() {
	this.type = "delete";
	this.sym = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
	this.executed = 0;
}

Eden.AST.Delete.prototype.setSymbol = function(sym) {
	this.sym = sym;
	if (sym.errors.length > 0) {
		this.errors.push.apply(this.errors, sym.errors);
	}
}

Eden.AST.Delete.prototype.generate = function(ctx) {
	return "";
}

Eden.AST.Delete.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var symbol = root.lookup(this.sym.name);
	if (symbol) {
		if (this.sym.lvaluep.length == 0) {
			if (symbol.garbage) return;
			if (symbol.canSafelyBeForgotten() == false) return;
			symbol.forget();
		} else {
			// Delete an array item
		}
	}
}

Eden.AST.Delete.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Delete.prototype.error = fnEdenASTerror;


//------------------------------------------------------------------------------

Eden.AST.Definition = function(expression) {
	this.type = "definition";
	this.parent = undefined;
	this.errors = expression.errors;
	this.expression = expression;
	this.lvalue = undefined;
	this.start = 0;
	this.end = 0;
	this.dependencies = {};
	this.scopes = [];
	this.backtickCount = 0;
	this.executed = 0;
	this.base = undefined;
};

Eden.AST.Definition.prototype.getParameterByNumber = function(index) {
	if (this.parent && this.parent.getParameterByNumber) {
		return this.parent.getParameterByNumber(index);
	}
	return undefined;
}

Eden.AST.Definition.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};

Eden.AST.Definition.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Definition.prototype.generateDef = function(ctx) {
	var result = "function(context, scope, cache) {\n";
	var express = this.expression.generate(this, "scope", true);

	// Generate array of all scopes used in this definition (if any).
	if (this.scopes.length > 0) {
		//result += "\tvar _scopes = [];\n";
		for (var i=0; i<this.scopes.length; i++) {
			result += "\tvar scope" + (i+1) + " = " + this.scopes[i];
			result += ";\n";
		}
	}

	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		result += "\t var result = "+express+";\n";

		// Save the resulting values scope binding into the cache entry.
		result += "\tif (cache) cache.scope = result.scope;\n";

		// Make sure to copy a value if its an ungenerated one.
		if (this.scopes.length == 0) {
			result += "\treturn edenCopy(result.value);\n}";
		} else {
			result += "\treturn result.value;\n}";
		}
	} else {
		result += "\tif (cache) cache.scope = scope;\n";
		result += "\treturn " + express + ";\n}";
	}

	
	return result;
}

Eden.AST.Definition.prototype.generate = function(ctx) {
	var result = this.lvalue.generate(ctx);
	
	if (this.lvalue.lvaluep.length > 0) {
		result += ".addExtension(this);";
	} else {
		result += ".define(this);";
	}

	return result;

	/*if (this.lvalue.islocal) {
		// TODO Report error, this is invalid;
		return "";
	} else if (this.lvalue.hasListIndices()) {
		var clist = this.lvalue.generateIndexList(this, "scope");
		result += ".addExtension("+this.lvalue.generateIdStr()+", function(context, scope, value) {\n\tvalue";
		result += clist + " = ";
		result += this.expression.generate(this, "scope");

		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			result += ".value";
		}

		var deps = [];
		for (var d in this.dependencies) {
			deps.push(d);
		}

		result = result + ";\n}, undefined, this, "+JSON.stringify(deps);
		result += ");\n";
		return result;
	} else {
	 	result += ".define(" + this.generateDef(ctx);
		var deps = [];
		for (var d in this.dependencies) {
			deps.push(d);
		}
		result = result + ", this, "+JSON.stringify(deps)+");\n";
		return result;
	}*/
};

Eden.AST.Definition.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	//this.base = base;
	//console.log("RHS = " + rhs);
	//var source = base.getSource(this);
	var sym = this.lvalue.getSymbol(root,ctx,base,scope);

	try {
		if (this.lvalue.lvaluep.length > 0) {
			sym.addExtension(this.lvalue.generateIdStr(), this, base);
		} else {
			sym.define(this, base.statid, base);
		}
	} catch(e) {
		var err;
		if (e.message == Eden.RuntimeError.EXTENDSTATIC) {
			err = new Eden.RuntimeError(base, Eden.RuntimeError.EXTENDSTATIC, this, "Can only define list items if the list is defined");
		} else {
			err = new Eden.RuntimeError(base, Eden.RuntimeError.UNKNOWN, this, e);
		}
		this.errors.push(err);
		err.line = base.findStatementLine(this);
		Eden.Agent.emit("error", [base.agent,this.errors[this.errors.length-1]]);
	}
		
}

Eden.AST.Definition.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------


Eden.AST.Range = function(expression) {
	this.type = "range";
	this.parent = undefined;
	this.errors = (expression) ? expression.errors : [];
	this.expression = expression;
	this.lvalue = undefined;
	this.start = 0;
	this.end = 0;
	//this.scopes = [];
	//this.backtickCount = 0;
	//this.executed = 0;
	//this.compiled = undefined;
	//this.dirty = false;
	//this.value = undefined;
	//this.dependencies = {};
	//this.bound = false;
};

Eden.AST.Range.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Range.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};



//------------------------------------------------------------------------------


Eden.AST.Call = function() {
	this.type = "call";
	this.parent = undefined;
	this.errors = [];
	this.funcexp = undefined;
	this.start = 0;
	this.end = 0;
	//this.scopes = [];
	//this.backtickCount = 0;
	//this.executed = 0;
	//this.compiled = undefined;
	//this.dirty = false;
	//this.value = undefined;
	//this.dependencies = {};
	//this.bound = false;
};

Eden.AST.Call.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Call.prototype.generate = function(ctx,scope) {
	
}

Eden.AST.Call.prototype.execute = function(root, ctx, base, scope) {
	//if (this.func === undefined) {
		var fobj = this.funcexp.execute(root,ctx,base,scope,true);
		if (fobj.value !== undefined) {
			var fname = root.lookup("function").value(fobj.scope);
			var obj = root.lookup("object").value(fobj.scope);
			var args = root.lookup("args").value(fobj.scope);
			//console.log("CALLING: " + fname);
			if (typeof fname == "string") {
			this.func = eval(fname);
			} else if (typeof fname == "function") {
				this.func = fname;
			} else {
				// ERROR
			}
			// TODO Check args is list and obj is not undefined.
			this.func.apply(obj,args);
		}
}

Eden.AST.Call.prototype.setFunction = function(express) {
	this.funcexp = express;
	this.errors.push.apply(this.errors,express.errors);
}



//------------------------------------------------------------------------------

Eden.AST.Assignment = function(expression) {
	this.type = "assignment";
	this.parent = undefined;
	this.errors = (expression) ? expression.errors : [];
	this.expression = expression;
	this.lvalue = undefined;
	this.start = 0;
	this.end = 0;
	this.scopes = [];
	this.backtickCount = 0;
	this.executed = 0;
	this.compiled = undefined;
	this.dirty = false;
	this.value = undefined;
	this.dependencies = {};
	this.bound = false;
};

Eden.AST.Assignment.prototype.getParameterByNumber = function(index) {
	if (this.parent && this.parent.getParameterByNumber) {
		var p = this.parent.getParameterByNumber(index);
		//console.log("Param "+index+" = " + p);
		return p;
	}
	return undefined;
}

Eden.AST.Assignment.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Assignment.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};

Eden.AST.Assignment.prototype.generate = function(ctx) {
	var result = this.lvalue.generate(ctx);

	if (this.lvalue.islocal) {
		result += " = ";
		result += this.expression.generate(ctx, "scope");
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			result += ".value";
		}
		result += ";\n";
		return result;
	} else if (this.lvalue.hasListIndices()) {
		result += ".listAssign(";
		result += this.expression.generate(ctx, "scope");
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			result += ".value";
		}
		result += ", scope, this, false, ";
		result += this.lvalue.generateCompList(ctx, "scope");
		result += ");\n";
		return result;
	} else {
		result += ".assign(\n\t";
		result += this.expression.generate(ctx, "scope");
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			result += ".value";
		}
		result += ", scope, this);\n"
		return result;
	}
};



/**
 * Compile the right-hand-side into a javascript function. If already compiled
 * it does nothing.
 */
Eden.AST.Assignment.prototype.compile = function(ctx) {
	if (this.compiled && !this.dirty) return;
	this.dirty = false;

	var rhs = "(function(context,scope) { \n";
	var express = this.expression.generate(this, "scope",true);

	// Generate array of all scopes used in this definition (if any).
	if (this.scopes.length > 0) {
		//rhs += "\tvar _scopes = [];\n";
		for (var i=0; i<this.scopes.length; i++) {
			rhs += "\tvar scope" + (i+1) + " = " + this.scopes[i];
			rhs += ";\n";
		}
	}

	rhs += "return " + express;

	// Remove the scope if a boundValue is returned.
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		//rhs += ".value";
		this.bound = true;
	} else {
		this.bound = false;
	}
	rhs += ";})";

	this.compiled = eval(rhs);
}

Eden.AST.Assignment.prototype.execute = function(root, ctx, base, scope) {
	if (this.expression === undefined) return;
	this.executed = 1;
	this.compile(ctx);

	try {
		var sym = this.lvalue.getSymbol(root,ctx,base,scope);
		if (this.lvalue.hasListIndices()) {
			this.value = this.compiled.call(sym,root,scope);
			sym.listAssign(this.value, scope, base.agent, false, this.lvalue.executeCompList(ctx, scope));
		} else {
			this.value = this.compiled.call(sym,root,scope);
			if (this.bound) {
				sym.assign(this.value.value,scope, base.statid);
				var cache = scope.lookup(sym.name);
				if (cache) cache.scope = this.value.scope;
				if (cache) cache.scopes = this.value.scopes;
			} else {
				sym.assign(this.value,scope, base.statid);
				if (scope) {
					var cache = scope.lookup(sym.name);
					if (cache) cache.scopes = undefined;
				}
			}
		}
	} catch(e) {
		var agentobj = base.agent;
		var err;

		if (/[0-9][0-9]*/.test(e.message)) {
			err = new Eden.RuntimeError(base, parseInt(e.message), this, e.message);
		} else {
			err = new Eden.RuntimeError(base, 0, this, e);
		}

		if (agentobj) {
			err.line = agentobj.findDefinitionLine(this.lvalue.name, base.getSource(this));
		}

		this.errors.push(err);
		if (agentobj) Eden.Agent.emit("error", [agentobj,err]);
		else console.log(err.prettyPrint());
	}
};

Eden.AST.Assignment.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Modify = function(kind, expression) {
	this.type = "modify";
	this.parent = undefined;
	this.errors = (expression) ? expression.errors : [];
	this.kind = kind;
	this.expression = expression;
	this.lvalue = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
	this.scopes = [];
	this.dependencies = {};
	this.compiled = undefined;
};

Eden.AST.Modify.prototype.getParameterByNumber = function(index) {
	if (this.parent && this.parent.getParameterByNumber) {
		return this.parent.getParameterByNumber(index);
	}
	return undefined;
}

Eden.AST.Modify.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Modify.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};

Eden.AST.Modify.prototype.compile = function(ctx) {
	if (this.compiled && !this.dirty) return;
	this.dirty = false;

	var rhs = "(function(context,scope) { \n";
	var express = this.expression.generate(this, "scope",true);

	// Generate array of all scopes used in this definition (if any).
	if (this.scopes.length > 0) {
		//rhs += "\tvar _scopes = [];\n";
		for (var i=0; i<this.scopes.length; i++) {
			rhs += "\tvar scope" + (i+1) + " = " + this.scopes[i];
			rhs += ";\n";
		}
	}

	rhs += "return " + express;

	// Remove the scope if a boundValue is returned.
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		//rhs += ".value";
		this.bound = true;
	} else {
		this.bound = false;
	}
	rhs += ";})";

	this.compiled = eval(rhs);
}

Eden.AST.Modify.prototype.generate = function(ctx,scope) {
	var lval = this.lvalue.generate(ctx);
	var result = lval;
	this.compile(ctx);

	if (this.lvalue.islocal == false) result += ".assign(\n\t";
	else result += " = ";

	var express;
	if (this.expression) {
		express = this.expression.generate(ctx,"scope",true);
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			express += ".value";
		}
	}

	// TODO Convert to rt
	if (this.kind == "+=") {
		result += "rt.addAssign(";
		result += lval;
		if (this.lvalue.islocal == false) result += ".value("+scope+")";
		result += " , " + express + ")";
	} else if (this.kind == "-=") {
		result += lval;
		if (this.lvalue.islocal == false) result += ".value(scope)";
		result += " - " + express;
	} else if (this.kind == "/=") {
		result += lval;
		if (this.lvalue.islocal == false) result += ".value(scope)";
		result += " / " + express;
	} else if (this.kind == "*=") {
		result += lval;
		if (this.lvalue.islocal == false) result += ".value(scope)";
		result += " * " + express;
	} else if (this.kind == "++") {
		result += lval;
		if (this.lvalue.islocal == false) result += ".value(scope)";
		result += "+1";
	} else if (this.kind == "--") {
		result += lval;
		if (this.lvalue.islocal == false) result += ".value(scope)";
		result += "-1";
	}

	if (this.lvalue.islocal == false) {
		result = result + ", scope);\n";
	} else {
		result += ";\n";
	}

	return result;
};

Eden.AST.Modify.prototype.execute = function(root, ctx, base, scope) {
	//var _scopes = [];

	this.executed = 1;
	// TODO: allow this to work on list indices
	var sym = this.lvalue.getSymbol(root,ctx,base);

	if (this.kind == "++") {
		sym.assign(sym.value(scope)+1, scope);
	} else if (this.kind == "--") {
		sym.assign(sym.value(scope)-1, scope);
	} else {
		var rhs = "(function(context,scope) {\n";
		var express = this.expression.generate(this, "scope",true);
		if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
			//express += ".value";
			this.bound = true;
		} else {
			this.bound = false;
		}
		//var rhs = "(function(context,scope) { \n";
		// Generate array of all scopes used in this definition (if any).
		if (this.scopes.length > 0) {
			//rhs += "\tvar _scopes = [];\n";
			for (var i=0; i<this.scopes.length; i++) {
				rhs += "\tvar scope" + (i+1) + " = " + this.scopes[i];
				rhs += ";\n";
			}
		}
		rhs += "return " + express;
		rhs += ";})";

		//var scope = eden.root.scope;
		var context = eden.root;

		//for (var i=0; i<this.scopes.length; i++) {
		//	_scopes.push(eval(this.scopes[i]));
		//}

		this.scopes = [];

		/*console.log(_scopes);
		console.log(this.scopes);*/

		var rhseval;
		try {
			rhseval = eval(rhs).call(ctx,root,scope);
		} catch(e) {
			var agentobj = base.agent;
			var err;

			if (/[0-9][0-9]*/.test(e.message)) {
				err = new Eden.RuntimeError(base, parseInt(e.message), this, e.message);
			} else {
				err = new Eden.RuntimeError(base, 0, this, e);
			}

			if (agentobj) {
				err.line = agentobj.findDefinitionLine(this.lvalue.name, base.getSource(this));
			}

			this.errors.push(err);
			if (agentobj) Eden.Agent.emit("error", [agentobj,err]);
			else console.log(err.prettyPrint());
		}

		if (this.bound) {
			var value = sym.boundValue(scope);
			var cache = scope.lookup(sym.name);
			//if (cache) cache.scope = value.scope;
			if (cache) {
				if (Array.isArray(value.value) && this.kind == "+=") {
					if (cache.scopes === undefined) cache.scopes = [];
					cache.scopes.push(rhseval.scope);
					//console.log(rhseval.scope);
				}
				//cache.scope = scope;
			}
			switch (this.kind) {
			case "+="	: sym.assign(rt.addAssign(value.value, rhseval.value), scope); break;
			case "-="	: sym.assign(rt.subtract(value.value, rhseval.value), scope); break;
			case "/="	: sym.assign(rt.divide(value.value, rhseval.value), scope); break;
			case "*="	: sym.assign(rt.multiply(value.value, rhseval.value), scope); break;
			}
		} else {
			var value = sym.value(scope);
			switch (this.kind) {
			case "+="	: sym.assign(rt.addAssign(sym.value(scope), rhseval), scope); break;
			case "-="	: sym.assign(rt.subtract(sym.value(scope), rhseval), scope); break;
			case "/="	: sym.assign(rt.divide(sym.value(scope), rhseval), scope); break;
			case "*="	: sym.assign(rt.multiply(sym.value(scope), rhseval), scope); break;
			}
		}
	}
}

Eden.AST.Modify.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Subscribers = function() {
	this.type = "subscribers";
	this.errors = [];
	this.list = [];
	this.lvalue = undefined;
	this.start = undefined;
	this.end = undefined;
};

Eden.AST.Subscribers.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};

Eden.AST.Subscribers.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Subscribers.prototype.execute = function(root, ctx, base, scope) {
	
}

Eden.AST.Subscribers.prototype.setList = function(list) {
	this.list = list;
}

Eden.AST.Subscribers.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Primary = function() {
	this.type = "primary";
	this.errors = [];
	this.observable = "";
	this.extras = [];
	this.backtick = undefined;
	this.returnsbound = true;
};

Eden.AST.Primary.prototype.setBackticks = function(backtick) {
	this.backtick = backtick;
	this.errors.push.apply(this.errors, backtick.errors);
};

Eden.AST.Primary.prototype.setObservable = function(obs) {
	this.observable = obs;
}

Eden.AST.Primary.prototype.getObservable = function() {
	return this.observable;
}

Eden.AST.Primary.prototype.doesReturnBound = function() {
	return this.returnsbound;
}

Eden.AST.Primary.prototype.prepend = function(extra) {
	this.extras.unshift(extra);
	if (extra.type == "functioncall") {
		this.returnsbound = false;
	}
	if (extra.errors.length > 0) {
		this.errors.push.apply(this.errors, extra.errors);
	}
};

Eden.AST.Primary.prototype.unparse = function() {
	var res = this.observable;
	for (var i=0; i<this.extras.length; i++) {
		
	}
	return res;
}

Eden.AST.Primary.prototype.generate = function(ctx, scope, bound) {
	// Check if this primary is a local variable.
	if (ctx && ctx.locals && ctx.locals[this.observable]) {
		this.returnsbound = false;
		var res = this.observable;
		for (var i=0; i<this.extras.length; i++) {
			res += this.extras[i].generate(ctx, scope);
		}
		return res;
	}
	// Check if this primary is a parameter.
	if (ctx && ctx.params) {
		var ix = ctx.params.list.indexOf(this.observable);
		if (ix != -1) {
			this.returnsbound = false;
			var res = this.observable;
			for (var i=0; i<this.extras.length; i++) {
				res += this.extras[i].generate(ctx, scope);
			}
			return res;
		}
	}

	var res; // = "context.lookup(";

	if (this.observable == "__BACKTICKS__") {
		var id = 0;
		if (ctx && ctx.backtickCount !== undefined) {
			id = ctx.backtickCount;
			ctx.backtickCount++;
		}
		res = "this.subscribeDynamic(" + id + "," + this.backtick.generate(ctx, scope);
		if (this.backtick.doesReturnBound && this.backtick.doesReturnBound()) {
			res += ".value";
		}
		res += "," + scope + ")";
	} else {
		if (ctx && ctx.dependencies) ctx.dependencies[this.observable] = true;
		res = "context.lookup(\""+this.observable+"\")";
	}

	if (this.extras.length == 0) {
		this.returnsbound = (bound) ? true : false;
		//if (ctx.scopes.length > 0) {
		if (!bound) {
			res += ".value("+scope+")";
		} else  {
			res += ".boundValue("+scope+")";
		}
		//} else {
		//	res += ".boundValue(scope)";
		//}
	} else {
		this.returnsbound = (bound) ? true : false;
		if (!bound) {
			res += ".value("+scope+")";
		} else {
			res += ".boundValue("+scope;
		}

		var i=0;

		if (bound) {
			for (; i<this.extras.length; i++) {
				if (this.extras[i].type != "index") break;
				if (i == 0) res += ",[";
				else res += ",";
				//res += this.extras[i].generate(ctx, scope);
				res += "rt.index("+this.extras[i].expression.generate(ctx, scope)+")";
			}
			if (i > 0) res += "]";
			res += ")";
			if (i < this.extras.length) {
				this.returnsbound = false;
				res += ".value";
			}
		}

		for (; i<this.extras.length; i++) {
			res += this.extras[i].generate(ctx, scope);
		}
	}

	return res;
}

Eden.AST.Primary.prototype.execute = function(root, ctx, base, scope, bound) {
	var rhs = "(function(context,scope) { return ";
	rhs += this.generate(ctx, "scope",bound);
	rhs += ";})";
	return eval(rhs).call(ctx,root,scope);
}

Eden.AST.Primary.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.If = function() {
	this.type = "if";
	this.parent = undefined;
	this.errors = [];
	this.condition = "";
	this.statement = undefined;
	this.elsestatement = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
};

Eden.AST.If.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.If.prototype.setCondition = function(condition) {
	this.condition = condition;
	this.errors.push.apply(this.errors, condition.errors);
};

Eden.AST.If.prototype.setStatement = function(statement) {
	this.statement = statement;
	if (statement) {
		statement.parent = this;
		this.errors.push.apply(this.errors, statement.errors);
	}
};

Eden.AST.If.prototype.setElse = function(statement) {
	this.elsestatement = statement;
	if (statement) {
		statement.parent = this;
		this.errors.push.apply(this.errors, statement.errors);
	}
};

Eden.AST.If.prototype.generate = function(ctx) {
	var res = "if (";
	res += this.condition.generate(ctx, "scope");
	if (this.condition.doesReturnBound && this.condition.doesReturnBound()) {
		res += ".value";
	}
	res += ") ";
	res += this.statement.generate(ctx) + " ";
	if (this.elsestatement) {
		res += "\nelse " + this.elsestatement.generate(ctx) + "\n";
	}
	return res;
}

Eden.AST.If.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var cond = "(function(context,scope) { return ";
	cond += this.condition.generate(ctx, "scope");
	if (this.condition.doesReturnBound && this.condition.doesReturnBound()) {
		cond += ".value";
	}
	cond += ";})";
	if (eval(cond).call(ctx,root,scope)) {
		this.statement.execute(root, ctx, base, scope);
	} else {
		this.executed = 2;
		if (this.elsestatement) {
			return this.elsestatement.execute(root, ctx, base, scope);
		}
	}
}

Eden.AST.If.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Switch = function() {
	this.type = "switch";
	this.parent = undefined;
	this.errors = [];
	this.expression = "";
	this.statement = undefined;
	this.start = 0;
	this.end = 0;
};

Eden.AST.Switch.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Switch.prototype.setExpression = function(expression) {
	this.expression = expression;
	this.errors.push.apply(this.errors, expression.errors);
};

Eden.AST.Switch.prototype.setStatement = function(statement) {
	this.statement = statement;
	this.errors.push.apply(this.errors, statement.errors);
};

Eden.AST.Switch.prototype.generate = function(ctx, scope) {
	if (scope === undefined) scope = "eden.root.scope";
	var res = "switch(";
	res += this.expression.generate(ctx,scope);
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		res += ".value";
	}
	res += ") " + this.statement.generate(ctx,scope);
	return res;
};

Eden.AST.Switch.prototype.execute = function(root, ctx, base, scope) {
	var swi = "(function(context,scope) { ";
	swi += this.generate(ctx, "scope");
	swi += " })";
	eval(swi)(root, scope);
};

Eden.AST.Switch.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.FunctionCall = function() {
	this.type = "functioncall";
	this.parent = undefined;
	this.errors = [];
	this.lvalue = undefined;
	this.params = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
};

Eden.AST.FunctionCall.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.FunctionCall.prototype.setParams = function(params) {
	this.params = params;
	for (var i = 0; i < params.length; i++) {
		this.errors.push.apply(this.errors, params[i].errors);
	}
};

Eden.AST.FunctionCall.prototype.left = function(lvalue) {
	this.lvalue = lvalue;
	if (lvalue.errors.length > 0) {
		this.errors.push.apply(this.errors, lvalue.errors);
	}
};

Eden.AST.FunctionCall.prototype.generate = function(ctx, scope) {
	if (this.lvalue === undefined) {
		var res = "(";
		if (this.params) {
			for (var i=0; i<this.params.length; i++) {
				var express = this.params[i].generate(ctx, scope);
				if (this.params[i].doesReturnBound && this.params[i].doesReturnBound()) {
					express += ".value";
				}
				res += "("+express+")";
				if (i != this.params.length-1) res += ",";
			}
		}
		return res + ")";
	} else {
		var lvalstr = this.lvalue.generate(ctx);
		var res = lvalstr + ".value(scope).call("+lvalstr;
		if (this.params) {
			for (var i=0; i<this.params.length; i++) {
				res += ",";
				var express = this.params[i].generate(ctx, scope);
				if (this.params[i].doesReturnBound && this.params[i].doesReturnBound()) {
					express += ".value";
				}
				res += "("+express+")";
				//if (i != this.params.length-1) res += ",";
			}
		}
		return res + ");";
	}
}

Eden.AST.FunctionCall.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var func = "(function(context,scope) { return " + this.generate(ctx, "scope") + "; })";

	try {
		return eval(func).call(ctx,root,scope);
	} catch(e) {
		this.errors.push(new Eden.RuntimeError(base, Eden.RuntimeError.FUNCCALL, this, e));
		console.error("Details: " + e + "\n" + "Function: " + this.lvalue.name);
	}
}

Eden.AST.FunctionCall.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.DummyStatement = function() {
	this.type = "dummy";
	this.parent = undefined;
	this.errors = [];
	
}

Eden.AST.DummyStatement.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.DummyStatement.prototype.generate = function() {
	return "";
}

Eden.AST.DummyStatement.prototype.execute = function() {
}

Eden.AST.DummyStatement.prototype.error = fnEdenASTerror;




//------------------------------------------------------------------------------

Eden.AST.Action = function() {
	this.type = "action";
	this.parent = undefined;
	this.kindofaction = "touch";
	this.errors = [];
	this.triggers = [];
	this.body = undefined;
	this.name = "";
	this.start = 0;
	this.end = 0;
	this.executed = 0;
};

Eden.AST.Action.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Action.prototype.kind = function(k) {
	this.kindofaction = k;
};

Eden.AST.Action.prototype.setBody = function(body) {
	this.body = body;
	if (body) {
		body.parent = this;
		this.errors.push.apply(this.errors, body.errors);
	}
}

Eden.AST.Action.prototype.generate = function(ctx) {
	var body = this.body.generate(ctx);
	var res = "context.lookup(\""+this.name+"\").define("+body+", {name: \"execute\"})";
	if (this.triggers.length > 0) {
		res += ".observe("+JSON.stringify(this.triggers)+");\n";
	}
	return res;
}

Eden.AST.Action.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;
	var body = this.body.generate(ctx);
	var sym = root.lookup(this.name);
	sym.eden_definition = base.getSource(this);
	if (this.triggers.length > 0) {
		sym.define(eval(body), {name: "execute"}, base).observe(this.triggers);
	} else {
		sym.define(eval(body), {name: "execute"}, base);
	}
}

Eden.AST.Action.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Function = function() {
	this.type = "function";
	this.parent = undefined;
	this.errors = [];
	this.body = undefined;
	this.name = "";
	this.start = 0;
	this.end = 0;
	this.executed = 0;
};

Eden.AST.Function.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Function.prototype.setBody = function(body) {
	this.body = body;
	if (body) {
		body.parent = this;
		this.errors.push.apply(this.errors, body.errors);
	}
}

Eden.AST.Function.prototype.generate = function(ctx) {
	var body = this.body.generate(ctx);
	var res = "context.lookup(\""+this.name+"\").define("+body+", {name: \"execute\"}, []);\n";
	return res;
}

Eden.AST.Function.prototype.execute = function(root,ctx,base,scope) {
	this.executed = 1;
	var body = this.body.generate(ctx);
	var sym = root.lookup(this.name);
	sym.eden_definition = base.getSource(this);	
	sym.define(eval(body), {name: "execute"}, base);
}

Eden.AST.Function.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Return = function() {
	this.type = "return";
	this.parent = undefined;
	this.errors = [];
	this.result = undefined;
	this.start = 0;
	this.end = 0;
};

Eden.AST.Return.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Return.prototype.error = fnEdenASTerror;

Eden.AST.Return.prototype.setResult = function(result) {
	this.result = result;
	this.errors.push.apply(this.errors, result.errors);
}

Eden.AST.Return.prototype.generate = function(ctx) {
	if (this.result) {
		var res = this.result.generate(ctx, "scope");
		if (this.result.doesReturnBound && this.result.doesReturnBound()) {
			res += ".value";
		}
		return "return " + res + ";\n";
	} else {
		return "return;\n";
	}
}



//------------------------------------------------------------------------------

Eden.AST.While = function() {
	this.type = "while";
	this.parent = undefined;
	this.errors = [];
	this.condition = undefined;
	this.statement = undefined;
	this.start = 0;
	this.end = 0;
};

Eden.AST.While.prototype.error = fnEdenASTerror;

Eden.AST.While.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.While.prototype.setCondition = function(condition) {
	this.condition = condition;
	this.errors.push.apply(this.errors, condition.errors);
}

Eden.AST.While.prototype.setStatement = function(statement) {
	this.statement = statement;
	if (statement) {
		this.errors.push.apply(this.errors, statement.errors);
	}
}

Eden.AST.While.prototype.generate = function(ctx) {
	var res = "while (" + this.condition.generate(ctx,"scope");
	if (this.condition.doesReturnBound && this.doesReturnBound()) {
		res += ".value";
	}
	res += ") ";
	res += this.statement.generate(ctx) + "\n";
	return res;
}



//------------------------------------------------------------------------------

Eden.AST.Do = function() {
	this.type = "do";
	this.parent = undefined;
	this.errors = [];
	/*this.condition = undefined;
	this.statement = undefined;*/
	this.name = undefined;
	this.script = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
	this.parameters = [];
};

Eden.AST.Do.prototype.error = fnEdenASTerror;

Eden.AST.Do.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Do.prototype.addParameter = function(express) {
	this.parameters.push(express);
	if (express && express.errors.length > 0) {
		this.errors.push.apply(this.errors, express.errors);
	}
}

Eden.AST.Do.prototype.setScript = function(script) {
	this.script = script;
	if (this.script && this.script.errors.length > 0) {
		this.errors.push.apply(this.errors, script.errors);
	}
}

Eden.AST.Do.prototype.setName = function(name) {
	this.name = name;
}

/*Eden.AST.Do.prototype.setCondition = function(condition) {
	this.condition = condition;
	this.errors.push.apply(this.errors, condition.errors);
}

Eden.AST.Do.prototype.setStatement = function(statement) {
	this.statement = statement;
	if (statement) {
		this.errors.push.apply(this.errors, statement.errors);
	}
}*/



Eden.AST.Do.prototype.generate = function(ctx) {
	/*var res = "do\n";
	res += this.statement.generate(ctx) + "\n";
	res += "while (" + this.condition.generate(ctx,"scope");
	if (this.condition.doesReturnBound && this.doesReturnBound()) {
		res += ".value";
	}
	res += ");";
	return res;*/
	return "";
}


Eden.AST.Do.prototype.execute = function(root,ctx,base,scope) {
	this.executed = 1;

	var script;
	if (this.script) {
		script = this.script;
	} else {
		script = base.getActionByName(this.name);
	}

	if (script) {
		var params = [];
		for (var i=0; i<this.parameters.length; i++) {
			params.push(this.parameters[i].execute(root,ctx,base,scope));
		}
		script.executeReal(root,ctx,base, scope, params);
	} else {
		this.executed = 3;
		this.errors.push(new Eden.RuntimeError(base, Eden.RuntimeError.ACTIONNAME, this, "Action '"+this.name+"' does not exist"));
		if (this.parent) this.parent.executed = 3;
	}
}



//------------------------------------------------------------------------------

Eden.AST.For = function() {
	this.type = "for";
	this.parent = undefined;
	this.errors = [];
	this.sstart = undefined;
	this.condition = undefined;
	this.inc = undefined;
	this.statement = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
};

Eden.AST.For.prototype.error = fnEdenASTerror;

Eden.AST.For.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.For.prototype.setStart = function(start) {
	this.sstart = start;
	if (start) {
		this.errors.push.apply(this.errors, start.errors);
	}
}

Eden.AST.For.prototype.setCondition = function(condition) {
	this.condition = condition;
	if (condition) {
		this.errors.push.apply(this.errors, condition.errors);
	}
}

Eden.AST.For.prototype.setIncrement = function(inc) {
	this.inc = inc;
	if (inc) {
		this.errors.push.apply(this.errors, inc.errors);
	}
}

Eden.AST.For.prototype.setStatement = function(statement) {
	this.statement = statement;
	if (statement) {
		this.errors.push.apply(this.errors, statement.errors);
	}
}

Eden.AST.For.prototype.generate = function(ctx) {
	var res = "for (";
	if (this.sstart) {
		res += this.sstart.generate(ctx) + " ";
	} else res += "; ";
	if (this.condition) {
		res += this.condition.generate(ctx, "scope") + "; ";
	} else res += "; ";
	var incer = this.inc.generate(ctx);
	if (incer.charAt(incer.length-2) == ";") incer = incer.slice(0,-2);
	res += incer + ")\n";
	res += this.statement.generate(ctx);
	return res;
}

Eden.AST.For.prototype.execute = function(root, ctx, base, scope) {
	this.executed = 1;

	if (this.sstart && this.sstart.type == "range") {
		var list = this.sstart.expression.execute(root,ctx,base,scope,true);
		//console.log(list);
		//var bound = this.sstart.expression.doesReturnBound && this.sstart.expression.doesReturnBound();
		var sym = root.lookup(this.sstart.lvalue.name);
		// Error if not a simple lvalue
		if (Array.isArray(list)) {
			for (var i=0; i<list.length; i++) {
				if (list[i] instanceof BoundValue) {
					sym.assign(list[i].value,scope);
					var cache = scope.lookup(sym.name);
					if (cache) cache.scope = list[i].scope;
					//console.log(cache);
				} else {
					sym.assign(list[i],scope);
				}
				this.statement.execute(root,ctx,base,scope);
				if (ctx.tobreak) {
					ctx.tobreak = false;
					break;
				}
			}
		} else if (list instanceof BoundValue) {
			for (var i=0; i<list.value.length; i++) {
				if (list.scopes) {
					sym.assign(list.value[i],scope);
					var cache = scope.lookup(sym.name);
					if (cache) cache.scope = list.scopes[i];
				} else {
					if (list.value[i] instanceof BoundValue) {
						sym.assign(list.value[i].value,scope);
						var cache = scope.lookup(sym.name);
						if (cache) cache.scope = list.value[i].scope;
						//console.log(cache);
					} else {
						sym.assign(list.value[i],scope);
						var cache = scope.lookup(sym.name);
						if (cache) cache.scope = list.scope;
					}
				}
				this.statement.execute(root,ctx,base,scope);
				if (ctx.tobreak) {
					ctx.tobreak = false;
					break;
				}
			}
		}
	} else {
		if (this.sstart) {
			this.sstart.execute(root,ctx,base,scope);
		}

		var express = this.condition.generate(ctx, "scope");
		if (this.condition.doesReturnBound && this.condition.doesReturnBound()) {
			express += ".value";
		}
		var expfunc = eval("(function(context,scope){ return " + express + "; })");

		for (; expfunc(root,scope); this.inc.execute(root,ctx,base,scope)) {
			this.statement.execute(root,ctx,base,scope);
			if (ctx.tobreak) {
				ctx.tobreak = false;
				break;
			}
		}
	}
}



//------------------------------------------------------------------------------

Eden.AST.Default = function() {
	this.type = "default";
	this.parent = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
};

Eden.AST.Default.prototype.error = fnEdenASTerror;

Eden.AST.Default.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Default.prototype.generate = function(ctx, scope) {
	return "default: ";
}



//------------------------------------------------------------------------------

Eden.AST.Case = function() {
	this.type = "case";
	this.parent = undefined;
	this.datatype = "";
	this.literal = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
};

Eden.AST.Case.prototype.setLiteral = function(datatype, literal) {
	this.datatype = datatype;
	this.literal = literal;
}

Eden.AST.Case.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Case.prototype.generate = function(ctx, scope) {
	if (typeof this.literal == "string") {
		return "case \"" + this.literal + "\": "; 
	} else {
		return "case " + this.literal + ": ";
	}
}

Eden.AST.Case.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Continue = function() {
	this.type = "continue";
	this.parent = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
};

Eden.AST.Continue.prototype.error = fnEdenASTerror;

Eden.AST.Continue.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Continue.prototype.generate = function(ctx, scope) {
	return "continue; ";
}



//------------------------------------------------------------------------------

Eden.AST.Break = function() {
	this.type = "break";
	this.parent = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
};

Eden.AST.Break.prototype.error = fnEdenASTerror;

Eden.AST.Break.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Break.prototype.generate = function(ctx, scope) {
	return "break; ";
}

Eden.AST.Break.prototype.execute = function(root,ctx,base,scope) {
	ctx.tobreak = true;
}



//------------------------------------------------------------------------------

Eden.AST.Wait = function() {
	this.type = "wait";
	this.parent = undefined;
	this.errors = [];
	this.start = 0;
	this.end = 0;
	this.delay = undefined;
	this.executed = 0;
	this.compiled_delay = undefined;
};

Eden.AST.Wait.prototype.error = fnEdenASTerror;

Eden.AST.Wait.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Wait.prototype.setDelay = function(delay) {
	this.delay = delay;
	if (delay && delay.errors.length > 0) {
		this.errors.push.apply(this.errors, delay.errors);
	}
}

Eden.AST.Wait.prototype.compile = function(ctx) {
	if (this.delay === undefined) return;
	if (this.compiled_delay) return;
	var source = "(function(context,scope) { return ";
	source += this.delay.generate(ctx, "scope");
	if (this.delay.doesReturnBound && this.delay.doesReturnBound()) {
		source += ".value";
	}
	source += ";})";
	this.compiled_delay = eval(source);
}

Eden.AST.Wait.prototype.generate = function(ctx, scope) {
	return "yield "+this.delay+";";
}



//------------------------------------------------------------------------------

Eden.AST.CodeBlock = function() {
	this.type = "codeblock";
	this.errors = [];
	this.params = undefined;
	this.locals = undefined;
	this.script = undefined;
	this.parent = undefined;
};

Eden.AST.CodeBlock.prototype.error = fnEdenASTerror;

Eden.AST.CodeBlock.prototype.setLocals = function(locals) {
	this.locals = locals;
	this.errors.push.apply(this.errors, locals.errors);
}

Eden.AST.CodeBlock.prototype.setParams = function(params) {
	this.params = params;
	this.errors.push.apply(this.errors, params.errors);
}

Eden.AST.CodeBlock.prototype.setScript = function(script) {
	this.script = script;
	if (script) {
		script.parent = this;
		this.errors.push.apply(this.errors, script.errors);
	}
}

Eden.AST.CodeBlock.prototype.generate = function(ctx) {
	var res = "(function(context, scope) {\n";
	//res += "var lscope = new Scope(context,pscope,[";
	if (this.locals && this.locals.list) {
		for (var i=0; i<this.locals.list.length; i++) {
			//res += "new ScopeOverride(\"" + this.locals.list[i] + "\", undefined)";
			//if (i != this.locals.list.length-1) res += ",";
			res += "var " + this.locals.list[i] + ";\n";
		}
	}
	//res += "]);\n";
	res += "return (function() {\n";
	//res += "var scope = new Scope(context,lscope,[";
	if (this.params && this.params.list) {
		for (var i=0; i<this.params.list.length; i++) {
			//res += "new ScopeOverride(\"" + this.params.list[i] + "\", arguments["+(i)+"])";
			//if (i != this.params.list.length-1) res += ",";
			res += "var " + this.params.list[i] + " = edenCopy(arguments["+i+"]);\n";
		}
	}
	//res += "]);\n";
	res += this.script.generate(this, "scope") + "}); })";
	return res;
}



//------------------------------------------------------------------------------

Eden.AST.When = function() {
	this.type = "when";
	this.errors = [];
	this.expression = undefined;
	this.statement = undefined;
	this.start = 0;
	this.end = 0;
	this.executed = 0;
	this.parent = undefined;
	this.dependencies = {};
	this.active = false;
	this.compiled = undefined;
	this.scope = undefined;
	this.compScope = undefined;
	this.base = undefined;
	//this.scopes = [];
	this.causecount = 0;
	this.locals = {};
	this.triggers = {};
};

Eden.AST.When.prototype.addTrigger = function(d, scope) {
	var trigs = this.triggers[d];
	if (trigs) {
		for (var i=0; i<trigs.length; i++) if (trigs[i].statement === statement) return;
		this.triggers[d].push({scope: scope});
	} else {
		trigs = [{scope: scope}];
		this.triggers[d] = trigs;
	}
}

Eden.AST.When.prototype.setScope = function (scope) {
	this.scope = scope;
}

Eden.AST.When.prototype.subscribeDynamic = function(position, dependency,scope) {
	//console.log(scope);
	this.addTrigger(dependency, scope);
	return eden.root.lookup(dependency);
}

Eden.AST.When.prototype.setExpression = function (express) {
	this.expression = express;
	if (express) {
		this.errors.push.apply(this.errors, express.errors);
	}
}

Eden.AST.When.prototype.setStatement = function (statement) {
	this.statement = statement;
	if (statement) {
		this.errors.push.apply(this.errors, statement.errors);
	}
}

Eden.AST.When.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.When.prototype.generate = function() {
	return "";
}

Eden.AST.When.prototype.compile = function(base) {
	this.base = base;
	var cond = "(function(context,scope) { return ";
	cond += this.expression.generate(this, "scope");
	if (this.expression.doesReturnBound && this.expression.doesReturnBound()) {
		cond += ".value";
	}
	cond += ";})";
	this.compiled = eval(cond);

	// Register with base to be triggered
	for (var d in this.dependencies) {
		this.addTrigger(d);
	}

	if (this.scope && this.compScope === undefined) {
		//try {
			this.compScope = eval("(function (context, scope) { return " + this.scope.generateConstructor(this, "scope") + "; })");
		//} catch(e) {
		//	this.compScope = undefined;
		//}
	}

	// MUST EXECUTE CONDITION TO GENERATE DYNAMIC DEPENDENCIES
	var scope = eden.root.scope;
	if (scope === undefined) return;

	if (this.compScope) {
		try { scope = this.compScope.call(this,eden.root, eden.root.scope) } catch(e) {}
		//scope.causecount = 0;
	}

	if (scope.range) {
		scope.range = false;

		while (true) {
			var cscope = scope.clone();
			this.compiled.call(this,eden.root,cscope);
			if (scope.next() == false) break;
		}

		scope.range = true;
	} else {
		this.compiled.call(this,eden.root,scope);
	}

	return "";
}

Eden.AST.When.prototype.execute = function(root, ctx, base, scope) {
	if (this.active) return;
	this.active = true;
	this.executed = 1;
	//this.compile(base);
	this.causecount = 0;
	//console.log("ACTIVATING WHEN");

	if (scope === undefined || scope === eden.root.scope) {
		scope = eden.root.scope;
		if (this.compScope) {
			scope = this.compScope.call(this,root, root.scope);
			//scope.causecount = 0;
		}
	} else {
	}

	if (scope.range) {
		scope.range = false;

		while (true) {
			var cscope = scope.clone();
			//console.log(cscope);
			if (this.compiled.call(this,root,cscope)) {
				this.statement.execute(root, this, base, cscope);
			} else {
				this.executed = 2;
			}
			if (scope.next() == false) break;
		}

		scope.range = true;
	} else {
		if (this.compiled(root,scope)) {
			this.statement.execute(root, this, base, scope);
		} else {
			this.executed = 2;
		}
	}

	this.active = false;
}

Eden.AST.When.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.LList = function() {
	this.type = "lvaluelist";
	this.errors = [];
	this.llist = [];
};

Eden.AST.LList.prototype.append = function(lvalue) {
	this.llist.push(lvalue);
	this.errors.push.apply(this.errors, lvalue.errors);
};

Eden.AST.LList.prototype.error = fnEdenASTerror;



//------------------------------------------------------------------------------

Eden.AST.Declarations = function() {
	this.type = "declarations";
	this.errors = [];
	this.list = [];
	this.end = 0;
	this.start = 0;
};

Eden.AST.Declarations.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Declarations.prototype.error = fnEdenASTerror;

Eden.AST.Declarations.prototype.generate = function(ctx, scope) {
	var res = "var ";
	for (var i=0; i<this.list.length; i++) {
		res += this.list[i];
		if (i < this.list.length-1) res += ",";
		ctx.locals[this.list[i]] = true;
	}
	return res + ";\n";
}



//------------------------------------------------------------------------------

Eden.AST.Script = function() {
	this.type = "script";
	this.name = undefined;
	this.parent = undefined;
	this.errors = [];
	this.statements = [];
	this.start = 0;
	this.end = 0;
	this.executed = 0;
	this.active = false;
	this.parameters = undefined;
	this.locals = undefined;
	this.dependencies = {};
};

Eden.AST.Script.prototype.setLocals = function(locals) {
	this.locals = locals;
	if (locals) {
		this.errors.push.apply(this.errors, locals.errors);
	}
}

Eden.AST.Script.prototype.subscribeDynamic = function(ix,name) {
	console.log("SUBDYN: " + name);
	return eden.root.lookup(name);
}

Eden.AST.Script.prototype.getParameterByNumber = function(index) {
	if (this.parameters) {
		return this.parameters[index-1];
	}
	return undefined;
}

Eden.AST.Script.prototype.error = fnEdenASTerror;

Eden.AST.Script.prototype.setName = function(name) {
	this.name = name;
}

Eden.AST.Script.prototype.setSource = function(start, end) {
	this.start = start;
	this.end = end;
}

Eden.AST.Script.prototype.append = function (ast) {
	this.statements.push(ast);
	if (ast.errors.length > 0) {
		this.errors.push.apply(this.errors, ast.errors);
	}
}

Eden.AST.Script.prototype.executeReal = function(root, ctx, base, scope, parameters, cb) {
	if (this.active) return;
	this.active = true;
	var gen = this.executeGenerator(root,ctx,base, scope, parameters, cb);
	runEdenAction.call(base,this, gen);
}

Eden.AST.Script.prototype.executeGenerator = function*(root, ctx, base, scope, parameters, cb) {
	this.executed = 1;
	for (var i = 0; i < this.statements.length; i++) {
		if (this.statements[i].type == "wait") {
			this.statements[i].executed = 1;
			this.statements[i].compile(ctx);
			if (this.statements[i].compiled_delay) {
				yield this.statements[i].compiled_delay(root,scope);
			} else {
				yield 0;
			}
		} else if (this.statements[i].type == "return") {
			break;
		} else if (this.statements[i].type == "import") {
			yield this.statements[i];
		} else {
			this.parameters = parameters;
			// Only execute statement if it isn't a script.
			if (this.statements[i].type != "script")
				this.statements[i].execute(root,this, base, scope);
		}

		if (this.statements[i].errors.length > 0) {
			this.errors.push.apply(this.errors, this.statements[i].errors);
		}
	}

	if (cb) cb();
}

function runEdenAction(source, action) {
	var me = this;

	if (action === undefined) {
		source.active = false;
	}
	var delay = action.next();
	//console.log("RunAction: " + delay.value);
	if (delay.done == false) {
		if (typeof delay.value == "object") {
			if (delay.value.type == "import") {
				delay.value.executed = 1;
				Eden.Agent.importAgent(delay.value.path, delay.value.tag, delay.value.options, function(ag) {
					if (ag) {
						var already = false;
						// Check to see if already imported to local scope...
						for (var i=0; i<me.imports.length; i++) {
							if (me.imports[i] === ag) {
								already = true;
								break;
							}
						}
						// If not, import it.
						if (!already) me.imports.push(ag);
					}

					// Continue execution.
					runEdenAction.call(me,source, action);
				});
			}
		} else if (delay.value == 0) {
			runEdenAction.call(this,source, action);
		} else if (delay.value > 0) {
			setTimeout(function() {runEdenAction.call(me, source, action)}, delay.value);
		}
	} else {
		source.active = false;
	}
}

Eden.AST.Script.prototype.execute = function(root, ctx, base, scope, cb) {
	// Un named actions execute immediately.
	//if (this.name === undefined) {
		this.executeReal(root,ctx,base, scope, undefined, cb);
	//} else {
		// Add this named script to a local symbol table.
		//base.scripts[this.name] = this;
		//console.log("Added script: " + this.name);
	//}
}

Eden.AST.Script.prototype.generate = function(ctx, scope) {
	var result = "{\n";
	for (var i = 0; i < this.statements.length; i++) {
		result = result + this.statements[i].generate(ctx, scope);
	}
	result = result + "}";
	return result;
}


