describe("filter", function () {

    it('can be registered and obtained', function () {
        var myFilter = function () {
        };
        var myFilterFactory = function () {
            return myFilter;
        };

        register('my', myFilterFactory);
        expect(filter('my')).toBe(myFilter);
    });


    it('allows registering multiple filters with an object', function () {
        var myFilter = function () {
        };
        var myOtherFilter = function () {
        };
        register({
            my: function () {
                return myFilter;
            },
            myOther: function () {
                return myOtherFilter;
            }
        });
        expect(filter('my')).toBe(myFilter);
        expect(filter('myOther')).toBe(myOtherFilter);
    });

    it("can parse filter expressions", function () {
        register('upcase', function () {
            return function (str) {
                return str.toUpperCase();
            };
        });

        var fn = parse('aString | upcase');
        expect(fn({aString: 'Hello'})).toEqual('HELLO');
    });

    it('can parse filter chain expressions', function () {
        register('upcase', function () {
            return function (s) {
                return s.toUpperCase();
            };
        });
        register('exclamate', function () {
            return function (s) {
                return s + '!';
            };
        });
        var fn = parse('"hello" | upcase | exclamate');
        expect(fn()).toEqual('HELLO!');
    });

    it('can pass an additional argument to filters', function () {
        register('repeat', function () {
            return function (s, times) {
                return _.repeat(s, times);
            };
        });
        var fn = parse('"hello" | repeat:3');
        expect(fn()).toEqual('hellohellohello');
    });

    it('can pass several additional arguments to filters', function () {
        register('surround', function () {
            return function (s, left, right) {
                return left + s + right;
            };
        });
        var fn = parse('"hello" | surround:"*":"!"');
        expect(fn()).toEqual('*hello!');
    });


    describe("filter filter", function () {
        it('is available', function () {
            expect(filter('filter')).toBeDefined();
        });
    });

    it('can filter an array with a predicate function', function() {
        var fn = parse('[1, 2, 3, 4] | filter:isOdd');
        var scope = {
            isOdd: function(n) {
                return n % 2 !== 0; }
        };
        expect(fn(scope)).toEqual([1, 3]);
    });
    it('can filter an array of strings with a string', function() { var fn = parse('arr | filter:"a"');
        expect(fn({arr: ["a", "b", "a"]})).toEqual(['a', 'a']);
    });

});