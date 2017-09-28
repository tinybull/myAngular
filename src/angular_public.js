/**
 * 给全局注册angular对象
 */
function publishExternalAPI() {

    setupModuleLoader(window);

    var ngModule = angular.module('ng', []);

    ngModule.provider('$rootScope', $RootScopeProvider);
    ngModule.provider('$q', $QProvider);


    //ngModule.provider('$httpBackend', $HttpBackendProvider);
    //ngModule.provider('$http', $HttpProvider);


    //ngModule.provider('$compile', $CompileProvider);
    //ngModule.provider('$controller',$ControllerProvider);

    // ngModule.directive('ngController', ngControllerDirective);

    /**
     * 这些API都是注册的provider，$get方法返回的实例，在调用$injector.get()方法的时候才被运行
     */
}