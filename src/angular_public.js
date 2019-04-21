/**
 * 给全局注册angular对象
 * Core component registration
 */
function publishExternalAPI() {

    setupModuleLoader(window);

    var ngModule = angular.module('ng', []);

    /**
     * 这些API都是注册的provider，其$get方法返回的实例，
     * 在调用$injector.get()方法的时候才被运行
     */
    ngModule.provider('$rootScope', $RootScopeProvider);
    ngModule.provider('$parse', $ParseProvider);
    ngModule.provider('$filter',$FilterProvider);

    ngModule.provider('$q', $QProvider);
    ngModule.provider('$$q', $$QProvider);


    ngModule.provider('$httpBackend', $HttpBackendProvider);
    ngModule.provider('$http', $HttpProvider);
    ngModule.provider('$httpParamSerializer',$HttpParamSerializerProvider);
    ngModule.provider('$httpParamSerializerJQLike',$HttpParamSerializerJQLikeProvider);


    ngModule.provider('$compile', $CompileProvider);
    // ngModule.provider('$controller',$ControllerProvider);

    // ngModule.directive('ngController', ngControllerDirective);


}