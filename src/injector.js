function createInjector(modulesToLoad, strictDi) {

    strictDi = (strictDi === true);
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;

    var loadedModules = new HashMap();     //keep track of the modules that have been loaded
    var INSTANTIATING = {};
    var path = [];      //纪录循环依赖path

    var instanceCache = {};
    var providerCache = {};

    providerCache.$provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name!';
            }
            providerCache[key] = value;
            instanceCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider) || _.isArray(provider)) {
                provider = providerInjector.instantiate(provider); //(立即)实例化provider对象
            }
            providerCache[key + 'Provider'] = provider; //所有provider都加了'Provider'后缀
        },
        factory: function (key, factoryFn, enforce) {   //默认enforce
            this.provider(key, {$get: enforce === false ? factoryFn : enforceReturnValue(factoryFn)});
        },
        value: function (key, value) {
            this.factory(key, _.constant(value), false);
        },
        service: function (key, Constructor) {
            this.factory(key, function () {
                return instanceInjector.instantiate(Constructor);
            });
        },
        decorator: function (serviceName, decoratorFn) {
            var provider = providerInjector.get(serviceName + 'Provider');
            var original$get = provider.$get;
            provider.$get = function () {       //修改先前注册的provider的$get方法
                var instance = instanceInjector.invoke(original$get, provider);
                instanceInjector.invoke(decoratorFn, null, {$delegate: instance});
                return instance;
            };
        }
    };

    var instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, function (name) {
        var provider = providerInjector.get(name + 'Provider');
        return instanceInjector.invoke(provider.$get, provider);
    });
    var providerInjector = providerCache.$injector = createInternalInjector(providerCache, function () {
        //只要当前providerCache里面没有，就抛出异常。所以provider的注册顺序很重要！
        throw 'Unknown provider: ' + path.join(' <- ');
    });

    var runBlocks = [];

    //look up module objects, and then drain their invoke queues.
    _.forEach(modulesToLoad, function loadModule(module) {
        if (!loadedModules.get(module)) {
            loadedModules.put(module, true);       //每个module只加载一次,解决模块之间的依赖关系
            if (_.isString(module)) {
                module = angular.module(module);
                _.forEach(module.requires, loadModule);
                runInvokeQueue(module._invokeQueue);    //实例化providers，并挂在到providerCache中，被依赖模块的providers先被挂载
                runInvokeQueue(module._configBlocks);   //用来调用provider对象的方法
                runBlocks = runBlocks.concat(module._runBlocks);  //合并所有模块下的runBlocks
            } else if (_.isFunction(module) || _.isArray(module)) {
                runBlocks.push(providerInjector.invoke(module)); //function module may return a runBlocks fn, if no fn, it return undefined
            }
        }
    });

    //所有模块加载完毕,开始执行run blocks
    _.forEach(_.compact(runBlocks), function (runBlock) {
        instanceInjector.invoke(runBlock);
    });

    /**
     * 暴露instanceInjector给开发者
     */
    return instanceInjector;


    /**
     * @param cache   A cache to do dependency lookups from.
     * @param factoryFn    A factory function to fall back to when there's nothing in cache.
     */
    function createInternalInjector(cache, factoryFn) {

        /**
         * @param name  instance/provider
         * @returns {*}
         */
        function getService(name) {
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' + name + ' <- ' + path.join(' <- '));
                }
                return cache[name];
            } else {
                path.unshift(name);
                cache[name] = INSTANTIATING;
                try {
                    return (cache[name] = factoryFn(name));
                } finally {
                    path.shift();
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }
                }
            }
        }

        /**
         * invoke functions to inject the dependencies they need， usually a $get method of provider
         * @param fn
         * @param self  绑定执行环境
         * @param locals
         * @returns {*} //usually an instance dependency
         */

        function invoke(fn, self, locals) {
            var args = _.map(annotate(fn), function (token) {
                if (_.isString(token)) {
                    return locals && locals.hasOwnProperty(token) ? locals[token] : getService(token);
                } else {
                    throw 'Incorrect injection token! Expected a string, got ' + token;
                }
            });
            if (_.isArray(fn)) {
                fn = _.last(fn);
            }
            return fn.apply(self, args);
        }

        /**
         *  instantiate Type to inject the dependencies they need
         * @param Type
         * @param locals
         * @returns {UnwrappedType}
         */
        function instantiate(Type, locals) {
            var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
            var instance = Object.create(UnwrappedType.prototype);
            invoke(Type, instance, locals);
            return instance;
        }

        return {
            has: function (name) {
                return cache.hasOwnProperty(name) || providerCache.hasOwnProperty(name + 'Provider');
            },
            get: getService,
            annotate: annotate,
            invoke: invoke,
            instantiate: instantiate
        };

    }

    function runInvokeQueue(queue) {
        _.forEach(queue, function (invokeArgs) {
            var service = providerInjector.get(invokeArgs[0]);  //$provide, $injector,$compileProvider
            var method = invokeArgs[1];
            var args = invokeArgs[2];
            service[method].apply(service, args);
        });
    }

    function enforceReturnValue(factoryFn) {
        return function () {
            var value = instanceInjector.invoke(factoryFn);     //factoryFn永远是在invoke中执行！
            if (_.isUndefined(value)) {
                throw 'factory must return a value';
            }
            return value;
        };
    }

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {    //没有依赖的情况可以直接为function
            return [];
        } else {
            if (strictDi) {
                throw 'fn is not using explicit annotation and cannot be invoked in strict mode.';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function (argName) {
                return argName.match(FN_ARG)[2];
            });
        }
    }
}