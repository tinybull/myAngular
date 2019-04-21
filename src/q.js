function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {
        return qFactory(function (callback) {
            $rootScope.$evalAsync(callback);
        });
    }];
}

function $$QProvider() {
    this.$get = function () {
        return qFactory(function (callback) {
            setTimeout(callback, 0);
        });
    };
}

function qFactory(callLater) {
    function Promise() {
        //store internal state
        this.$$state = {
            pending: null,      // the item in pending array is array of callbacks
            status: null,       // 1:resolved, 2:rejected
            value: null         // 保存resolve／reject的值
        };
    }

    //store resolved value(注册callbacks) and invoke scheduleProcessQueue，返回新创建的Promise对象
    Promise.prototype.then = function (onFulfilled, onRejected, onProgress) {
        var result = new Deferred();    //one that represents the computation in the onFulfilled callback
        this.$$state.pending = this.$$state.pending || [];
        this.$$state.pending.push([result, onFulfilled, onRejected, onProgress]);   //使得success callback 索引为1, 值和status code相同
        if (this.$$state.status > 0) {      //判断是否resolved
            scheduleProcessQueue(this.$$state);
        }
        return result.promise;
    };
    //shortcut method for the case where you just want to supply a rejection errback.
    Promise.prototype.catch = function (onRejected) {
        return this.then(null, onRejected);
    };
    //callback will called no matter what happens.
    Promise.prototype.finally = function (callback, progressBack) {

        return this.then(function (value) {
            return handleFinallyCallback(callback, value, true);
        }, function (rejection) {
            return handleFinallyCallback(callback, rejection, false);
        }, progressBack);
    };

    function Deferred() {
        this.promise = new Promise();
    }

    //when resolved, invoke the callbacks
    Deferred.prototype.resolve = function (value) {
        //only ever get resolved once!
        if (this.promise.$$state.status) {      // 判断是否resolved/rejected
            return;
        }
        if (value && _.isFunction(value.then)) {    //判断value是否Promise
            value.then(     //当这个Promise被resolve时，调用当前Deferred对象的resolve/reject方法
                _.bind(this.resolve, this),
                _.bind(this.reject, this),
                _.bind(this.notify, this)
            );  //等待该Promise被resolve
        } else {
            this.promise.$$state.value = value;
            this.promise.$$state.status = 1;
            scheduleProcessQueue(this.promise.$$state);     //call the Promise callbacks later
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
            callLater(function () {
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

    function defer() {
        return new Deferred();
    }

    //call the Promise callback later
    function scheduleProcessQueue(state) {
        callLater(function () {     //next digest loop
            processQueue(state);
        });
    }

    //invoke actual promise callback
    function processQueue(state) {  //处理pending属性中保存的callback数组
        var pending = state.pending;
        delete state.pending;           //确保callback只调用一次
        _.forEach(pending, function (handlers) {
            var deferred = handlers[0];
            var fn = handlers[state.status];    //根据status选择调用callback/errback
            try {
                if (_.isFunction(fn)) {         //判断回调函数是否为Function(then注册回调函数时可能省略了成功/失败的回调函数)
                    deferred.resolve(fn(state.value));  //持续resolve,前一个callback返回的值为参数
                } else if (state.status === 1) {    //if there is no callback for the status we're in, we just resolve or reject the chained Deferred with the current Promise’s value
                    deferred.resolve(state.value);
                } else {
                    deferred.reject(state.value);
                }
            } catch (e) {
                deferred.reject(e);
            }
        });
    }

    function makePromise(value, resolved) {
        var d = new Deferred();
        if (resolved) {
            d.resolve(value);
        } else {
            d.reject(value);
        }
        return d.promise;   //返回已经resolved/rejected的Promise
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

    //返回一个rejected的Promise
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
            when(promise).then(function (value) {   //then注册的回调函数在next digest中执行
                results[index] = value;
                counter--;
                if (!counter) {     //当counter等于0时，所有Promise都被resolved
                    d.resolve(results);
                }
            }, function (rejection) {
                d.reject(rejection);    //立即reject Deferred，随后的其他reject会被抛弃
            });
        });
        if (!counter) { //空数组和空对象的情况
            d.resolve(results);
        }
        return d.promise;
    }

    var $Q = function Q(resolver) { //resolver函数接受两个(函数)参数,resolve和reject
        if (!_.isFunction(resolver)) {
            throw 'Expected function, got ' + resolver;
        }

        var d = defer();
        resolver(_.bind(d.resolve, d), _.bind(d.reject, d));
        return d.promise;
    };

    return _.extend($Q, {
        defer: defer,
        reject: reject,
        when: when,
        resolve: when,
        all: all
    });
}