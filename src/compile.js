function nodeName(element) {
    return element.nodeName ? element.nodeName : element[0].nodeName;
}

function directiveNormalize(name) {
    return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}

var PREFIX_REGEXP = /(x[:\-_]|data[:\-_])/i;

function $CompileProvider($provide) {

    var hasDirectives = {};

    this.directive = function (name, directiveFactory) {
        var that = this;
        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid directive name';
            }
            if (!hasDirectives.hasOwnProperty(name)) {
                hasDirectives[name] = [];   //一个名称可以对应多个指令实例
                /**
                 * 注册的directive也是一个provider
                 * 此provider的名称为 name + 'Directive' + 'Provider'
                 * 此provider的实例名称为 name + 'Directive'
                 * 这里只是注册了指令的provider，指令没有被实例化
                 */
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, function (factory) {
                        var directive = $injector.invoke(factory);
                        directive.restrict = directive.restrict || 'EA';
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


    /**
     * 返回解析指令的函数：compile
     *
     */
    this.$get = ['$injector', function ($injector) {
        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var directives = collectDirectives(node);
                applyDirectivesToNode(directives, node);
                if (node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node) {
            var directives = [];
            if (node.nodeType === Node.ELEMENT_NODE) {
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(directives, normalizedNodeName, 'E');   //element
                _.forEach(node.attributes, function (attr) {
                    var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
                    if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
                        normalizedAttrName = normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7);
                    }
                    addDirective(directives, normalizedAttrName, 'A');   //attrs
                });
                _.forEach(node.classList, function (cls) {
                    var normalizedClassName = directiveNormalize(cls);
                    addDirective(directives, normalizedClassName, 'C');
                });
            } else if (node.nodeType === Node.COMMENT_NODE) {
                var match = /^\s*directive:\s*([\d\w\-_]+)/.exec(node.nodeValue);
                if (match) {
                    addDirective(directives, directiveNormalize(match[1]), 'M');
                }
            }

            return directives;
        }

        function addDirective(directives, name, mode) {
            if (hasDirectives.hasOwnProperty(name)) {
                var foundDirectives = $injector.get(name + 'Directive');
                var applicableDirectives = _.filter(foundDirectives, function (dir) {
                    return dir.restrict.indexOf(mode) !== -1;
                });
                directives.push.apply(directives, applicableDirectives);
            }
        }

        function applyDirectivesToNode(directives, compileNode) {
            var $compileNode = $(compileNode);
            _.forEach(directives, function (directive) {
                if (directive.compile) {
                    directive.compile($compileNode);
                }
            })
        }

        return compile;
    }];
}

$CompileProvider.$inject = ['$provide'];

/**
 * $compileProvider本身是一个provider，这个对象用来注册directive，directive本身也是以provider形式注册的
 */