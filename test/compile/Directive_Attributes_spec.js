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

            injector.invoke(function ($compile,$rootScope) {
                var el = $(domString);
                $compile(el);
                callback(el, givenAttrs,$rootScope);
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
                '<div class="my-directive: my attribute value"></div>',
                function (element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });

        it('terminates class directive attribute value at semicolon', function () {
            registerAndCompile(
                'myDirective',
                '<div class="my-directive: my attribute value; some-other-class"></div>',
                function (element, attrs) {
                    expect(attrs.myDirective).toEqual('my attribute value');
                }
            );
        });


        it('adds an attribute with a value from a comment directive', function () {
            registerAndCompile(
                'myDirective',
                '<!-- directive: my-directive and the attribute value -->',
                function (element, attrs) {
                    expect(attrs.hasOwnProperty('myDirective')).toBe(true);
                    expect(attrs.myDirective).toEqual('and the attribute value');
                }
            );
        });


        it('allows adding classes', function () {
            registerAndCompile(
                'myDirective', '<my-directive></my-directive>',
                function (element, attrs) {
                    attrs.$addClass('some-class');
                    expect(element.hasClass('some-class')).toBe(true);
                }
            );
        });
        it('allows removing classes', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive class="some-class"></my-directive>',
                function (element, attrs) {
                    attrs.$removeClass('some-class');
                    expect(element.hasClass('some-class')).toBe(false);
                }
            );
        });

        it('allows updating classes', function () {
            registerAndCompile(
                'myDirective',
                '<my-directive class="one three four"></my-directive>',
                function (element, attrs) {
                    attrs.$updateClass('one two three', 'one three four');
                    expect(element.hasClass('one')).toBe(true);
                    expect(element.hasClass('two')).toBe(true);
                    expect(element.hasClass('three')).toBe(true);
                    expect(element.hasClass('four')).toBe(false);
                });
        });

    });

});
