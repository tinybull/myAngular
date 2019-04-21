function addToScope(locals, identifier, instance) {
    if (locals && _.isObject(locals.$scope)) {
        locals.$scope[identifier] = instance;   //将controller实例添加到scope属性上
    } else {
        throw 'Cannot export controller as ' + identifier + '! No $scope object provided via locals';
    }
}


function $ControllerProvider() {

    // remembers the registered constructors
    // whose keys are controller names and values are the constructor functions.
    var controllers = {};

    var globals = false;    //是否在全局环境下查找controller function

    this.allowGlobals = function () {
        globals = true;
    };

    this.register = function (name, controller) {
        if (_.isObject(name)) {
            _.extend(controllers, name);
        } else {
            controllers[name] = controller;
        }
    };

    this.$get = ['$injector', function ($injector) {
        return function (ctrl, locals, later, identifier) {
            if (_.isString(ctrl)) {
                var match = ctrl.match(/^(\S+)(\s+as\s+(\w+))?/);
                ctrl = match[1];
                identifier = identifier || match[3];
                if (controllers.hasOwnProperty(ctrl)) {
                    ctrl = controllers[ctrl];
                } else {
                    ctrl = (locals && locals.$scope && locals.$scope[ctrl]) || (globals && window[ctrl]);
                }
            }

            var instance;
            if (later) {
                var ctrlConstructor = _.isArray(ctrl) ? _.last(ctrl) : ctrl;
                instance = Object.create(ctrl); //Create a new object whose prototype is based on the constructor function.
                if (identifier) {
                    addToScope(locals, identifier, instance);
                }
                return _.extend(function () {
                    $injector.invoke(ctrl, instance, locals);
                    return instance;
                }, {
                    instance: instance
                });     // return the 'semi-constructed' controller
            } else {
                //实例化Controller对象
                instance = $injector.instantiate(ctrl, locals);
                if (identifier) {   //判断指令是否有controllerAs属性
                    addToScope(locals, identifier, instance);
                }
                return instance;
            }

        };
    }];
}