function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

describe('$compile', function () {

    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });


    describe('linking', function () {
        it('takes a scope and attaches it to elements', function () {
            var injector = makeInjectorWithDirectives('myDirective', function () {
                return {compile: _.noop};
            });
            injector.invoke(function ($compile, $rootScope) {
                var el = $('<div my-directive></div>');
                $compile(el)($rootScope);
                expect(el.data('$scope')).toBe($rootScope);
            });
        });
    });



});
