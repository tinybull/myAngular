function addToScope(locals, identifier, instance) {
    if (locals && _.isObject(locals.$scope)) {
        locals.$scope[identifier] = instance;
    } else {
        throw 'Cannot export controller as ' + identifier + '! No $scope object provided via locals';
    }
}


function $ControllerProvider() {

    /*
     key:   controller name
     value: controller constructor
     */
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

        return function (ctrl, locals, identifier) {
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
            var instance = $injector.instantiate(ctrl, locals);
            if (identifier) {
                addToScope(locals, identifier, instance);
            }

            return instance;
        };
    }];
}