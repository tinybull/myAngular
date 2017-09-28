describe('angularPublic', function () {

    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });

    it('sets up the angular object and the module loader', function () {
        expect(window.angular).toBeDefined();
        expect(window.angular.module).toBeDefined();
    });


    it('sets up $compile', function () {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        expect(injector.has('$compile')).toBe(true);
    });


    /*
     it('sets up the ng module', function () {
     var injector = createInjector(['ng']);
     expect(injector).toBeDefined();
     expect(injector.get('$rootScope')).toBeDefined();
     });

     it('sets up $q', function () {
     var injector = createInjector(['ng']);
     expect(injector.has('$q')).toBe(true);
     });

     it('sets up $http and $httpBackend', function () {
     publishExternalAPI();
     var injector = createInjector(['ng']);
     expect(injector.has('$http')).toBe(true);
     expect(injector.has('$httpBackend')).toBe(true);
     });




     it('sets up $controller', function () {
     publishExternalAPI();
     var injector = createInjector(['ng']);
     expect(injector.has('$controller')).toBe(true);
     });
     */

});