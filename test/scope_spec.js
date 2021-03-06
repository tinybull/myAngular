// 'use strict';

describe('Scope', function () {

    it("can be constructed and used as an object", function () {
        var scope = new Scope();
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function () {
        var scope;
        beforeEach(function () { //为其下的每一个测试用例创建一个scope
            scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', function () {
            var watchFn = function () {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () {
            };
            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes', function () {
            scope.someValue = 'a';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.someValue;
            }, function (newValue, oldValue, scope) {   //接受watcher的newValue与oldValue
                scope.counter++;
            });
            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', function () {
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.someValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', function () {
            scope.someValue = 123;
            var oldValueGiven;
            scope.$watch(function (scope) {
                return scope.someValue;
            }, function (newValue, oldValue, scope) {
                oldValueGiven = oldValue;
            });
            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('triggers chained watchers in the same digest', function () {
            scope.name = 'Jane';
            scope.$watch(function (scope) {
                return scope.nameUpper;
            }, function (newValue, oldValue, scope) {
                if (newValue) {
                    scope.initial = newValue.substring(0, 1) + '.';
                }
            });
            scope.$watch(function (scope) {
                return scope.name;
            }, function (newValue, oldValue, scope) {
                if (newValue) {
                    scope.nameUpper = newValue.toUpperCase();
                }
            });

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        it('gives up on the watches after 10 iterations', function () {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(function (scope) {
                return scope.counterA;
            }, function (newValue, oldValue, scope) {
                scope.counterB++;
            });

            scope.$watch(function (scope) {
                return scope.counterB;
            }, function (newValue, oldValue, scope) {
                scope.counterA++;
            });

            expect((function () {
                scope.$digest()
            })).toThrow();
        });

        it('ends the digest when the last watch is clean', function () {
            scope.array = _.range(100);
            var watchExecutions = 0;
            _.times(100, function (i) {
                scope.$watch(function (scope) {
                    watchExecutions++;
                    return scope.array[i];
                }, function (newValue, oldValue, scope) {
                });
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);

        });

        it('does not end digest so that new watches are not run', function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    scope.counter++;
                });
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', function () {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            }, true);	//基于值的watch，比较的是对象本身，而不是对象引用

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', function () {
            scope.number = 0 / 0;
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.number;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("exectues $eval'ed functions and returns result", function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope) {
                return scope.aValue;
            });
            expect(result).toBe(42);
        });

        it("passes the second $eval argument straight through", function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);
            expect(result).toBe(44);
        });

        it("executes $apply'ed function and starts the digest", function () {
            scope.aValue = 'someValue';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$apply(function (scope) {
                scope.aValue = 'someOtherValue';
            });
            expect(scope.counter).toBe(2);

            scope.$apply(function(scope){
                scope.$evalAsync(function(){
                    scope.aValue="哈哈";
                });
            });

            expect(scope.counter).toBe(3);
        });

        it("executes $evalAsync'ed functions later in the same cycle", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.$evalAsync(function (scope) {     //executed in next digest
                    scope.asyncEvaluated = true;
                });
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
            });

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);

        });
        it("executes $evalAsync'ed functions added by watch functions", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.$watch(function (scope) {
                if (!scope.asyncEvaluated) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });
                }
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
            });
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });
        it("executes $evalAsync'ed functions even when not dirty", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(function (scope) {
                if (scope.asyncEvaluatedTimes < 2) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluatedTimes++;
                    });
                }
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
            });
            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it("eventually halts $evalAsyncs added by watches", function () {
            scope.aValue = [1, 2, 3];
            scope.$watch(function (scope) {
                scope.$evalAsync(function (scope) {
                });
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
            });
            expect(function () {
                scope.$digest();
            }).toThrow();
        });

        it("has a $$phase field whose value is the current digest phase", function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(function (scope) {
                scope.phaseInWatchFunction = scope.$$phase;
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.phaseInListenerFunction = scope.$$phase;
            });

            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');


        });

        it("schedules a digest in $evalAsync", function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$evalAsync(function (scope) {     //延迟此function执行,表示等待当前代码块执行结束后执行
            });

            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it("allows async $apply with $applyAsync", function (done) {
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("never executes $applyAsync'ed function in the same cycle", function (done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;
            scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    scope.$applyAsync(function (scope) {
                        scope.asyncApplied = true;
                    });
                }
            );
            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('cancels and flushes $applyAsync if digested first', function (done) {
            scope.counter = 0;
            scope.$watch(function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });
            scope.$digest();            //happens to digest,cancel the timeout generated from $applyAsync
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("does not include $$postDigest in the digest", function () {
            scope.aValue = 'original value';
            scope.$$postDigest(function () {    //function are not given any arguments.
                scope.aValue = 'changed value';
            });
            scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                }
            );
            scope.$digest();
            expect(scope.watchedValue).toBe('original value');
            expect(scope.aValue).toBe('changed value');         //out of dirty-checking

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it("catches exceptions in watch functions and continues", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                throw 'error';
            }, function (newValue, oldValue, scope) {

            });
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("catches exceptions in listener functions and continues", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    throw "Error";
                }
            );
            scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("allows destroying a $watch with a removal function", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it("allows destroying a $watch during digest", function () {
            scope.aValue = 'abc';
            var watchCalls = [];
            scope.$watch(function (scope) {
                watchCalls.push('first');
                return scope.aValue;
            });

            var destroyWatch = scope.$watch(function (scope) {
                watchCalls.push('second');
                destroyWatch();
            });
            scope.$watch(function (scope) {
                watchCalls.push('third');
                return scope.aValue;
            });

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });

        it("allows a $watch to destroy another during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                destroyWatch();
            });
            var destroyWatch = scope.$watch(function (scope) {
            }, function (newValue, oldValue, scope) {
            });
            scope.$watch(function (scope) {
                return scope.aValue;                //创建了连个相同的watchFn
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("allows destroying several $watches during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch1 = scope.$watch(function (scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );
            var destroyWatch2 = scope.$watch(function (scope) {
                    return scope.aValue;
                }, function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        });

    });

    describe('$watchGroup', function () {
        var scope;
        beforeEach(function () {
            scope = new Scope();
        });

        it("takes watches as an array and cells listener with arrays", function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([function (scope) {
                return scope.aValue;
            }, function (scope) {
                return scope.anotherValue;
            }], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('only calls listener once per digest', function () {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([function (scope) {
                return scope.aValue;
            }, function (scope) {
                return scope.anotherValue;
            }], function (newValues, oldValues, scope) {
                counter++;
            });
            scope.$digest();

            expect(counter).toEqual(1);
        });

        it("uses the same array of old and new values on first run", function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([function (scope) {
                return scope.aValue;
            }, function (scope) {
                return scope.anotherValue;
            }], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it('uses different arrays for old and new values on subsequent runs', function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([function (scope) {
                return scope.aValue;
            }, function (scope) {
                return scope.anotherValue;
            }], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

    });

    describe('inheritance', function () {

        var parent;
        beforeEach(function () { //为其下的每一个测试用例创建一个scope
            parent = new Scope();
        });

        it("inherits the parent's properties", function () {
            parent.aValue = [1, 2, 3];
            var child = parent.$new();

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it("does not cause a parent to inherit its properties", function () {
            var child = parent.$new();
            child.aValue = [1, 2, 3];
            expect(parent.aValue).toBeUndefined();
        });

        it("inherits the parent's properties whenever they are defined", function () {
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("can manipulate a parent scope's property", function () {
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.aValue.push(4);
            expect(child.aValue).toEqual([1, 2, 3, 4]);
            expect(parent.aValue).toEqual([1, 2, 3, 4]);
        });

        it("can watch a property in the parent", function () {
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            }, true);
            child.$digest();
            expect(child.counter).toBe(1);
            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });

        it("shadows a parent's property with the same name", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.name = 'Joe';
            child.name = 'Jill';
            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });

        it("does not digest its parent(s)", function () {
            var child = parent.$new();
            parent.aValue = 'abc';
            parent.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.aValueWas = newValue;
            });
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it("keeps a record of its children", function () {
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it("digests its children", function () {
            var child = parent.$new();
            parent.aValue = 'abc';
            child.$watch(function (scope) {     //子scope watch了parent属性值
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.aValueWas = newValue;
            });
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it("digests from root on $apply", function () {
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            child2.$apply(function (scope) {
            });
            expect(parent.counter).toBe(1);
        });

        it("schedules a digest from root on $evalAsync", function (done) {
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(function (scope) {
                return scope.avalue;
            }, function (newVlaue, oldValue, scope) {
                scope.counter++;
            });

            child2.$evalAsync(function (scope) {
            });

            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it("digests from root on $apply when isolated", function () {
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            child2.$apply(function (scope) {
            });

            expect(parent.couner).toBe(1);
        });

        it("can take some other scope as the parent", function () { //impression
            var prototypeParent = new Scope();
            var hierarchyParent = new Scope();
            var child = prototypeParent.$new(false, hierarchyParent);
            prototypeParent.a = 42;
            expect(child.a).toBe(42);
            child.counter = 0;
            child.$watch(function (scope) {
                scope.counter++;
            });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);
            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        it("is no longer digested when $destroy has been called", function () {
            var child = parent.$new();
            child.aValue = [1, 2, 3];
            child.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            }, true);
            parent.$digest();
            expect(child.counter).toBe(1);
            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });

        it("$watchCollection", function () {
            var scope;
            beforeEach(function () {
                scope = new Scope();
            });

        });


    });

});
