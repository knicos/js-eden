/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

//data types
Point = function(x, y) {
  this.x = x;
  this.y = y;
}
Point.prototype.toString = function() {
  return "{" + Eden.edenCodeForValue(this.x) + ", " + Eden.edenCodeForValue(this.y) + "}";
};
Point.prototype.getEdenCode = Point.prototype.toString;

// functions to act in the same way as EDEN operators
var rt = {
	scopebreakout: function(list, breakout, scope) {
		if (!breakout) return list;

		var scopes = [];
		var values = [];
		for (var i=0; i<list.length; i++) {
			if (list[i] instanceof BoundValue) {
				if (list[i].scope !== scope && list[i].scope.parent) scopes.push(list[i].scope);
				values.push(list[i].value);
			} else {
				//scopes.push(scope);
				values.push(list[i]);
			}
		}

		return new BoundValue(values, scope, (scopes.length == values.length && scopes.length > 0) ? scopes : undefined);
	},

	index: function (ix) {
		var type = typeof ix;
		if (type == "number") {
			return ix-1;
		} else {
			return ix;
		}
	},

	length: function (value) {
		if (value === null || value === undefined) {
			return undefined;
		}
		return value.length;
	},

	equal: function (a, b) {
		var i;

		if (a === b) {
			return true;
		}

		if (a instanceof Array && b instanceof Array) {
			if (a.length !== b.length) {
				return false;
			}

			for (i = 0; i < a.length; ++i) {
				if (!rt.equal(a[i], b[i])) {
					return false;
				}
			}

			return true;
		}

		return false;
	},

	addAssign: function(l, r) {
		if (Array.isArray(l)) {
			l.push(r);
			return l;
		} else {
			return l + r;
		}
	},

	addbound: function(a, b) {
		if (a.value === undefined || b.value === undefined) {
			return a;
		} else if (Array.isArray(a.value) || typeof a.value == "string") {
			if (a.scopes && b.scopes) {
				return new BoundValue(rt.concat(a.value,b.value), eden.root.scope, rt.concat(a.scopes, b.scopes));
			}
			return new BoundValue(rt.concat(a.value,b.value), eden.root.scope);
		} else {
			return new BoundValue(a.value + b.value, eden.root.scope);
		}
	},

	add: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		} else if (Array.isArray(a) || typeof a == "string") {
			return rt.concat(a,b);
		} else if (a instanceof Point) {
			return new Point(a.x + b.x, a.y + b.y);
		} else {
			return a + b;
		}
	},

	subtract: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		} else if (a instanceof Point) {
			return new Point(a.x - b.x, a.y - b.y);
		} else {
			return a - b;
		}
	},

	multiply: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		}
		return a * b;
	},

	divide: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		}
		return a / b;
	},

	mod: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		}
		return a % b;
	},

	pow: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		}
		return Math.pow(a, b);
	},

	concat: function (a, b) {
		if (a === undefined || b === undefined) {
			return undefined;
		} else if (Array.isArray(a)) {
			if (Array.isArray(b)) {
				return a.concat(b);
			} else {
				//eden.error(new Error(
				throw new Error(Eden.RuntimeError.LEFTCONCAT);
				return a;
			}
		} else if (Array.isArray(b)) {
			//eden.error(new Error(
			throw new Error(Eden.RuntimeError.RIGHTCONCAT);
			return a + JSON.stringify(b);
		} else {
			return String(a) + b;
		}
	},

	regExpMatch: function (subject, pattern) {
		if (subject === undefined || pattern === undefined) {
			return undefined;
		} else if (pattern instanceof RegExp) {
			return pattern.test(subject);
		} else {
			return (new RegExp(pattern)).test(subject);
		}
	},
	
	regExpNotMatch: function (subject, pattern) {
		if (subject === undefined || pattern === undefined) {
			return undefined;
		} else if (pattern instanceof RegExp) {
			return !pattern.test(subject);
		} else {
			return !(new RegExp(pattern)).test(subject);
		}
	},

	union: function(a,b) {
		if (!(Array.isArray(a) && Array.isArray(b))) return [];
		var temp = {};
		for (var i=0; i<a.length; i++) {
			temp[a[i]] = true;
		}
		var result = [];
		for (var i=0; i<b.length; i++) {
			if (temp[b[i]]) result.push(b[i]);
		}
		return result;
	}

};

this.rt = rt;

// expose as node.js module
if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
	exports.rt = rt;
}
