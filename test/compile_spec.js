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


    describe('attributes', function () {

        function registerAndCompile(dirName, domString, callback) {
            var givenAttrs;
            var injector = makeInjectorWithDirectives(dirName, function () {
                return {
                    restrict: 'EACM',
                    compile: function (element, attrs) {
                        givenAttrs = attrs;
                    }
                };
            });

            injector.invoke(function ($compile, $rootScope) {
                var el = $(domString);
                $compile(el);
                callback(el, givenAttrs, $rootScope);
            });
        }

        it('passes the element attributes to the compile function', function () {
            registerAndCompile('myDirective', '<my-directive my-attr="1" my-other-attr="two"></my-directive>', function (element, attrs) {
                expect(attrs.myAttr).toEqual('1');
                expect(attrs.myOtherAttr).toEqual('two');
            });
        });

        it('trims attribute values', function () {
            registerAndCompile('myDirective', '<my-directive my-attr=" val "></my-directive>', function (element, attrs) {
                expect(attrs.myAttr).toEqual('val');
            });
        });

        it('sets the value of boolean attributes to true', function () {
            registerAndCompile(
                'myDirective',
                '<input my-directive disabled>', function (element, attrs) {
                    expect(attrs.disabled).toBe(true);
                }
            );
        });

        it('does not set the value of custom boolean attributes to true', function () {
            registerAndCompile(
                'myDirective',
                '<input my-directive whatever>', function (element, attrs) {
                    expect(attrs.whatever).toEqual('');
                }
            );
        });

        it('overrides attributes with ng-attr- versions', function () {
            registerAndCompile(
                'myDirective',
                '<input my-directive ng-attr-whatever="42" whatever="41">', function (element, attrs) {
                    expect(attrs.whatever).toEqual('42');
                }
            );
        });

        it('allows setting attributes', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>', function (element, attrs) {
                    attrs.$set('attr', 'false');
                    expect(attrs.attr).toEqual('false');
                }
            );
        });

        it('sets attributes to DOM', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>', function (element, attrs) {
                    attrs.$set('attr', 'false');
                    expect(element.attr('attr')).toEqual('false');
                }
            );
        });

        it('does not set attributes to DOM when flag is false', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive attr="true"></my-directive>', function (element, attrs) {
                    attrs.$set('attr', 'false', false);
                    expect(element.attr('attr')).toEqual('true');
                }
            );
        });

        it('shares attributes between directives', function () {
            var attrs1, attrs2;
            var injector = makeInjectorWithDirectives({
                myDir: function () {
                    return {
                        compile: function (element, attrs) {
                            attrs1 = attrs;
                        }
                    };
                },
                myOtherDir: function () {
                    return {
                        compile: function (element, attrs) {
                            attrs2 = attrs;
                        }
                    };
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-dir my-other-dir></div>');
                $compile(el);
                expect(attrs1).toBe(attrs2);
            });
        });

        it('sets prop for boolean attributes', function () {
            registerAndCompile(
                'myDirective',
                '<input my-directive>', function (element, attrs) {
                    attrs.$set('disabled', true);
                    expect(element.prop('disabled')).toBe(true);
                }
            );
        });

        it('sets prop for boolean attributes even when not flushing', function () {
            registerAndCompile(
                'myDirective',
                '<input my-directive>', function (element, attrs) {
                    attrs.$set('disabled', true, false);
                    expect(element.prop('disabled')).toBe(true);
                }
            );
        });

        it('denormalizes attribute name when explicitly given', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>', function (element, attrs) {
                    attrs.$set('someAttribute', 43, true, 'some-attribute');
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('denormalizes attribute by snake-casing', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>', function (element, attrs) {
                    attrs.$set('someAttribute', 43);
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('denormalizes attribute by using original attribute name', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive x-some-attribute="42"></my-directive>', function (element, attrs) {
                    attrs.$set('someAttribute', '43');
                    expect(element.attr('x-some-attribute')).toEqual('43');
                }
            );
        });

        it('does not use ng-attr- prefix in denormalized names', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive ng-attr-some-attribute="42"></my-directive>', function (element, attrs) {
                    attrs.$set('someAttribute', 43);
                    expect(element.attr('some-attribute')).toEqual('43');
                }
            );
        });

        it('uses new attribute name after once given', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive x-some-attribute="42"></my-directive>', function (element, attrs) {
                    attrs.$set('someAttribute', 43, true, 'some-attribute');
                    attrs.$set('someAttribute', 44);
                    expect(element.attr('some-attribute')).toEqual('44');
                    expect(element.attr('x-some-attribute')).toEqual('42');
                }
            );
        });

        it('calls observer immediately when attribute is $set', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>', function (element, attrs) {
                    var gotValue;
                    attrs.$observe('someAttribute', function (value) {
                        gotValue = value;
                    });
                    attrs.$set('someAttribute', '43');
                    expect(gotValue).toEqual('43');
                });
        });

        it('calls observer on next $digest after registration', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive some-attribute="42"></my-directive>', function (element, attrs, $rootScope) {
                    var gotValue;
                    attrs.$observe('someAttribute', function (value) {
                        gotValue = value;
                    });
                    $rootScope.$digest();
                    expect(gotValue).toEqual('42');
                });
        });

        it('lets observers be deregistered', function () {
            registerAndCompile('myDirective',
                '<my-directive some-attribute="42"></my-directive>', function (element, attrs) {
                    var gotValue;
                    var remove = attrs.$observe('someAttribute', function (value) {
                        gotValue = value;
                    });
                    attrs.$set('someAttribute', '43');
                    expect(gotValue).toEqual('43');
                    remove();
                    attrs.$set('someAttribute', '44');
                    expect(gotValue).toEqual('43');
                });
        });

        it('adds an attribute from a class directive', function () {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive"></div>', function (element, attrs) {
                    expect(attrs.hasOwnProperty('myDirective')).toBe(true);
                }
            );
        });

        it('does not add attribute from class without a directive', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive class="some-class"></my-directive>', function (element, attrs) {
                    expect(attrs.hasOwnProperty('someClass')).toBe(false);
                }
            );
        });

        it('supports values for class directive attributes', function () {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive: my attribute value"></div>', function (element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });

        it('terminates class directive attribute value at semicolon', function () {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive: my attribute value; some-other-class"></div>', function (element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });

    });

    describe('linking', function () {
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
    });

    describe('controllers', function () {

        it('can be attached to directives as functions', function () {
            var controllerInvoked;
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    controller: function MyController() {
                        controllerInvoked = true;
                    }
                };
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be attached to directives as string references', function () {
            var controllerInvoked;

            function MyController() {
                controllerInvoked = true;
            }

            var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
                $controllerProvider.register('MyController', MyController);
                $compileProvider.directive('myDirective', function () {
                    return {controller: 'MyController'};
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
            });
        });

        it('can be applied in the same element independent of each other', function () {
            var controllerInvoked;
            var otherControllerInvoked;

            function MyController() {
                controllerInvoked = true;
            }

            function MyOtherController() {
                otherControllerInvoked = true;
            }

            var injector = createInjector(['ng',

                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $controllerProvider.register('MyOtherController', MyOtherController);
                    $compileProvider.directive('myDirective', function () {
                        return {controller: 'MyController'};
                    });
                    $compileProvider.directive('myOtherDirective', function () {
                        return {controller: 'MyOtherController'};
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(controllerInvoked).toBe(true);
                expect(otherControllerInvoked).toBe(true);
            });
        });

        it('can be applied to different directives, as different instances', function () {
            var invocations = 0;

            function MyController() {
                invocations++;
            }

            var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
                $controllerProvider.register('MyController', MyController);
                $compileProvider.directive('myDirective', function () {
                    return {controller: 'MyController'};
                });
                $compileProvider.directive('myOtherDirective', function () {
                    return {controller: 'MyController'};
                });
            }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el)($rootScope);
                expect(invocations).toBe(2);
            });
        });

        it('gets scope, element, and attrs through DI', function () {
            var gotScope, gotElement, gotAttrs;

            function MyController($element, $scope, $attrs) {
                gotElement = $element;
                gotScope = $scope;
                gotAttrs = $attrs;
            }

            var injector = createInjector(['ng',
                function ($controllerProvider, $compileProvider) {
                    $controllerProvider.register('MyController', MyController);
                    $compileProvider.directive('myDirective', function () {
                        return {controller: 'MyController'};
                    });
                }]);
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive an-attr="abc"></div>');
                $compile(el)($rootScope);
                expect(gotElement[0]).toBe(el[0]);
                expect(gotScope).toBe($rootScope);
                expect(gotAttrs).toBeDefined();
                expect(gotAttrs.anAttr).toEqual('abc');
            });
        });


    });

    describe('template', function () {
        it('populates an element during compilation', function () {
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    template: '<div class="from-template"></div>'
                };
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(el.find('> .from-template').length).toBe(1);
            });
        });

        it('replaces any existing children', function () {
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {
                    template: '<div class="from-template"></div>'
                };
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive><div class="existing"></div></div>');
                $compile(el);
                expect(el.find('> .existing').length).toBe(0);
            });
        });

        it('compiles template contents also', function () {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        template: '<div my-other-directive></div>'
                    };
                },
                myOtherDirective: function () {
                    return {
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(compileSpy).toHaveBeenCalled();
            });
        });
        it('does not allow two directives with templates', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {template: '<div></div>'};
                },
                myOtherDirective: function () {
                    return {template: '<div></div>'};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function () {
                    $compile(el);
                }).toThrow();
            });
        });

        it('supports functions as template values', function () {
            var templateSpy = jasmine.createSpy()
                .and.returnValue('<div class="from-template"></div>');
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        template: templateSpy
                    };
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(el.find('> .from-template').length).toBe(1);
                // Check that template function was called with element and attrs
                expect(templateSpy.calls.first().args[0][0]).toBe(el[0]);
                expect(templateSpy.calls.first().args[1].myDirective).toBeDefined();
            });
        });

        it('uses isolate scope for template contents', function () {
            var linkSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        scope: {
                            isoValue: '=myDirective'
                        },
                        template: '<div my-other-directive></div>'
                    };
                },
                myOtherDirective: function () {
                    return {link: linkSpy};
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive="42"></div>');
                $compile(el)($rootScope);
                expect(linkSpy.calls.first().args[0]).not.toBe($rootScope);
                expect(linkSpy.calls.first().args[0].isoValue).toBe(42);
            });
        });

    });

    describe('templateUrl', function () {

        var xhr, requests;
        beforEach(function () {
            xhr = sinon.useFakeXMLHttpRequest();
            requests = [];
            xhr.onCreate = function (req) {
                requests.push(req);
            };
        });

        afterEach(function () {
            xhr.restore();
        });

        it('defers remaining directive compilation', function () {
            var otherCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                }, myOtherDirective: function () {
                    return {compile: otherCompileSpy};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el);
                expect(otherCompileSpy).not.toHaveBeenCalled();
            });
        });

        it('defers current directive compilation', function () {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        templateUrl: '/my_directive.html',
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive></div>');
                $compile(el);
                expect(compileSpy).not.toHaveBeenCalled();
            });
        });

        it('immediately empties out the element', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive>Hello</div>');
                $compile(el);
                expect(el.is(':empty')).toBe(true);
            });
        });

        it('fetches the template', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el);
                $rootScope.$apply();
                expect(requests.length).toBe(1);
                expect(requests[0].method).toBe('GET');
                expect(requests[0].url).toBe('/my_directive.html');
            });
        });

        it('populates element with template', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el);
                $rootScope.$apply();
                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(el.find('> .from-template').length).toBe(1);
            });
        });

        it('compiles current directive when template received', function () {
            var compileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        templateUrl: '/my_directive.html',
                        compile: compileSpy
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el);
                $rootScope.$apply();
                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(compileSpy).toHaveBeenCalled();
            });
        });

        it('resumes compilation when template received', function () {
            var otherCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                },
                myOtherDirective: function () {
                    return {compile: otherCompileSpy};
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive my-other-directive></div>');
                $compile(el);
                $rootScope.$apply();
                requests[0].respond(200, {}, '<div class="from-template"></div>');
                expect(otherCompileSpy).toHaveBeenCalled();
            });


        });

        it('resumes child compilation after template received', function () {
            var otherCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {templateUrl: '/my_directive.html'};
                },
                myOtherDirective: function () {
                    return {compile: otherCompileSpy};
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el);
                $rootScope.$apply();
                requests[0].respond(200, {}, '<div my-other-directive></div>');
                expect(otherCompileSpy).toHaveBeenCalled();
            });
        });

        it('supports functions as values', function () {
            var templateUrlSpy = jasmine.createSpy()
                .and.returnValue('/my_directive.html');
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        templateUrl: templateUrlSpy
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el);
                $rootScope.$apply();
                expect(requests[0].url).toBe('/my_directive.html');
                expect(templateUrlSpy.calls.first().args[0][0]).toBe(el[0]);
                expect(templateUrlSpy.calls.first().args[1].myDirective).toBeDefined();
            });
        });

        it('does not allow templateUrl directive after template directive', function () {
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {template: '<div></div>'};
                },
                myOtherDirective: function () {
                    return {templateUrl: '/my_other_directive.html'};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-directive my-other-directive></div>');
                expect(function () {
                    $compile(el);
                }).toThrow();
            });
        });

    });

    describe('interpolation', function () {
        it('is done for text nodes', function () {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div>My expression: {{myExpr}}</div>');
                $compile(el)($rootScope);
                $rootScope.$apply();        //为什么$apply()
                expect(el.html()).toEqual('My expression: ');
                $rootScope.myExpr = 'Hello';
                $rootScope.$apply();
                expect(el.html()).toEqual('My expression: Hello');
            });
        });
        it('adds binding class to text node parents', function () {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div>My expression: {{myExpr}}</div>');
                $compile(el)($rootScope);
                expect(el.hasClass('ng-binding')).toBe(true);
            });
        });
        it('adds binding data to text node parents', function () {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div>{{myExpr}} and {{myOtherExpr}}</div>');
                $compile(el)($rootScope);
                expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr']);
            });
        });

        it('adds binding data to parent from multiple text nodes', function () {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div>{{myExpr}} <span>and</span> {{myOtherExpr}}</div>');
                $compile(el)($rootScope);
                expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr']);
            });
        });

        it('is done for attributes', function () {
            var injector = makeInjectorWithDirectives({});
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}">');
                $compile(el)($rootScope);
                $rootScope.$apply();
                expect(el.attr('alt')).toEqual('');
                $rootScope.myAltText = 'My favourite photo';
                $rootScope.$apply();
                expect(el.attr('alt')).toEqual('My favourite photo');
            });
        });

        it('fires observers on attribute expression changes', function () {
            var observerSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        link: function (scope, element, attrs) {
                            attrs.$observe('alt', observerSpy);
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}" my-directive>');
                $compile(el)($rootScope);
                $rootScope.myAltText = 'My favourite photo';
                $rootScope.$apply();
                expect(observerSpy.calls.mostRecent().args[0])
                    .toEqual('My favourite photo');
            });
        });

        it('fires observers just once upon registration', function () {
            var observerSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myDirective: function () {
                    return {
                        link: function (scope, element, attrs) {
                            attrs.$observe('alt', observerSpy);
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<img alt="{{myAltText}}" my-directive>');
                $compile(el)($rootScope);
                $rootScope.$apply();
                expect(observerSpy.calls.count()).toBe(1);
            });
        });

    });

    describe('transclude', function () {

        it('removes the children of the element from the DOM', function () {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function () {
                    return {transclude: true};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-transcluder><div>Must go</div></div>');
                $compile(el);
                expect(el.is(':empty')).toBe(true);
            });
        });

        it('compiles child elements', function () {
            var insideCompileSpy = jasmine.createSpy();
            var injector = makeInjectorWithDirectives({
                myTranscluder: function () {
                    return {transclude: true};
                },
                insideTranscluder: function () {
                    return {compile: insideCompileSpy};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-transcluder><div inside-transcluder></div></div>');
                $compile(el);
                expect(insideCompileSpy).toHaveBeenCalled();
            });
        });

        it('makes contents available to directive link function', function () {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function () {
                    return {
                        transclude: true,
                        template: '<div in-template></div>',
                        link: function (scope, element, attrs, ctrl, transclude) {
                            element.find('[in-template]').append(transclude());
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-transcluder><div in-transcluder></div></div>');
                $compile(el)($rootScope);
                expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1);
            });
        });

        it('is only allowed once per element', function () {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function () {
                    return {transclude: true};
                },
                mySecondTranscluder: function () {
                    return {transclude: true};
                }
            });
            injector.invoke(function ($compile) {
                var el = $('<div my-transcluder my-second-transcluder></div>');
                expect(function () {
                    $compile(el);
                }).toThrow();
            });
        });

        it('does not use the inherited scope of the directive', function () {
            var injector = makeInjectorWithDirectives({
                myTranscluder: function () {
                    return {
                        transclude: true,
                        scope: true,
                        link: function (scope, element, attrs, ctrl, transclude) {
                            scope.anAttr = 'Shadowed attribute';
                            element.append(transclude());
                        }
                    };
                },
                myInnerDirective: function () {
                    return {
                        link: function (scope, element) {
                            element.html(scope.anAttr);
                        }
                    };
                }
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-transcluder><div my-inner-directive></div></div>');
                $rootScope.anAttr = 'Hello from root';
                $compile(el)($rootScope);
                expect(el.find('> [my-inner-directive]').html()).toBe('Hello from root');
            });
        });

    });

});








































