function $QProvider() {

    function makePromise(value, resolved) {
        var d = new Deferred();
        if (resolved) {
            d.resolve(value);
        } else {
            d.reject(value);
        }
        return d.promise;
    }

    function handleFinallyCallback(callback, value, resolved) {
        var callbackValue = callback();
        if (callbackValue && callbackValue.then) {
            return callbackValue.then(function () {
                return makePromise(value, resolved);
            });
        } else {
            return makePromise(value, resolved);
        }
    }

    this.$get = ['$rootScope', function ($rootScope) {

        function Promise() {
            //store internal state
            this.$$state = {
                pending: null,      //the item in pending array is array of callbacks
                status: null,       // 1:resolved, 2:rejected
                value: null         // 保存resolve／reject的值
            };
        }

        Promise.prototype.then = function (onFulfilled, onRejected, onProgress) {
            var result = new Deferred();
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push([result, onFulfilled, onRejected, onProgress]);   //使得success callback 索引为1, 值和status code相同
            if (this.$$state.status > 0) {      //判断是否resolved
                scheduleProcessQueue(this.$$state);
            }
            return result.promise;
        };

        Promise.prototype.catch = function (onRejected) {       //shortcut method for the case where you just want to supply a rejection errback.
            return this.then(null, onRejected);
        };

        Promise.prototype.finally = function (callback, progressBack) {       //callback will called no matter what happens.
            return this.then(function (value) {
                return handleFinallyCallback(callback, value, true);
            }, function (rejection) {
                return handleFinallyCallback(callback, rejection, false);
            }, progressBack);
        };

        function Deferred() {
            this.promise = new Promise();
        }

        Deferred.prototype.resolve = function (value) {
            if (this.promise.$$state.status) {      // 判断是否resolved/rejected
                return;
            }
            if (value && _.isFunction(value.then)) {    //判断value是否Promise
                value.then(
                    _.bind(this.resolve(this)),
                    _.bind(this.reject(this)),
                    _.bind(this.notify, this)
                );
            } else {
                this.promise.$$state.value = value;
                this.promise.$$state.status = 1;
                scheduleProcessQueue(this.promise.$$state);     //call the Promise callback later
            }

        };

        Deferred.prototype.reject = function (reason) {
            if (this.promise.$$state.status) {
                return;
            }
            this.promise.$$state.value = reason;
            this.promise.$$state.status = 2;
            scheduleProcessQueue(this.promise.$$state);
        };

        Deferred.prototype.notify = function (progress) {
            var pending = this.promise.$$state.pending;
            if (pending && pending.length && !this.promise.$$state.status) {
                $rootScope.$evalAsync(function () {
                    _.forEach(pending, function (handlers) {
                        var deferred = handlers[0];
                        var progressBack = handlers[3];
                        try {
                            deferred.notify(_.isFunction(progressBack) ? progressBack(progress) : progress);
                        } catch (e) {
                            console.log(e);
                        }
                    });
                });
            }
        };

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function () {     //next digest loop
                processQueue(state);
            });
        }

        function processQueue(state) {  //处理pending属性中保存的callback数组
            var pending = state.pending;
            delete state.pending;           //确保callback只调用一次
            _.forEach(pending, function (handlers) {
                var deferred = handlers[0];
                var fn = handlers[state.status];    //根据status选择调用callback/errback
                try {
                    if (_.isFunction(fn)) {         //判断回调函数是否为Function
                        deferred.resolve(fn(state.value));  //持续resolve
                    } else if (state.status === 1) {
                        deferred.resolve(state.value);
                    } else {
                        deferred.reject(state.value);
                    }
                } catch (e) {
                    deferred.reject(e);
                }
            });
        }


        function defer() {
            return new Deferred();
        }

        function reject(rejection) {
            var d = defer();
            d.reject(rejection);
            return d.promise;
        }

        function when(value, callback, errback, progressback) {
            var d = defer();
            d.resolve(value);
            return d.promise.then(callback, errback, progressback);
        }

        function all(promises) {
            var results = _.isArray(promises) ? [] : {};
            var counter = 0;
            var d = defer();
            _.forEach(promises, function (promise, index) {
                counter++;
                when(promise).then(function (value) {
                    results[index] = value;
                    counter--;
                    if (!counter) {
                        d.resolve(results);
                    }
                }, function (rejection) {
                    d.reject(rejection);
                });
            });
            if (!counter) {
                d.resolve(results);
            }
            return d.promise;
        }

        return {
            defer: defer,
            reject: reject,
            when: when,
            resolve: when,
            all: all
        };
    }];
}