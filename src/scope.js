function $RootScopeProvider() {

    var TTL = 10;
    this.digestTtl = function (value) {
        if (_.isNumber(value)) {
            TTL = value;
        }
        return TTL;
    };

    this.$get = ['$parse',function ($parse) {

        function initWatchVal() {
        }

        function Scope() {
            this.$$watchers = [];
            this.$$children = [];
            this.$$listeners = {};

            this.$$lastDirtyWatch = null;
            this.$$asyncQueue = [];         //$evalAsync
            this.$$applyAsyncQueue = [];    //$applyAsync
            this.$$postDigestQueue = [];
            this.$$phase = null;                //'$digest','$apply'
            this.$$applyAsyncId = null; //track whether a setTimeout to drain the queue has already been scheduled.
            this.$root = this;
        }

        Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
            var self = this;
            var watcher = {
                watchFn: $parse(watchFn),   //watchFn可能是一个表达式
                listenerFn: listenerFn || function () {},   //listenerFn不存在的情况
                valueEq: !!valueEq,
                last: initWatchVal		//记录该watcher上一次值
            };
            this.$$watchers.unshift(watcher);   //新增加的watcher放在数组前面
            this.$root.$$lastDirtyWatch = null;
            return function () {
                var index = self.$$watchers.indexOf(watcher);
                if (index >= 0) {
                    self.$$watchers.splice(index, 1);
                    self.$root.$$lastDirtyWatch = null; //53页
                }
            };
        };

        Scope.prototype.$$digestOnce = function () {
            var self = this;
            var dirty;

            var continueLoop = true;
            this.$$everyScope(function (scope) {
                var newValue, oldValue;
                _.forEachRight(this.$$watchers, function (watcher) {    //自右向左迭代
                    try {
                        if (watcher) {
                            newValue = watcher.watchFn(scope);
                            oldValue = watcher.last;
                            if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {    //仅在监测的值dirty时调用
                                self.$root.$$lastDirtyWatch = watcher;
                                watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                                watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);//给listenerFn注入实参
                                dirty = true;   //表明有值发生了变化
                            } else if (self.$root.$$lastDirtyWatch === watcher) {
                                continueLoop = false;
                                return false;   //short-circuit the loop and exit immediately
                            }
                        }
                    } catch (e) {
                        console.log(e);
                    }
                });
                return continueLoop;
            });

            return dirty;
        };

        Scope.prototype.$digest = function () {
            var dirty;
            var ttl = TTL;
            this.$root.$$lastDirtyWatch = null;   //每次$digest都需要设置为null
            this.$beginPhase('$digest');

            if (this.$root.$$applyAsyncId) {        // outer digest, $applyAsync flush timeout currently pending
                clearTimeout(this.$root.$$applyAsyncId);
                this.$$flushApplyAsync();
            }

            do {        //ongoing digest

                while (this.$$asyncQueue.length) {
                    try {
                        var asyncTask = this.$$asyncQueue.shift();      //执行并清除任务,$evalAsync注册的函数只执行一次
                        asyncTask.scope.$eval(asyncTask.expression);
                    } catch (e) {
                        console.error(e);
                    }
                }

                dirty = this.$$digestOnce();
                if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
                    this.$clearPhase();
                    throw TTL+ ' digest iterations reached';
                }
            } while (dirty || this.$$asyncQueue.length);        //判断$$asyncQueue中是否还有任务要执行

            this.$clearPhase();

            while (this.$$postDigestQueue.length) {
                try {
                    this.$$postDigestQueue.shift()();
                } catch (e) {
                    console.error(e);
                }

            }
        };

        Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
            if (valueEq) {
                return _.isEqual(newValue, oldValue);   //handled NaN situation
            } else {
                return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));   //使NaN与NaN相等
            }
        };

        Scope.prototype.$eval = function (expr, locals) {
            return $parse(expr)(this, locals);              //使函数expr在'scope作用域'下执行
        };

        Scope.prototype.$apply = function (expr) {
            try {
                this.$beginPhase('$apply');
                return this.$eval(expr);        //设置'$apply'阶段,防止$eval(expr)中,expr包含$evalAsync操作
            } finally {
                this.$clearPhase();
                this.$root.$digest();       //从rootScope开始digest()
            }
        };

        Scope.prototype.$evalAsync = function (expr) {
            var self = this;
            if (!self.$$phase && !self.$$asyncQueue.length) {       //check whether a $digest is already ongoing. 如$evalAsync()是在watchFn/listenerFn中调用
                setTimeout(function () {
                    if (self.$$asyncQueue.length) {
                        self.root.$digest();        //也可以调用$apply()
                    }
                }, 0);
            }

            self.$$asyncQueue.push({scope: this, expression: expr});
        };

        Scope.prototype.$beginPhase = function (phase) {
            if (this.$$phase) {
                throw this.$$phase + ' already in progress';
            }
            this.$$phase = phase;
        };

        Scope.prototype.$clearPhase = function () {
            this.$$phase = null;
        };

        Scope.prototype.$applyAsync = function (expr) {
            var self = this;
            self.$$applyAsyncQueue.push(function () {
                self.$eval(expr);
            });
            if (self.$root.$$applyAsyncId === null) {   //和$evalAsync的区别? outer digest 在处理这两个asyncQueue的位置不同!
                self.$root.$$applyAsyncId = setTimeout(function () {
                    self.$apply(_.bind(self.$$flushApplyAsync, self));
                }, 0);
            }
        };

        Scope.prototype.$$flushApplyAsync = function () {
            while (this.$$applyAsyncQueue.length) {
                try {
                    this.$$applyAsyncQueue.shift()();
                } catch (e) {
                    console.error(e);
                }
            }
            this.$root.$$applyAsyncId = null;
        };

        Scope.prototype.$$postDigest = function (fn) {
            this.$$postDigestQueue.push(fn);
        };

        Scope.prototype.$watchGroup = function (watchFns, listenerFn) {

            var self = this;
            var newValues = new Array(watchFns.length);
            var oldValues = new Array(watchFns.length);

            var changeReactionScheduled = false;

            var firstRun = true;      //判断是否为第一次调用,使 newValues===oldValues,即引用同一个对象

            if (watchFns.length === 0) {        // []
                var shouldCall = true;
                self.$evalAsync(function () {
                    if (shouldCall) {
                        listenerFn(newValues, newValues, self);
                    }
                });
                return function () {        //deregistration ,the case that deregistration fired before digest, so no $evalAsync should executes.
                    shouldCall = false;
                };
            }

            function watchGroupListener() {
                if (firstRun) {
                    listenerFn(newValues, newValues, self);
                } else {
                    listenerFn(newValues, oldValues, self);   //从上层作用域传递实参
                }
                changeReactionScheduled = false;
            }

            var destroyFunctions = _.map(watchFns, function (watchFn) {
                return self.$watch(watchFn, function (newValue, oldValue) {
                    newValues[i] = newValue;
                    oldValues[i] = oldValue;
                    if (!changeReactionScheduled) {
                        changeReactionScheduled = true;
                        self.$evalAsync(watchGroupListener);    //$evalAsync, run in next digest.
                    }
                });
            });

            return function () {
                _.forEach(destroyFunctions, function (destroyFunction) {
                    destroyFunction();
                })
            };

        };

        Scope.prototype.$new = function (isolated, parent) {
            parent = parent || this;

            var child;
            if (isolated) {
                child = new Scope();
                child.$root = parent.$root;
                child.$$asyncQueue = parent.$$asyncQueue;
                child.$$postDigestQueue = parent.$$postDigestQueue;
                child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
            } else {
                var ChildScope = function () {
                    this.$$watchers = [];
                    this.$$children = [];
                    this.$$listeners = {};
                };
                ChildScope.prototype = this;

                child = new ChildScope();
            }

            child.$parent = parent;
            parent.$$children.push(child);  //挂在parent.$$children下
            return child;
        };

        Scope.prototype.$$everyScope = function (fn) {
            if (fn(this)) {
                return this.$$children.every(function (child) {     //this.$$children==[], return true and funtion not executed.
                    return child.$$everyScope(fn);
                });
            } else {
                return false;
            }
        };

        Scope.prototype.$destroy = function () {
            this.$broadcast('$destroy');
            if (this.$parent) {
                var siblings = this.$parent.$$children;
                var indexOfThis = siblings.indexOf(this);
                if (indexOfThis >= 0) {
                    siblings.splice(indexOfThis, 1);
                }
            }
            this.$$watchers = null;
            this.$$listeners = {};
        };

        Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
            var newValue, oldValue;
            var oldLength;
            var veryOldValue;
            var trackVeryOldValue = (listenerFn.length > 1);
            var self = this;
            var changeCount = 0;
            var firstRun = true;

            watchFn = $parse(watchFn);

            var internalWatchFn = function (scope) {
                var newLength;

                newValue = watchFn(scope);

                if (_.isObject(newValue)) {
                    if (_.isArrayLike(newValue)) {
                        if (!_.isArray(oldValue)) {
                            changeCount++;
                            oldValue = [];
                        }
                        if (newValue.length !== oldValue.length) {
                            changeCount++;
                            oldValue.length = newValue.length;
                        }
                        _.forEach(newValue, function (newItem, i) {
                            var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue);
                            if (!bothNaN && newItem !== oldValue[i]) {  //NaN
                                changeCount++;
                                oldValue[i] = newItem;
                            }
                        });

                    } else {
                        if (!_.isObject(oldValue) || _.isArrayLike(oldValue)) {
                            changeCount++;
                            oldValue = {};
                            oldLength = 0;
                        }
                        newLength = 0;
                        _.forOwn(newValue, function (newVal, key) {     //对象属性的增加,修改,删除
                            newLength++;
                            if (oldValue.hasOwnProperty(key)) {
                                var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                                if (!bothNaN && oldValue[key] !== newVal) {
                                    changeCount++;
                                    oldValue[key] = newVal;
                                }
                            } else {
                                changeCount++;
                                oldLength++;
                                oldValue[key] = newVal;
                            }
                        });

                        if (oldLength > newLength) {
                            changeCount++;
                            _.forOwn(oldValue, function (oldVal, key) {     //删除对象属性
                                if (!newValue.hasOwnProperty(key)) {
                                    oldLength--;
                                    delete oldValue[key];
                                }
                            });
                        }
                    }
                } else {
                    if (!self.$$areEqual(newValue, oldValue, false)) {
                        changeCount++;
                    }

                    oldValue = newValue;
                }

                return changeCount;
            };
            var internalListenerFn = function () {
                if (firstRun) {
                    listenerFn(newValue, newValue, self);   //参数传递!
                    firstRun = false;
                } else {
                    listenerFn(newValue, veryOldValue, self);
                }

                if (trackVeryOldValue) {
                    veryOldValue = _.clone(newValue);
                }
            };

            return this.$watch(internalWatchFn, internalListenerFn);
        };

        Scope.prototype.$on = function (eventName, listener) {
            var listeners = this.$$listeners[eventName];
            if (!listener) {
                this.$$listeners[eventName] = listeners = [];
            }
            listeners.push(listener);   //同一个事件,可以注册多个listener
            return function () {
                var index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners[index] = null;
                }
            };
        };

        Scope.prototype.$emit = function (eventName) {
            var propagationStopped = false;
            var event = {
                name: eventName,
                targetScope: this,
                stopPropagation: function () {
                    propagationStopped = true;
                },
                preventDefault: function () {
                    event.defaultPrevented = true;
                }
            };
            var listenerArgs = [event].concat(_.rest(arguments));
            var scope = this;
            do {
                event.currentScope = scope;
                scope.$$fireEventOnScope(eventName, listenerArgs);
                scope = scope.$parent;
            } while (scope && !propagationStopped);
            event.currentScope = null;
            return event;
        };

        Scope.prototype.$broadcast = function (eventName) {
            var event = {
                name: eventName,
                targetScope: this,
                preventDefault: function () {
                    event.defaultPrevented = true;
                }
            };
            var listenerArgs = [event].concat(_.rest(arguments));
            this.$$everyScope(function (scope) {
                event.currentScope = scope;
                scope.$$fireEventOnScope(eventName, listenerArgs);
                return true;
            });
            event.currentScope = null;
            return event;
        };

        Scope.prototype.$$fireEventOnScope = function (eventName, listenerArgs) {

            var listeners = this.$$listeners[eventName] || [];
            var i = 0;
            while (i < listeners.length) {
                if (listeners[i] === null) {
                    listeners.splice(i, 1);      //这里没有对i进行修改
                } else {
                    try {
                        listeners[i].apply(null, listenerArgs);//传参给listener
                    } catch (e) {
                        console.error(e);
                    }
                    i++;
                }
            }
        };

        var $rootScope = new Scope();
        return $rootScope;
    }];
}
