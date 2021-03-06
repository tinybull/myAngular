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

var BOOLEAN_ATTRS = {
    multiple: true,
    selected: true,
    checked: true,
    disabled: true,
    readOnly: true,
    required: true,
    open: true
};
var BOOLEAN_ELEMENTS = {
    INPUT: true,
    SELECT: true,
    OPTION: true,
    TEXTAREA: true,
    BUTTON: true,
    FORM: true,
    DETAILS: true
};

function isBooleanAttribute(node, attrName) {
    return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
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

    this.$get = ['$injector','$rootScope', function ($injector,$rootScope) {

        function Attributes(element) {
            this.$$element = element;
            this.$attr = {};    //store a mapping of the normalized attribute names to their original names
        }

        //设置DOM节点属性
        Attributes.prototype.$set = function (key, value, writeAttr, attrName) {
            this[key] = value; //动态设置attributes属性及其值

            //设置property
            if (isBooleanAttribute(this.$$element[0], key)) {
                this.$$element.prop(key, value);
            }

            if (!attrName) {
                if (this.$attr[key]) {
                    attrName = this.$attr[key];
                } else {
                    attrName = this.$attr[key] = _.kebabCase(key, '-');
                }
            } else {
                this.$attr[key] = attrName;
            }

            //是否映射到attribute元素上
            if (writeAttr !== false) {
                this.$$element.attr(attrName, value);
            }

            if (this.$$observers) {     //如果有observers，立即调用
                _.forEach(this.$$observers[key], function (observer) {
                    try {
                        observer(value);
                    } catch (e) {
                        console.log(e);
                    }
                });
            }
        };

        Attributes.prototype.$observe = function (key, fn) {
            var self = this;
            this.$$observers = this.$$observers || Object.create(null);
            this.$$observers[key] = this.$$observers[key] || [];
            this.$$observers[key].push(fn);
            $rootScope.$evalAsync(function () {
                fn(self[key]);      //guaranteed to run once after initially registered.
            });

            return function () {
                var index = self.$$observers[key].indexOf(fn);
                if (index >= 0) {
                    self.$$observers[key].splice(index, 1);
                }
            };
        };

        Attributes.prototype.$addClass = function (classVal) {
            this.$$element.addClass(classVal);
        };

        Attributes.prototype.$removeClass = function (classVal) {
            this.$$element.removeClass(classVal);
        };

        Attributes.prototype.$updateClass = function (newClassVal, oldClassVal) {
            var newClasses = newClassVal.split(/\s+/);
            var oldClasses = oldClassVal.split(/\s+/);
            var addedClasses = _.difference(newClasses, oldClasses);
            var removedClasses = _.difference(oldClasses, newClasses);
            if (addedClasses.length) {
                this.$addClass(addedClasses.join(' '));
            }
            if (removedClasses.length) {
                this.$removeClass(removedClasses.join(' '));
            }
        };

        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var attrs = new Attributes($(node));
                var directives = collectDirectives(node, attrs);
                var terminal = applyDirectivesToNode(directives, node, attrs);
                if (!terminal && node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node, attrs) {
            var directives = [];
            var match;
            if (node.nodeType === Node.ELEMENT_NODE) {
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(directives, normalizedNodeName, 'E');   //element

                _.forEach(node.attributes, function (attr) {    //attrs
                    var attrStartName, attrEndName;
                    var name = attr.name;
                    var normalizedAttrName = directiveNormalize(name.toLowerCase());    //可能包含-start/end suffix

                    var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
                    if (isNgAttr) {
                        name = _.kebabCase(normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7));
                        normalizedAttrName = directiveNormalize(name.toLowerCase());
                    }

                    attrs.$attr[normalizedAttrName] = name;

                    var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
                    if (directiveIsMultiElement(directiveNName)) {
                        if (/Start$/.test(normalizedAttrName)) {
                            attrStartName = name;
                            attrEndName = name.substring(0, name.length - 5) + 'end';
                            name = name.substring(0, name.length - 6);
                        }
                        normalizedAttrName = directiveNormalize(name.toLowerCase());
                    }

                    addDirective(directives, normalizedAttrName, 'A', attrStartName, attrEndName);

                    if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
                        attrs[normalizedAttrName] = attr.value.trim();
                        if (isBooleanAttribute(node, normalizedAttrName)) {
                            attrs[normalizedAttrName] = true;
                        }
                    }
                });

                var className = node.className;          //class
                if (_.isString(className) && !_.isEmpty(className)) {
                    while ((match = /([\d\w\-_]+)(?::([^;]+))?;?/.exec(className))) {
                        var normalizedClassName = directiveNormalize(match[1]);
                        if (addDirective(directives, normalizedClassName, 'C')) {
                            attrs[normalizedClassName] = match[2] ? match[2].trim() : undefined;
                        }
                        className = className.substr(match.index + match[0].length);
                    }
                }

            } else if (node.nodeType === Node.COMMENT_NODE) {   //comment
                match = /^\s*directive:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
                if (match) {
                    var normalizedName = directiveNormalize(match[1]);
                    if (addDirective(directives, normalizedName, 'M')) {
                        attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
                    }
                }
            }

            directives.sort(byPriority);
            return directives;
        }

        function addDirective(directives, name, mode, attrStartName, attrEndName) {
            var match;  //返回给的给定的name是否匹配到了指令
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
                    match = directive;
                });
            }
            return match;
        }

        function applyDirectivesToNode(directives, compileNode, attrs) {
            var $compileNode = $(compileNode);
            var terminalPriority = -Number.MAX_VALUE;
            var terminal = false;
            _.forEach(directives, function (directive) {    //排序好的directives数组

                if (directive.$$start) {
                    $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
                }

                if (directive.priority < terminalPriority) {
                    return false;   //terminate compilation
                }

                if (directive.compile) {
                    directive.compile($compileNode, attrs);
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