module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            all: ['src/loader.js', 'src/injector'],
            options: {
                globals: {
                    _: false,
                    $: false,
                    jasmine: false,
                    describe: false,
                    it: false,
                    expect: false,
                    beforeEach: false,
                    afterEach: false,
                    sinon: false
                },
                browser: true,
                devel: true
            }
        },
        testem: {
            unit: {
                options: {
                    framework: 'jasmine2',
                    before_tests: 'grunt jshint',
                    serve_files: [
                        'node_modules/sinon/pkg/sinon.js',
                        'node_modules/lodash/lodash.js',
                        'node_modules/jquery/dist/jquery.js',

                        'src/apis.js',
                        'src/angular.js',
                        'src/angular_public.js',

                        // 'src/scope/Scope_And_Digest.js',
                        // 'src/scope/Scope_Inheritance.js',
                        // 'src/scope/Watching_Collections.js',
                        'src/scope/Scope_Events.js',

                        // 'src/ExpressionsAndFilters/LiteralExpressions.js',
                        // 'src/ExpressionsAndFilters/LookupAndFunctionCallExpressions.js',
                        // 'src/ExpressionsAndFilters/OperatorExpressions.js',
                        // 'src/ExpressionsAndFilters/Filters.js',
                        'src/ExpressionsAndFilters/ExpressionsAndWatchers.js',

                        'src/loader.js',
                        'src/injector.js',

                        'src/q.js',
                        'src/http.js',
                        'src/http_backend.js',

                        // 'src/compile/DOM_Compilation_And_Basic_Directives.js',
                        // 'test/compile/DOM_Compilation_And_Basic_Directives_spec.js'
                        // 'src/compile/Directive_Attributes.js',

                        // 'src/compile/Controllers.js',
                        // 'test/compile/Controllers_spec.js'

                        'src/compile/Directive_Linking_And_Scopes.js',
                        'test/compile/Directive_Linking_And_Scopes_spec.js'

                        // 'test/http_spec.js',
                        // 'test/angular_public_spec.js'
                        // 'test/scope/Scope_And_Digest_spec.js'
                        // 'test/scope/Scope_Inheritance_spec.js',
                        // 'test/scope/Watching_Collections_spec.js',
                        // 'test/scope/Scope_Events_spec.js',
                        // 'test/ExpressionsAndFilters/LookupAndFunctionCallExpressions_spec.js',
                        // 'test/ExpressionsAndFilters/OperatorExpressions_spec.js',
                        // 'test/ExpressionsAndFilters/Filters_spec.js',
                        // 'test/ExpressionsAndFilters/ExpressionsAndWatchers_spec.js',
                        // 'test/ExpressionsAndFilters/LiteralExpressions_spec.js'
                        // 'test/injector_spec.js',
                        // 'test/loader_spec.js',
                        // 'test/Filters_spec.js',
                        // 'test/q_spec.js',
                        // 'test/compile/Directive_Attributes_spec.js'


                    ],
                    watch_files: [
                        'src/compile/Directive_Linking_And_Scopes.js',
                        'test/compile/Directive_Linking_And_Scopes_spec.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-testem');

    grunt.registerTask('default', ['testem:run:unit']);

    //grunt testem:unit
    //localhost:7357

};