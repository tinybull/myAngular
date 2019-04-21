function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

describe('$compile', function () {

    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });

    describe('linking', function () {

        it('returns a public link function from compile', function () {
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {compile: _.noop};
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive></div>');
                var linkFn = $compile(el);
                expect(linkFn).toBeDefined();
                expect(_.isFunction(linkFn)).toBe(true);
            });
        });


        it('takes a scope and attaches it to elements', function () {
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {compile: _.noop};
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.data('$scope')).toBe($rootScope);
            });
        });


        it('calls directive link function with scope', function () {
            var givenScope, givenElement, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    compile: function () {
                        return function link(scope, element, attrs) {
                            givenScope = scope;
                            givenElement = element;
                            givenAttrs = attrs;
                        };
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
                expect(givenElement[0]).toBe(el[0]);
                expect(givenAttrs).toBeDefined();
                expect(givenAttrs.myDirective).toBeDefined();
            });
        });


        it('supports link function in directive definition object', function () {
            var givenScope, givenElement, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    link: function (scope, element, attrs) {
                        console.log('post link running');
                        givenScope = scope;
                        givenElement = element;
                        givenAttrs = attrs;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
                expect(givenElement[0]).toBe(el[0]);
                expect(givenAttrs).toBeDefined();
                expect(givenAttrs.myDirective).toBeDefined();
            });
        });

        it('links children when parent has no directives', function () {
            var givenElements = [];
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    link: function (scope, element, attrs) {
                        givenElements.push(element);
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $(' <div><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(1);
                expect(givenElements[0][0]).toBe(el[0].firstChild);
            });
        });

        it('supports link function objects', function () {
            var linked;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    link: {
                        post: function (scope, element, attrs) {
                            linked = true;
                        }
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(linked).toBe(true);
            });
        });

        it('supports prelinking and postlinking', function () {
            var linkings = [];
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    link: {
                        pre: function (scope, element) {
                            linkings.push(['pre', element[0]]);
                        },
                        post: function (scope, element) {
                            linkings.push(['post', element[0]]);
                        }
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive><div my-directive></div></div>');
                $compile(el)($rootScope);
                expect(linkings.length).toBe(4);
                expect(linkings[0]).toEqual(['pre', el[0]]);
                expect(linkings[1]).toEqual(['pre', el[0].firstChild]);
                expect(linkings[2]).toEqual(['post', el[0].firstChild]);
                expect(linkings[3]).toEqual(['post', el[0]]);
            });
        });

        it('reverses priority for postlink functions ', function () {
            var linkings = [];
            var injector = makeInjectorWithDirectives({
                firstDirective: function () {
                    return {
                        priority: 2,
                        link: {
                            pre: function (scope, element) {
                                linkings.push('first-pre');
                            },
                            post: function (scope, element) {
                                linkings.push('first-post');
                            }
                        }
                    };
                },
                secondDirective: function () {
                    return {
                        priority: 1,
                        link: {
                            pre: function (scope, element) {
                                linkings.push('second-pre');
                            },
                            post: function (scope, element) {
                                linkings.push('second-post');
                            }
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div first-directive second-directive></div>');
                $compile(el)($rootScope);
                expect(linkings).toEqual([
                    'first-pre',
                    'second-pre',
                    'second-post',
                    'first-post'
                ]);
            });
        });

        it('stabilizes node list during linking', function () {
            var givenElements = [];
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    link: function (scope, element, attrs) {
                        givenElements.push(element[0]);
                        element.after('<div></div>');
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div><div my-directive></div><div my-directive></div></div>');
                var el1 = el[0].childNodes[0], el2 = el[0].childNodes[1];
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(2);
                expect(givenElements[0]).toBe(el1);
                expect(givenElements[1]).toBe(el2);
            });
        });

        it('invokes multi-element directive link functions with whole group', function () {
            var givenElements;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    multiElement: true,
                    link: function (scope, element, attrs) {
                        givenElements = element;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $(
                    '<div my-directive-start></div>' +
                    '<p></p>' +
                    '<div my-directive-end></div>'
                );
                $compile(el)($rootScope);
                expect(givenElements.length).toBe(3);
            });
        });


        it('makes new scope for element when directive asks for it', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: true,
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
            });
        });

        it('gives inherited scope to all directives on element', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: true
                    };
                },
                myOtherDirective: function () {
                    return {
                        link: function (scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
            });
        });

        it('adds scope class and data for element with new scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: true,
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.hasClass('ng-scope')).toBe(true);
                expect(el.data('$scope')).toBe(givenScope);
            });
        });

        it('creates an isolate scope when requested', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {},
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope.$parent).toBe($rootScope);
                expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
            });
        });

        it('does not share isolate scope with other directives', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function () {
                    return {
                        link: function (scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
            });
        });

        it('does not use isolate scope on child elements', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function () {
                    return {
                        link: function (scope) {
                            givenScope = scope;
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive><div my-other-directive></div></div>');
                $compile(el)($rootScope);
                expect(givenScope).toBe($rootScope);
            });
        });

        it('does not allow two isolate scope directives on an element', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function () {
                    return {
                        scope: {}
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function () {
                    $compile(el);
                }).toThrow();
            });
        });


        it('does not allow both isolate and inherited scopes on an element', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: {}
                    };
                },
                myOtherDirective: function () {
                    return {
                        scope: true
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function () {
                    $compile(el);
                }).toThrow();
            });
        });

        it('adds class and data for element with isolated scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {},
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.hasClass('ng-isolate-scope')).toBe(true);
                expect(el.hasClass('ng-scope')).toBe(false);
                expect(el.data('$isolateScope')).toBe(givenScope);
            });
        });


        it('allows observing attribute to the isolate scope', function () {
            var givenScope, givenAttrs;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        anAttr: '@'
                    },
                    link: function (scope, element, attrs) {
                        givenScope = scope;
                        givenAttrs = attrs;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                givenAttrs.$set('anAttr', 42);
                console.log(givenScope);
                expect(givenScope.anAttr).toEqual(42);
            });
        });


        it('sets initial value of observed attr to the isolate scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        anAttr: '@'
                    },
                    link: function (scope, element, attrs) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.anAttr).toEqual('42');
            });
        });


        it('allows aliasing observed attribute', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        aScopeAttr: '@anAttr'
                    },
                    link: function (scope, element, attrs) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.aScopeAttr).toEqual('42');
            });
        });

        it('allows binding expression to isolate scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        anAttr: '='
                    },
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive an-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.anAttr).toBe(42);
            });
        });

        it('allows aliasing expression attribute on isolate scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        myAttr: '=theAttr'
                    },
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive the-attr="42"></div>');
                $compile(el)($rootScope);
                expect(givenScope.myAttr).toBe(42);
            });
        });


        it('evaluates isolate scope expression on parent scope', function () {
            var givenScope;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    scope: {
                        myAttr: '='
                    },
                    link: function (scope) {
                        givenScope = scope;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                $rootScope.parentAttr = 41;
                var el = $('<div my-directive my-attr="parentAttr + 1" ></div>');
                $compile(el)($rootScope);
                expect(givenScope.myAttr).toBe(42);
            });
        });


    });

});
