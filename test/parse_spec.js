describe("parse", function () {
    it("can parse an integer", function () {
        var fn = parse('42');

        console.log(fn);
        console.log(fn());

        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });

    it("can parse a floating point number", function () {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);
    });

    it("can parse a floating point number without an integer part",function(){
        var fn=parse('.42');
        expect(fn()).toBe(0.42);
    });

    it("looks up an attribute from the scope",function(){
        var fn=parse('aKey');
        expect(fn({aKey:42})).toBe(42);
        expect(fn({})).toBeUndefined();
    })
});