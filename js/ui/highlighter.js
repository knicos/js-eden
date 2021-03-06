/*
 * Copyright (c) 2015, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

(function (global) {

	var edenSpecials = {
	"this": true,
	"from": true,
	"has": true,
	"self": true
	};

	var edenValues = {
	"true": true,
	"false": true
	};

	var jskeywords = {
	"var": true,
	"if": true,
	"while": true,
	"typeof": true,
	"this": true,
	"function": true,
	"return": true,
	"else": true,
	"break": true,
	"continue": true,
	"switch": true,
	"for": true,
	"prototype": true
	}



	/**
	 * Support function to detach and reattach a DOM node. Alternative to using
	 * jQuery.
	 */
	function detach(obj, node, async, fn) {
		var parent = node.parentNode;
		var next = node.nextSibling;
		// No parent node? Abort!
		if (!parent) { fn.call(obj,node); return; }
		// Detach node from DOM.
		parent.removeChild(node);
		// Handle case where optional `async` argument is omitted.
		if (typeof async !== "boolean") {
		fn = async;
		async = false;
		}
		// Note that if a function wasn't passed, the node won't be re-attached!
		if (fn && async) {
		// If async == true, reattach must be called manually.
		fn.call(obj,node, reattach);
		} else if (fn) {
		// If async != true, reattach will happen automatically.
		fn.call(obj,node);
		reattach();
		}
		// Re-attach node to DOM.
		function reattach() {
		parent.insertBefore(node, next);
		}
	}



	/**
	 * Syntax highlighting class. Make an instance of this, giving a DIV
	 * element for the generated output.
	 */
	EdenUI.Highlight = function(output) {
		this.ast = undefined;
		this.outelement = output;
		this.line = 1;
		this.currentline = -1;
		this.mode = 0;
		this.mode_at_line = {};
	}

	EdenUI.Highlight.isMissing = function(str) {
		return eden.root.symbols[str] === undefined;
	}

	EdenUI.Highlight.isType = function(str) {
		return /[A-Z]/.test(str.charAt(0)) && eden.root.symbols[str];
	}

	EdenUI.Highlight.isConstant = function(str) {
		return eden.root.symbols[str] && (eden.root.symbols[str].definition === undefined || eden.root.symbols[str].definition.deps.length == 0);
		//return edenValues[str] || (/^[A-Z][A-Z0-9]*$/.test(str) && eden.root.symbols[str] && eden.root.symbols[str].definition === undefined);
	}

	EdenUI.Highlight.isLibrary = function(str) {
		var sym = eden.root.symbols[str];
		if (!sym) return false;
		if (sym.statid === undefined) return false
		var stat = Eden.Statement.statements[sym.statid];
		if (!stat || !stat.statement || !stat.statement.doxyComment) return false;
		return stat.statement.doxyComment.hasTag("#library");
	}



	/**
	 * Choose what kind of line this should be, current line, an error, a comment
	 * or just a plain line. Returns the CSS class(es) needed.
	 */
	function generateLineClass(source, stream, linestart, lineerror, position) {
		var className = "";
		if (position >= linestart && position <= stream.position) {
			if (lineerror) {
				className = "eden-currentline eden-errorline";
			} else {
				className = "eden-currentline";
			}
		} else {
			if (lineerror) {
				className = "eden-line eden-errorline";
			} else {
				if (stream.code.charAt(linestart) == "/") {
					className = "eden-commentline";
				} else {
					className = "eden-line";
				}
			}
		}
		//console.log(source.ast.lines[source.line-1]);
		if (source.ast.lines[source.line-1]) {
			if (source.ast.lines[source.line-1].executed == 1) {
				className += " eden-executedline";
			} else if (source.ast.lines[source.line-1].executed == 2) {
				className += " eden-guardedline";
			}
		} else if (source.ast.lines[source.line-1] === undefined && source.line-1 > 0 && source.ast.lines[source.line-1-1] && source.ast.lines[source.line-1-1].parent) {
			if (source.ast.lines[source.line-1-1].executed == 1) {
				className += " eden-executedline";
			} else if (source.ast.lines[source.line-1-1].executed == 2) {
				className += " eden-guardedline";
			}
		}
		return className;
	}



	/**
	 * Highlight a single line but not including the containing line div.
	 */
	EdenUI.Highlight.prototype.highlightLine = function(ast, position) {
		var errstart = -1;
		var errend = -1;
		var errmsg = "";
		var inerror = false;
		var stream = ast.stream;
		var lineerror = false;
		var linestart = 0;
		var token = "INVALID";
		var prevtoken = "INVALID";

		var linestack = [];

		// Set the mode for this line based upon mode at end of previous line
		if (this.mode_at_line[this.line-1]) this.mode = this.mode_at_line[this.line-1];
		else this.mode = 0;

		// Get error position information
		if (ast.script && ast.script.errors.length > 0) {
			errstart = ast.script.errors[0].prevposition;
			errend = ast.script.errors[0].position;
			errmsg = ast.script.errors[0].messageText();
		}

		var wsline = "";

		var line = document.createElement('span');

		while (true) {
			if (this.mode == 6) {
				this.mode = 0;
				line = linestack.pop();
			}

			// Do we need to insert a caret between tokens?
			if (stream.position == position) {
				if (wsline != "") {
					// Insert any whitespace before the caret
					var textnode = document.createTextNode(wsline);
					line.appendChild(textnode);
					wsline = "";
				}
				// Caret!
				var caret = document.createElement('span');
				caret.className = "fake-caret";
				line.appendChild(caret);
			}

			// Skip but preserve white space
			var ch= stream.peek();
			if (ch == 10) {
				if (wsline != "") {
					var textnode = document.createTextNode(wsline);
					line.appendChild(textnode);
					wsline = "";
				}
				break;
			} else if (ch == 9 || ch == 13 || ch == 32 || ch == 160) {
				stream.skip();
				if (ch == 32 || ch == 160) {
					wsline += " ";
				} else if (ch != 13) {
					wsline += String.fromCharCode(ch);
				}
				continue;
			}

			// End of whitespace, so add it to the line
			if (wsline != "") {
				// Import path group mode needs ending
				if (this.mode == 8) {
					line = linestack.pop();
					this.mode = 1;
				}
				var textnode = document.createTextNode(wsline);
				line.appendChild(textnode);
				wsline = "";
			}

			prevtoken = token;
			token = stream.readToken();

			if (typeof token != "string") {
				console.error("Token error: line = " + this.line + " position = " + stream.position);
			}

			if (token == "EOF") {
				if (wsline != "") {
					// Add any trailing whitespace
					var textnode = document.createTextNode(wsline);
					line.appendChild(textnode);
					wsline = "";
				}
				break;
			}
			if (token == "INVALID") {
				console.log("INVALID: " + stream.peek());
				stream.skip();
				continue;
			}


			var type = stream.tokenType(token);
			var classes = "";
			var tokentext = stream.tokenText();

			// Is this token inside the error if there is one?
			if (errstart != -1) {
				if (errstart <= stream.prevposition && !inerror) {
					inerror = true;
				}
				if (errend <= stream.prevposition && inerror) {
					inerror = false;
				}
				if( inerror) lineerror = true;
			}
			if (inerror && ast.script.errors[0].token != "EOF") {
				classes += "eden-error ";
			}

			if (this.mode == 0 || this.mode == 5) {
				if (token == "//") {
					classes += "eden-comment";
					var comment = "";
					while (stream.valid() && stream.peek() != 10) {
						comment += String.fromCharCode(stream.get());
					}
					tokentext = "//" + comment;
				} else if (token == "local" || token == "auto" || token == "para") {
					classes += "eden-storage";
				} else if (type == "keyword") {
					classes += "eden-keyword";
					if (stream.data.value == "import") {
						this.mode = 7;
					}
				} else if (token == "?") {
					this.mode = 9;
					linestack.push(line);
					var nline = document.createElement("span");
					nline.className = "eden-backticks";
					line.appendChild(nline);
					line = nline;
				} else if (token == "NUMBER") {
					classes += "eden-number";
				} else if (token == "STRING") {
					classes += "eden-string";
				} else if (token == "CHARACTER") {
					classes += "eden-string";
				} else if (token == "BOOLEAN") {
					classes += "eden-constant";	
				} else if (token == "OBSERVABLE") {
					// Get multi word observable
					var obs = stream.data.value;
					var pos = stream.position;
					while (stream.readToken() == "OBSERVABLE") {
						pos = stream.position;
						obs += " " + stream.data.value;
					}
					stream.data.value = obs;
					tokentext = obs;
					stream.position = pos;

					if (EdenUI.Highlight.isConstant(stream.data.value)) {
						classes += "eden-constant eden-observable";
					} else if (EdenUI.Highlight.isType(stream.data.value)) {
						classes += "eden-type eden-observable";
					} else if (EdenUI.Highlight.isLibrary(stream.data.value)) {
						classes += "eden-function eden-observable";
					} else if (edenSpecials[stream.data.value]) {
						classes += "eden-special eden-observable";
					} else if (EdenUI.Highlight.isMissing(stream.data.value)) {
						classes += "eden-missing eden-observable";
					} else {
						classes += "eden-observable";
					}
				} else if (token == "`") {
					if (this.mode == 5) {
						this.mode = 6;
					} else {
						this.mode = 5;
						linestack.push(line);
						var nline = document.createElement("span");
						nline.className = "eden-backticks";
						line.appendChild(nline);
						line = nline;
					}
				} else if (token == "${{") {
					classes += "eden-javascript";
					this.mode = 4;
				} else {
					// Bind negative to number if no whitespace.
					if (token == "-" && stream.isNumeric(stream.peek())) {
						token = stream.readToken();
						tokentext = "-" + stream.tokenText();
						classes += "eden-number";
					} else if (token == "/*") {
						this.mode = 2;
						classes += "eden-comment";
					} else {
						classes += "eden-operator";
					}
				}
			// Import path and options
			} else if (this.mode == 1 || this.mode == 7 || this.mode == 8) {
				if (this.mode == 7) {
					linestack.push(line);
					var nline = document.createElement("span");
					nline.className = "eden-pathblock";
					line.appendChild(nline);
					line = nline;
					this.mode = 8;
				}
				if (token == ";") {
					if (this.mode == 8) line = linestack.pop();
					this.mode = 0;
					classes += "eden-operator";
				} else if (Language.importoptions[stream.data.value]) {
					classes += "eden-importopt";
				} else {
					classes += "eden-path";
				}
			} else if (this.mode == 2) {
				if (token == "*/") {
					this.mode = 0;
					classes += "eden-comment";
				} else if (token == "@") {
					this.mode = 3;
					classes += "eden-doxytag";
				} else if (token == "#") {
					this.mode = 33;
					classes += "eden-doxytag";
				} else {
					classes += "eden-comment";
				}
			} else if (this.mode == 3) {
				this.mode = 2;
				if (Language.doxytags[stream.data.value]) {
					classes += "eden-doxytag";
				} else {
					classes += "eden-doxytagerror";
				}
			} else if (this.mode == 33) {
				this.mode = 2;
				//if (Language.doxytags[stream.data.value]) {
					classes += "eden-doxytag";
				//} else {
				//	classes += "eden-doxytagerror";
				//}
			} else if (this.mode == 4) {
				if (token == "OBSERVABLE" || type == "keyword") {
					if (jskeywords.hasOwnProperty(stream.data.value)) {
						classes += "eden-javascript-bold";
					} else {
						classes += "eden-javascript";
					}
				} else {
					classes += "eden-javascript";
				}
				if (token == "}}$") {
					this.mode = 0;
				}
			} else if (this.mode == 9) {
				if (token == ":") this.mode = 91;
			} else if (this.mode == 91) {
				if (token == "OBSERVABLE") {
					switch (stream.data.value) {
					case "source": classes += "eden-qattrib"; break;
					default: classes += "eden-qattriberror";
					}
				}
				this.mode = 6;
			}

			// Insert caret in middle of token if needed
			if (stream.prevposition < position && stream.position > position) {
				var caret = position - stream.prevposition;
				var textleft = tokentext.slice(0,caret);
				var textright = tokentext.slice(caret);

				// Left text
				var parentspan = document.createElement('span');
				parentspan.className = classes;
				if (classes.indexOf("eden-observable") != -1) {
					parentspan.setAttribute("data-observable", tokentext);
				}

				var tokenspan = document.createElement('span');
				//tokenspan.className = classes;
				//tokenspan.setAttribute("data-split", "true");
				/*if (classes == "eden-observable") {
					tokenspan.setAttribute("data-observable", tokentext);
				}*/
				tokenspan.appendChild(document.createTextNode(textleft));
				parentspan.appendChild(tokenspan);

				// Caret!
				var caret = document.createElement('span');
				caret.className = "fake-caret";
				parentspan.appendChild(caret);

				// Right text
				tokenspan = document.createElement('span');
				/*tokenspan.className = classes;
				tokenspan.setAttribute("data-split", "true");
				if (classes == "eden-observable") {
					tokenspan.setAttribute("data-observable", tokentext);
				}*/
				tokenspan.appendChild(document.createTextNode(textright));
				parentspan.appendChild(tokenspan);

				line.appendChild(parentspan);
			} else {
				var tokenspan = document.createElement('span');
				tokenspan.className = classes;
				if (classes.indexOf("eden-observable") != -1) {
					tokenspan.setAttribute("data-observable", tokentext);
				}
				tokenspan.appendChild(document.createTextNode(tokentext));
				line.appendChild(tokenspan);
			}
		}

		// Just in case of error
		if (linestack.length > 0) {
			line = linestack[0];
			this.mode = 0;
		}

		this.mode_at_line[this.line] = this.mode;
		return line;
	}



	/**
	 * Generate a syntax highlighted version of the stream. Call this with
	 * an abstract syntax tree of the code, the line to highlight (or -1 for
	 * all) and the current cursor position.
	 */
	EdenUI.Highlight.prototype.highlight = function(ast, hline, position, statement) {
		this.ast = ast;
		this.line = 1;

		var errstart = -1;
		var errend = -1;
		var errmsg = "";
		var inerror = false;
		var stream = ast.stream;
		var title = "";

		if (this.outelement === undefined) return;

		if (ast.stream.code.length == 0) {
			if (this.outelement) {
				this.outelement.innerHTML = "<div class='eden-line'><span class='fake-caret'></span></div>";
			}
			return;
		}

		if (ast.script && ast.script.errors.length > 0) {
			errstart = ast.script.errors[0].prevposition;
			errend = ast.script.errors[0].position;
			errmsg = ast.script.errors[0].messageText();
		}

		stream.reset();

		if (statement) {
			stream.position = statement.start;
		}

		var line = undefined;
		var lineerror = false;
		var linestart = 0;
		var token = "INVALID";
		var prevtoken = "INVALID";

		// Highlight all if -1
		if (hline == -1 ) {
			detach(this, this.outelement, false, function() {

			// Clear!
			this.outelement.innerHTML = "";
			this.mode_at_line = {};

			while (stream.valid()) {
				var ch= stream.peek();
				var lineclass = "";
				if (ch == 10) {
					lineerror = (linestart <= errstart) && (stream.position >= errend);

					var lineelement = document.createElement('div');
					lineelement.className = "eden-line";
					lineelement.setAttribute("data-line",this.line-1);
					//lineelement.className = generateLineClass(this, stream, linestart,lineerror,position);
					this.line++;
					if (line !== undefined) {
						lineelement.appendChild(line);
					} else {
						this.mode_at_line[this.line-1] = this.mode;
					}
					var blank = document.createTextNode("\n");
					lineelement.appendChild(blank);

					this.outelement.appendChild(lineelement);

					linestart = stream.position+1;
					line = undefined;
					stream.skip();
					continue;
				}
				line = this.highlightLine(ast, position);
			}

			lineerror = (linestart <= errstart) && (stream.position >= errend);

			if (line !== undefined) {
				var lineelement = document.createElement('div');
				lineelement.className = "eden-line";
				lineelement.setAttribute("data-line",this.line-1);
				//lineelement.className = generateLineClass(this, stream, linestart,lineerror,position);
				lineelement.appendChild(line);
				this.outelement.appendChild(lineelement);
			} else {
				var lineelement = document.createElement('div');
				if (position >= stream.position) {
					lineelement.className = "eden-line";
					lineelement.setAttribute("data-line",this.line-1);
					var caret = document.createElement('span');
					caret.className = "fake-caret";
					lineelement.appendChild(caret);
				} else {
					lineelement.className = "eden-line";
				}
				this.outelement.appendChild(lineelement);
			}

			});  // End detach
		} else {
			// Skip until the lines we are looking for
			while (stream.valid() && (this.line < (hline-1))) {
				var ch = stream.peek();
				if (ch == 10) {
					this.line++;
				}
				stream.skip();
			}

			// Highlight 3 lines, 1 before and after what we want
			for (var i=2; i>=0; i--) {
				this.line = hline-i+1;
				var node = this.outelement.childNodes[hline-i];
				if (node !== undefined) {
					//Remove existing content
					while (node.firstChild) node.removeChild(node.firstChild);

					linestart = stream.position;
					line = this.highlightLine(ast, position);
					lineerror = (linestart <= errstart) && (stream.position >= errend);
					//node.className = generateLineClass(this, stream, linestart,lineerror,position);
					node.appendChild(line);
					var blank = document.createTextNode("\n");
					node.appendChild(blank);
					stream.skip();
				}
			}

			// Now check for dirty lines to change line class
			/*console.log(ast.lines);
			for (var i=0; i<this.outelement.childNodes.length; i++) {
				if (ast.lines[i]) {
					if (ast.lines[i].executed == 1) {
						this.outelement.childNodes[i].className = "eden-line eden-executedline";
					} else if (ast.lines[i].executed == 2) {
						this.outelement.childNodes[i].className = "eden-line eden-guardedline";
					} else if (ast.lines[i].errors.length > 0) {
						this.outelement.childNodes[i].className += " eden-errorblock";
					}
				} else if (ast.lines[i] === undefined && i > 0 && ast.lines[i-1] && ast.lines[i-1].parent) {
					if (ast.lines[i-1].executed == 1) {
						this.outelement.childNodes[i].className = "eden-line eden-executedline";
					} else if (ast.lines[i-1].executed == 2) {
						this.outelement.childNodes[i].className = "eden-line eden-guardedline";
					} else if (ast.lines[i-1].errors.length > 0) {
						this.outelement.childNodes[i].className += " eden-errorblock";
					}
				}
			}*/
		}
	};

	EdenUI.Highlight.html = function(str) {
		var dummy = document.createElement("span");
		var hlighter = new EdenUI.Highlight(dummy);
		hlighter.ast = {stream: new EdenStream(str)};
		hlighter.highlight(hlighter.ast,-1,-1,undefined);
		return dummy.childNodes[0].innerHTML;
	}
}(typeof window !== 'undefined' ? window : global));
