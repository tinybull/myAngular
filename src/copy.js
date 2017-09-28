function getService(name) {
    if (instanceCache.hasOwnProperty(name)) {
        if (instanceCache[name] === INSTANTIATING) {
            throw new Error('Circular dependency found');
        }
        return instanceCache[name];
    }

    else if (providerCache.hasOwnProperty(name)) {
        return providerCache[name];         //返回provider对象
    } else if (providerCache.hasOwnProperty(name + 'Provider')) {
        instanceCache[name] = INSTANTIATING;
        try {
            var provider = providerCache[name + 'Provider'];
            var instance = instanceCache[name] = invoke(provider.$get);
            return instance;
        } finally {
            if (instanceCache[name] === INSTANTIATING) {
                delete instanceCache[name];
            }
        }
    }
}