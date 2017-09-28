function parse(expr) {
    switch (typeof expr) {
        case 'string':
            var lexer = new Lexer();
            var parser = new Parser(lexer);
            return parser.parse(expr);
        case 'function':
            return expr;
        default :
            return _.noop;

    }

}


function Lexer() {

}

Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch)) {
            this.readNumber();
        } else {
            throw  'Unexpected next character: ' + this.ch;
        }
    }

    return this.tokens;

};

Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};

Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index).toLowerCase();      //4
        if ((ch === '.' && this.isNumber(this.peek())) || this.isNumber(ch)) {
            number += ch;
        } else {
            break;
        }
        this.index++;       //-> 读取下一个字符,判断是否为number
    }

    this.tokens.push({
        text: number,
        value: Number(number)
    });
};

Lexer.prototype.peek = function () {
    return this.index < this.text.length - 1 ? this.text.charAt(this.index + 1) : false;
};

function AST(lexer) {
    this.lexer = lexer;
}

AST.Program = 'Program';
AST.Literal = 'Literal';

AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};

AST.prototype.program = function () {
    return {
        type: AST.Program,
        body: this.constant()
    };
};

AST.prototype.constant = function () {
    return {
        type: AST.Literal,
        value: this.tokens[0].value
    };
};

function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function (text) {

    var ast = this.astBuilder.ast(text);
    this.state = {
        body: []
    };
    this.recurse(ast);  //遍历tree

    /* jshint -W054 */
    return new Function('s',this.state.body.join(''));
    /* jshint -W054 */
};

ASTCompiler.prototype.recurse = function (ast) {
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';');
            break;
        case AST.Literal:
            return ast.value;
    }
};

function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);

};






