Language.addKeywords( {
	"funk": "func",
	"akcja": "proc",
	"para": "para",
	"lokalny": "local",
	"jeżeli": "if",
	"jest": "is",
	"inaczej": "else",
	"eval": "eval",
	"dla": "for",
	"podczasgdy": "while",
	"wykonaj": "do",
	"wybierz": "switch",
	"wprzypadku": "case",
	"domyślny": "default",
	"przerwij": "break",
	"kontynuuj": "continue",
	"zwróć": "return",
	"gdy": "when",
	"uwzględnij": "include",
	"wstaw": "insert",
	"dopisznakońcu": "append",
	"usuń": "delete",
	"wymaga": "require",
	"po": "after",
	"przesuń": "shift",
	"gdzie" : "with",
	"akcja": "action",
	"import": "import"
});

Language.addSymbols( {
	"int": "int",
	"str": "str",
	"zaokrąglić": "round",
	"min": "min",
	"max": "max",
	"przypadkowa": "random",
	"dół": "floor",
	"góra": "ceil",
	"abs": "abs",
	"acos": "acos",
	"asin": "asin",
	"atan": "atan",
	"cos": "cos",
	"exp": "exp",
	"ln": "ln",
	"log": "log",
	"mod": "mod",
	"przypadkowaCałkowita": "randomInteger",
	"przypadkowaFloat": "randomFloat",
	"sin": "sin",
	"sqrt": "sqrt",
	"suma": "sum",
	"tan": "tan",
	"długość": "length",
	"błąd": "error",
	"substr": "substr",
	"wpisz": "type",
	"utwórzWidok": "createView",
	"utwórzPłótno": "createCanvas",
	"zonesAt": "zonesAt",
	"wykonaj": "execute",
	"szukaj": "indexOf",
	"zapomnij": "forget",
	"synchronizujTeraz": "eager",
	"czas": "time",
	"wyświetl": "writeln",
	"zastosuj": "apply",
	"później": "todo",
	"znak": "char",
	"jestBoolean": "isBoolean",
	"jestWywoływalne": "isCallable",
	"jestChar": "isChar",
	"jestZdefiniowane": "isDefined",
	"jestWartością": "isValue",
	"jestFunc": "isFunc",
	"isInt": "isInt",
	"nieJestLiczbą": "isNaN",
	"jestNumerem": "isNumber",
	"jestObiektem": "isObject",
	"jestWspółrzędną": "isPoint",
	"jestAkcją": "isProc",
	"pokażWidok": "showView",
	"utwórzListę": "array",
	"podlista": "sublist",
	"odwrócona": "reverse",
	"rozszerzoneszukaj": "search",
	"sortuj": "sort",
	"końcówka": "tail",
	"połącz": "concat",
	"decodeHTML": "decodeHTML"
});

Language.errors = [
/* EDEN_ERROR_PROCNAME */ [
	"'proc' names cannot be keywords",
	"'proc' action names cannot be a literal value",
	"'proc' actions need a name",
	"Unexpected closing bracket",
	"A 'proc' needs a name before it's watch list",
	"A 'proc' needs a name and a watch list"
],
/* EDEN_ERROR_EXPCLOSEBRACKET */ [
	"Wrong kind of bracket, expected a ')'",
	"Missing a closing ')' bracket before end of statement",
	"Missing a closing bracket ')' or operator"
],
/* EDEN_ERROR_BADFACTOR */ [
	"Wrong kind of bracket, use '(' or '[' in expressions.",
	"Missing expression? Unexpected closing bracket",
	"Expected a value or observable",
	"Missing an operand.",
	"Keywords are not allowed in expressions"
],
/* EDEN_ERROR_ACTIONCOLON */ [
	"Need a ':' before listing trigger observables",
	"Actions require a list of observables to trigger on, expected a ':'",
	"Expecting a ':' here",
	"Need a ':' after an action name, not a reserved word"
],
/* EDEN_ERROR_ACTIONNOWATCH */ [
	"A reserved word cannot be used as an observable name",
	"Umm, ask for some help. Need a list of observables",
	"There needs to be at least one watch observable",
	"Expressions cannot be used as watches",
	"Literals cannot be watched by actions",
	"Missing first observable before comma",
	"Cannot watch list literals"
],
/* EDEN_ERROR_ACTIONCOMMAS */ [
	"Either too many ','s or a missing watch observable",
	"Must give an observable name, not an expression",
	"The reserved word '%R' cannot be used as an observable name",
	"Expecting an observable name but got %T"
],
/* EDEN_ERROR_ACTIONOPEN */ [
	"Cannot do a function call here",
	"Can only watch observables, not a specific list index",
	"An action must have a body of code",
	"Missing an open '{' to start the action code",
	"Use ',' to separate watch observables",
	"Expected an open '{' to start action",
	"Action code must start with a curly '{' bracket"
],
/* EDEN_ERROR_ACTIONCLOSE */ [
	"Wrong kind of bracket to close an action, use '}' instead",
	"Missing a closing '}' bracket at end of action code"
],
/* EDEN_ERROR_LOCALNAME */ [
	"Reserved words cannot be used as local variable names",
	"Missing a name after a 'local' declaration",
	"'local' must be followed by a valid name"
],
/* EDEN_ERROR_LOCALSEMICOLON */ [
	"Need a ';' after a local declaration",
	"It's not possible to initialise a local here"
],
/* EDEN_ERROR_WHENTYPE */ [
	"Did you mean 'when change' or 'when touch'?",
	"Need to know type of 'when' first (change, touch or condition)",
	"Wrong kind of bracket, use '(' for a 'when' condition",
	"A 'when' must have some condition or trigger observables"
],
/* EDEN_ERROR_LISTINDEXEXP */ [
	"A list index must be a valid expression",
	"A list index must be a valid expression",
	"A list index must be a valid expression"
],
/* EDEN_ERROR_LISTINDEXCLOSE */ [
	"Wrong kind of bracket, need a ']' to end the list index",
	"Missing a ']' to end the list index",
	"Missing a ']' to end the list index",
	"Unexpected observable name, did you forget ']'?"
],
/* EDEN_ERROR_LVALUE */ [
	"Must be an observable name",
	"Expected an observable name, cannot use reserved words as observables",
	"Missing an observable"
],
/* EDEN_ERROR_SEMICOLON */ [
	"Missing a ';'",
	"Incomplete floating point number",
	"Need another dot for a range, or a property name",
	"Missing a ';' on previous line?",
	"Missing either an operator or a ';'",
	"Missing an open bracket, or too many close brackets",
	"Expected a ';' not a bracket"
],
/* EDEN_ERROR_STATEMENT */ [
	"A keyword can't be used as an observable name",
	"Missing an observable name",
	"Wrong kind of bracket, only '{' is allowed here"
],
/* EDEN_ERROR_DEFINITION */ [
	"Must be an 'is' or some kind of assignment",
	"Must be an 'is' or some kind of assignment",
	"Must be an 'is' or some kind of assignment",
	"Wrong kind of bracket, can only be '['"
],
/* EDEN_ERROR_FUNCCALLEND */ [
	"Missing a ')' after function call",
	"Missing a ')' after function call",
	"Missing a ')' after function call",
	"Missing a ')' after function call",
	"Wrong kind of bracket, need a ')'"
],
/* EDEN_ERROR_LISTLITCLOSE */ [
	"Missing a ']' after a list literal"
],
/* EDEN_ERROR_TERNIFCOLON */ [
	"An 'if' in an expression must have a ':' else part"
],
/* EDEN_ERROR_IFCONDOPEN */ [
	"An 'if' condition must be surrounded by '(' and ')'"
],
/* EDEN_ERROR_IFCONDCLOSE */ [
	"Missing a closing ')' after if condition"
],
/* EDEN_ERROR_PARAMNAME */ [
	"Reserved words can't be used as para names",
	"'para' can't be used as an observable name",
	"Unexpected bracket, expected a para name"
],
/* EDEN_ERROR_PARAMSEMICOLON */ [
	"Need a ';' after a para declaration",
	"It's not possible to initialise a para",
	"Need a ';' after a para declaration",
	"Unexpected bracket, need a ';'"
],
/* EDEN_ERROR_FUNCOPEN */ [
	"Cannot do a function call here",
	"Can only watch observables, not a specific list index",
	"An action must have a body of code",
	"Missing an open '{' to start the action code",
	"Use ',' to separate watch observables",
	"Expected an open '{' to start action",
	"Action code must start with a curly '{' bracket"
],
/* EDEN_ERROR_FUNCCLOSE */ [
	"Wrong kind of bracket, use '}' to end action code",
	"Missing a closing '}'"
],
/* EDEN_ERROR_FUNCNAME */ [
	"'func' names can't be keywords",
	"'func' needs a name",
	"'func' needs a name"
],
/* EDEN_ERROR_FOROPEN */ [
	"Missing an open '(' in 'for'"
],
/* EDEN_ERROR_FORCLOSE */ [
	"Missing a closing ')' after 'for'"
],
/* EDEN_ERROR_FORSTART */ [
	"Missing a ';' after initialising statement in 'for'"
],
/* EDEN_ERROR_FORCOND */ [
	"Missing a ';' after 'for' condition"
],
/* EDEN_ERROR_SUBSCRIBEOPEN */ [
	"Expected a '[' to list subscribers"
],
/* EDEN_ERROR_SUBSCRIBECLOSE */ [
	"Expected a ']' to end subscribers list"
],
/* EDEN_ERROR_SWITCHOPEN */ [
	"Expected a '(' to start 'switch' expression"
],
/* EDEN_ERROR_SWITCHCLOSE */ [
	"Expected a ')' to end 'switch' expression"
],
/* EDEN_ERROR_DEFAULTCOLON */ [
	"A 'default' statement must be followed by a ':'"
],
/* EDEN_ERROR_CASELITERAL */ [
	"A 'case' needs a number or string after it"
],
/* EDEN_ERROR_CASECOLON */ [
	"A 'case' must end in a ':'"
],
/* EDEN_ERROR_INSERTCOMMA */ [
	"An 'insert' operation takes 3 parts"
],
/* EDEN_ERROR_DELETECOMMA */ [
	"A 'delete' operation takes 2 parts"
],
/* EDEN_ERROR_APPENDCOMMA */ [
	"An 'append' operation takes 2 parts"
],
/* EDEN_ERROR_SCOPENAME */ [
	"Expected an observable name for a scope override"
],
/* EDEN_ERROR_SCOPEEQUALS */ [
	"Missing an '=' in giving a scope override"
],
/* EDEN_ERROR_SCOPECLOSE */ [
	"Missing a closing '}' after scope"
],
/* EDEN_ERROR_BACKTICK */ [
	"Missing a closing backtick"
],
/* EDEN_ERROR_WHILEOPEN */ [
	"While loop conditions start with an open '('"
],
/* EDEN_ERROR_WHILECLOSE */ [
	"Missing a closing ')' after while condition"
],
/* EDEN_ERROR_WHILENOSTATEMENT */ [
	"While loops must have a statement"
],
/* EDEN_ERROR_NEGNUMBER */ [
	"Expected a number after a negative sign"
],
];

Language.ui = {
	"input_window": {
		title: "Okno Wprowadzania Skryptu",
		description: "Daje możliwość wpisywania skryptów, przy użyciu klawiatury, zgłaszania ich do interpretacji i przywoływanie historii wpisów.",
		success: "Super!",
		is_undef_because: "nie jest zdefiniowane ponieważ",
		is_undef: "nie jest zdefiniowane",
		are_undef: "nie są zdefiniowane",
		uses: "używa",
		which_undef: "które nie jest zdefiniowane",
		uses_undef: "używa zmiennej która nie jest zdefiniowana"
	},
	"canvas": {
		title: "Obrazek"
	},
	"menu_bar": {
		title: "Pasek Menu",
		description: "Tworzy pasek menu.",
		opt_confirm: "Potwierdź zamknięcie środowiska",
		opt_simple_search: "Uproszczone wyszukiwanie",
		opt_hide: "Ukryj okna, gdy zminimalizowane",
		opt_collapse: "Zwiń do paska tytułu po dwukrotnym kliknięciu myszki",
		opt_debug: "Debug JS-EDEN",
		main_views: "Nowe Okno",
		main_existing: "Istniejące Okno",
		main_options: "Opcje"
	},
	"search": {
		disjunction: "lub"
	},
	"general": {
		finished_loading: "JS-EDEN zakończył ładowanie.",
		leaving: "Opuszczenie tej strony wyczyści aktualny skrypt. Twoja praca nie będzie zapisana."
	}
}

