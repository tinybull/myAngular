function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive.apply($compileProvider, args);
    }]);
}

function registerAndCompile(dirName, domString, callback) {
    var givenAttrs;
    var injector = makeInjectorWithDirectives(dirName, function () {
        return {
            restrict: 'EACM',
            compile: function (element, attrs) {
                givenAttrs = attrs;
            }
        };
    });

    injector.invoke(function ($compile) {
        var el = $(domString);
        $compile(el);
        callback(el, givenAttrs);
    });
}

describe('$compile', function () {
    beforeEach(function () {
        delete window.angular;
        publishExternalAPI();
    });

    describe('attributes', function () {



    });

});
