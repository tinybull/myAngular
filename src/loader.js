function setupModuleLoader(window) {

    var angular = ensure(window, 'angular', Object);

    return ensure(angular, 'module', function () {
        var modules = {};
        return function (name, requires, configFn) {
            if (requires) {
                return createModule(name, requires, modules, configFn);
            } else {
                return getModule(name, modules);
            }
        };
    });

    function ensure(obj, name, factory) {    //initialize object just once
        return obj[name] || (obj[name] = factory());
    }

    function createModule(name, requires, modules, configFn) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name';
        }
        var invokeQueue = [];           //holds a collection of tasks (register providers)
        var configBlocks = [];          //queue up a call to $injector.invoke.
        var runBlocks = [];

        var moduleInstance = {
            name: name,
            requires: requires,

            constant: invokeLater('$provide', 'constant', 'unshift'),    //使得constant注册放在invokeQueue前面
            provider: invokeLater('$provide', 'provider'),
            factory: invokeLater('$provide', 'factory'),
            value: invokeLater('$provide', 'value'),
            service: invokeLater('$provide', 'service'),
            decorator: invokeLater('$provide', 'decorator'),

            filter: invokeLater('$filterProvider', 'register'),

            directive: invokeLater('$compileProvider', 'directive'),    //创建$compileProvider的provider要先被注册
            controller: invokeLater('$controllerProvider', 'register'), //queue up a call to the register method of the $controllerProvider

            config: invokeLater('$injector', 'invoke', 'push', configBlocks),   //providerCache.$injector
            run: function (fn) {
                runBlocks.push(fn);
                return moduleInstance;
            },

            _invokeQueue: invokeQueue,      //[service,method,arguments], 本质上是用来注册providers
            _configBlocks: configBlocks,    //[service,method,arguments], 本质上是用来配置providers
            _runBlocks: runBlocks           //functions to run
        };

        if (configFn) {
            moduleInstance.config(configFn);
        }

        modules[name] = moduleInstance; //store newly created module object
        return moduleInstance;

        /**
         * 这里所有的service都是从providerCache中获取的
         * service: object which 'method' will call,such as $provide or $injector,...providers,
         * method: a method name of service,such as $provide.constant() or $injector.invoke()
         * arrayMethod: 决定插入invokeQueue头或者尾
         * queue: specify which queue to use
         */
        function invokeLater(service, method, arrayMethod, queue) {
            return function () {
                queue = queue || invokeQueue;   //default: invokeQueue
                queue[arrayMethod || 'push']([service, method, arguments]);       //method产生了闭包
                return moduleInstance;
            };
        }

    }

    function getModule(name, modules) {
        if (modules.hasOwnProperty(name)) {
            return modules[name];
        } else {
            throw 'Module ' + name + ' is not available!';
        }
    }

}
