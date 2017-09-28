function nodeName(element) {
    return element.nodeName ? element.nodeName : element[0].nodeName;
}

function directiveNormalize(name) {
    return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}

var PREFIX_REGEXP = /(x[:\-_]|data[:\-_])/i;

function byPriority(a, b) {
    var diff = b.priority - a.priority;     //比较priority
    if (diff !== 0) {
        return diff;
    } else {
        if (a.name !== b.name) {           // 比较name
            return (a.name < b.name ? -1 : 1);
        } else {
            return a.index - b.index;    //比较注册顺序
        }
    }
}

function groupScan(node, startAttr, endAttr) {
    var nodes = [];
    if (startAttr && node && node.hasAttribute(startAttr)) {
        var depth = 0;
        do {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute(startAttr)) {
                    depth++;
                } else if (node.hasAttribute(endAttr)) {
                    depth--;
                }
            }
            nodes.push(node);
            node = node.nextSibling;
        } while (depth > 0);
    } else {
        nodes.push(node);
    }

    return $(nodes);
}

function $CompileProvider($provide) {

    var hasDirectives = {};

    this.directive = function (name, directiveFactory) {
        var that = this;
        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid directive name';
            }
            if (!hasDirectives.hasOwnProperty(name)) {
                hasDirectives[name] = [];
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, function (factory, i) {
                        var directive = $injector.invoke(factory);
                        directive.restrict = directive.restrict || 'EA';
                        directive.priority = directive.priority || 0;
                        directive.name = directive.name || name;
                        directive.index = i;
                        return directive;
                    });
                }]);
            }
            hasDirectives[name].push(directiveFactory);
        } else {
            _.forEach(name, function (directiveFactory, name) {
                that.directive(name, directiveFactory);
            });
        }

    };

    this.$get = ['$injector', function ($injector) {
        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var directives = collectDirectives(node);
                var terminal = applyDirectivesToNode(directives, node);
                if (!terminal && node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node) {
            var directives = [];
            if (node.nodeType === Node.ELEMENT_NODE) {
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(directives, normalizedNodeName, 'E');   //element

                _.forEach(node.attributes, function (attr) {    //attrs
                    var attrStartName, attrEndName;
                    var name = attr.name;
                    var normalizedAttrName = directiveNormalize(name.toLowerCase());    //可能包含-start/end suffix

                    if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
                        name = _.kebabCase(normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7));
                    }

                    var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
                    if (directiveIsMultiElement(directiveNName)) {
                        if (/Start$/.test(normalizedAttrName)) {
                            attrStartName = name;
                            attrEndName = name.substring(0, name.length - 5) + 'end';
                            name = name.substring(0, name.length - 6);
                        }
                    }
                    normalizedAttrName = directiveNormalize(name.toLowerCase());

                    addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);
                });

                _.forEach(node.classList, function (cls) {      //class
                    var normalizedClassName = directiveNormalize(cls);
                    addDirective(directives, normalizedClassName, 'C');
                });
            } else if (node.nodeType === Node.COMMENT_NODE) {   //comment
                var match = /^\s*directive:\s*([\d\w\-_]+)/.exec(node.nodeValue);
                if (match) {
                    addDirective(directives, directiveNormalize(match[1]), 'M');
                }
            }

            directives.sort(byPriority);
            return directives;
        }

        function addDirective(directives, name, mode, attrStartName, attrEndName) {
            if (hasDirectives.hasOwnProperty(name)) {
                var foundDirectives = $injector.get(name + 'Directive');
                var applicableDirectives = _.filter(foundDirectives, function (dir) {
                    return dir.restrict.indexOf(mode) !== -1;
                });
                _.forEach(applicableDirectives, function (directive) {
                    if (attrStartName) {
                        directive = _.create(directive, {
                            $$start: attrStartName,
                            $$end: attrEndName
                        });
                    }
                    directives.push(directive);
                });
                //directives.push.apply(directives, applicableDirectives);      //一次性将一个数组的元素都push到directives
            }
        }

        function applyDirectivesToNode(directives, compileNode) {
            var $compileNode = $(compileNode);
            var terminalPriority = -Number.MAX_VALUE;
            var terminal = false;
            _.forEach(directives, function (directive) {    //排序好的diretives数组

                if (directive.$$start) {
                    $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
                }

                if (directive.priority < terminalPriority) {
                    return false;   //terminate compilation
                }

                if (directive.compile) {
                    directive.compile($compileNode);
                }
                if (directive.terminal) {
                    terminal = true;
                    terminalPriority = directive.priority;
                }
            });
            return terminal;
        }

        function directiveIsMultiElement(name) {
            if (hasDirectives.hasOwnProperty(name)) {
                var directives = $injector.get(name + 'Directive');
                return _.some(directives, {multiElement: true});
            }
            return false;
        }

        return compile;
    }];
}

$CompileProvider.$inject = ['$provide'];