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
                        // 'src/loader.js',
                        // 'src/injector.js',

                        // 'test/injector_spec.js',
                        // 'test/loader_spec.js'

                        'src/scope/Scopes_And_Digest.js',
                        'test/scope/Scopes_And_Digest_spec.js'

                        // 'src/scope/Scope_Inheritance.js',
                        // 'test/scope/Scope_Inheritance_spec.js'
                    ],
                    watch_files: [
                        // 'src/scope/Scope_Inheritance.js',
                        // 'test/scope/Scope_Inheritance_spec.js'

                        'src/scope/Scopes_And_Digest.js',
                        'test/scope/Scopes_And_Digest_spec.js'
                        // 'src/loader.js',
                        // 'src/injector.js',

                        // 'test/injector_spec.js',
                        // 'test/loader_spec.js'
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
