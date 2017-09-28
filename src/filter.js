var filters = {};

function register(name, factory) {
    if(_.isObject(name)){
        return _.map(name,function(factory,name){
            return register(name,factory);      //返回filter数组对象
        });
    }else{
        var filter = factory();
        filters[name] = filter;
        return filter;
    }

}

function filter(name) {
    return filters[name];
}