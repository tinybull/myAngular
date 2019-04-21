# Build your own AngularJS 

## Scopes and Digest
### Watcher
     An object with two properties: A watchFn and A listenerFn
     A watcher is something that is notified when a change occurs in the scope.

### dirty-checking($digest)
    Check if the values specified by the watch functions have actually changed, and only then call the respective listener functions.
    Two different strategies for identifying changes in watches: by reference and by value.

1. In JavaScript it’s very common to execute a piece of code “later” – to defer its execution to some point in the future when the current execution context has finished.
2. The usual way to do this is by calling setTimeout() with a zero (or very small) delay parameter.
3. Destroying a scope means that all of its watchers are removed and that
the scope itself is removed from the $$children of its parent.
- **A watch function should have no side effects, or only side effects that can happen any number of times.**
If, for example, a watch function fires an Ajax request,there are no guarantees about how many requests your app is making.



### Scope Inheritance

The first thing about a scope is that it shares the properties of its parent scope. The sharing of the properties has nothing to do with when the properties are defined. Essentially, when you create a child scope, its parent will be made its prototype.
Whenever you use ngModel, there's got to be a dot in there somewhere. If you don't have a dot, you are doing it wrong.

### Watching Collection
The use case for $watchCollection is that you want to know when something in an array or an object has changed: When items or attributes have been added, removed, or reordered.

### Scope Events
```
Event Object: {
    name: eventName,
    targetScope: this,
    stopPropagation:function () {
        propagationStopped = true;
    }
}
```
**_每个listener接收的event对象都是同一个_**


**$evalAysnc调用场景**
1. $watch(watchFn/listenerFn)  //Granted, this is something one should not do, since watch function are supposed to be side-effect free.
2. $apply
3. 直接调用

**Handling Exceptions**
1. watchFn/listenerFn
2. $evalAsync
3. $applyAsync
4. $$postDigest


在digest循环中执行$apply()/$digest(), throw digest is already ongoing.

What we really want to happen when we call $digest is to digest the watches attached to the scope we called, and its children.
Every scope in the hierarchy has its own watchers. Whenever you use ngModel, there’s got to be a dot in there somewhere. If you don’t have a dot, you’re doing it wrong.


$apply takes a function as an argument. It executes that function using $eval, and the kick-start the digest cycle by invoking $digest.

Another thing $evalAsync does is to schedule a $digest if one isn’t already ongoing.

Armed with the knowledge about this difference between $digest and $apply,
you may sometimes call $digest instead of $apply when you need that extra bit of performance.

$apply: digest from root scope, and its children
$digest: digest form current scope, and its children



## Expressions
1. A JavaScript derivative that's optimized for short expressions, removes most control flow statements, and adds filtering support.
2. It involves taking strings that represent expressions and returning JavaScript functions that execute the computation in those expressions.
3. Expressions allow us to concisely access and manipulate data on scopes and run computation on it.
4. The real value of expressions is in allowing us to bind data and behavior to HTML markup.
  We use expressions when providing attributes to directives like ngClass and ngClick, and we use them when binding data to the contents and attributes of DOM elements with the interpolation syntax {{}}.
5. Angular expressions are custom-designed to access and manipulate data on scope objects, and to not do much else.
6. What the Angular expression language is designed for is accessing data on Scopes, and occasionally also manipulating that data.
7. Whenever you use expressions in Angular, JavaScript functions get generated behind the scenes.

```
function parse(expr){
    return function(scope,locals){
        with (scope,locals){    //locals优先
            return eval(expr);
        }
    }
}
```
**Converts AngularJS expression into a function.**


## Lookup And Function Call Expression
1. What the Angular expression language is designed for is accessing data on Scopes, and occasionally also manipulating that data.
2. __proto__ is a non-standard, deprecated accessor for an object's prototype. It allows not only getting but also setting global prototypes, making it potentially dangerous.


### Filters
- When you apply a filter to an expression, a filter function is called with the expression value,and the return value of that call becomes the final value of the expression.
- The key thing to understand about filters is that they’re really nothing but plain functions. They take the value of the input expression,and return another value, which will become the value of the output expression (or the input of the next filter).

### filter filter
- In a nutshell, the purpose of the filter filter is to filter arrays that you use in expressions into some subset.
- You specify a criteria for the items that you want to match in an array,and the result of the expression is another array of only the items that matched your criteria. It’s a bit like querying arrays for items that match certain patterns.

### custom comparator
- This is different from providing a filter predicate function.
- Whereas a filter predicate decides, based on arbitrary criteria, whether a given item should pass the filter or not, a comparator function compares a given item to the filter value(or a part of it) and decides how they should be compared.

### Expressions And Watchers
    A few powerful optimizations: Constant detection, One-time binding and input tracking.
    
    Using expression strings in watches enables us to add a new optimization that will in some cases make the digest loop go faster. In the previous section we saw how constant  expressions have their constant flag set to true. A constant expression will always return the same value. This means that after a watch with a constant expression has been triggered for the first time, it’ll never become dirty again. That means we can safely remove the watch so that we don’t have to incur the cost of dirty-checking in future digests


## Modules And Dependency Injection

    While modules are where you register your components, no components are actually created until you create an injector and give it some modules to instantiate.

**多次注册名称相同的模块，会导致后注册的模块覆写前面的模块**

```
invoke queue: an array of arrays
[
	[service,method,arguments]
]
```
injector:
To invoke functions and construct objects and automatically look up the dependencies they need.


Provider的作用
Providers are objects that know how to make dependencies. They’re useful when you actually need to run some code when constructing a dependency. They’re also useful when your dependency has other dependencies, which you’d also like to have injected.

Provider两种创建方式
1.The Simplest Possible Provider: An Object with A $get Method (actually,this method should return an object)
2.Provider Constructor: when instantiated, results in an object with a $get method you can inject other providers to a provider constructor
3.angular实现中，还包含支持对象方式创建，key为名称，value为构造函数(或者provider对象？)

lazy instantiation of dependencies:
依赖的注册可以以任意顺序
解决依赖在创建过程中,该依赖所依赖的其他依赖已经被registered.(被依赖的对象在依赖对象之后注册)
Instead, the injector invokes those $get methods lazily, only when their return values are needed.



The provider constructor is instantiated right when its registered.
If some of its dependencies(another provider or constant) have not been registered yet, it won’t work.

Turns out you can’t just inject either providers or instances anywhere you please.

provider constructors only have other providers and constants available for injection.

1. while you can inject a provider to another provider’s constructor, you should not be able to inject an instance there
2. while you can inject instances to the $get method, you should not be able to inject providers there
3. You should also not be able to inject providers to a function you call using injector.invoke
4. Nor should you even be able to call injector.get to obtain access to a provider

- **The injection that happens between provider constructors only deals with other providers.**
- **The injection that happens between $get methods and the external injector API only deals with instances.**

The two injectors we now have implement two different phases of dependency injection.
1. Provider injection happens when providers are registered from a module’s invoke queue. After that, there will be no more changes to providerCache.
2. At runtime there’s instance injection, which happens whenever someone calls the injector’s external API.
   The instance cache is populated as dependencies are instantiated, which happens in the fallback function of instanceInjector.

$provide is only available on provider injection


A value’s hash key uniquely identifies it, and no other value of any type should have the same hash key. Generally, a value’s hash key has two parts to it: The first part designates the type of the value and the second part designates the value’s string representation.


Since you can access a provider before its $get method is called, you can aect how dependency instantiation happens. A config block is an arbitrary function that has its dependencies injected from the provider cache.


The main difference between config blocks and run blocks is that run blocks are injected from the instance cache.

The purpose of run blocks is not to configure providers - you can’t even inject them here - but to just run some arbitrary code you want to hook on to the Angular startup process.


To sum up, config blocks are executed during module loading and run blocks are executed immediately after it. When you register a module with the same name several times, the new module replaces any old ones.

The difference between a value and a constant is that values are not available to providers or config blocks. They are strictly for instances only.

Decorators
You use a decorator to modify some existing dependency.
What’s neat about decorators is how you can use them to modify dependencies you yourself did not create.
You can register a decorator for a dependency provided by some library, or by core Angular itself.


createInjector过程包括调用模块的_invokeQueue,_configBlocks,_runBlocks,最后返回instanceInjector

## Utilities

### Promises

Programming with callbacks has some issues that may result in a lot of unnecessary complexity:
  1.Callback-style APIs conflate business logic with implementation details.
  2.When there are many asynchronous callbacks involved, control flow becomes difficult to follow, as well as cumbersome to write and maintain.
  3.There is no established approach to dealing with errors.

Promises are essentially a mechanism that bundles the future results of an asynchronous call into an object. The Promise object gets you access to that value once it becomes available.

Promises address the conflation of bundles logic with callbacks by separating callback arguments from regular function arguments.
Promises address the "pyramid of doom" problem by supporting **chaining**.
Promises address the problem of ad hoc error handling by having an explicit API for error.

With $q everything happens within an Angular digest, so you don't have to worry about calling scope.$apply. Furthermore, whereas many Promise libraries use things like setTimeout to make things asynchronous, $q can simply use $evalAsync.

#### Defferred and Promise
If Promise is a promise that some value will become available in the future,
a Deferred is the computation that makes that value available.

It should be perfectly OK to register a Promise callback when the Deferred is already resolved, and still have that callback be invoked.

More generally, the order independence is achieved by the fact that when you call resolve, Promise callbacks are not invoked immediately. Promise callbacks get called during the next digest after resolving the Deferred. Hence, Angualr resolves Promises at digest time.

#### Promise's resolution and rejection
One important feature of Deferreds is that they only ever get resolved once.
When a Deferred has been resolved to a value, it will never be resolved to any other value. Promise callbacks also get invoked at most once.

Whenever a digest runs and the Promise has been resolved, any callbacks that haven't been invoked yet are invoked. And each callback gets called just once.

You also cannot resolve something you have already rejected (and vice versa). Effectively, a Promise can only ever have one outcome, which is a resolution or a rejection

#### Promise chaining
The simplest form of Promise chaining is just attaching several then  callbacks back to back. Each callback receives the return value of the previous one as its argument.

Another point about chaining is that when there is a rejection, the next catch handler will actually catch it, and the catch handler's own return value will be treated as resolution, not a rejection.

Each chained then calls create a new Defferred and a new Promise. The new Defferred is independent from the original, but is resolved when the original one is resolved.

An important aspect of chains is how they transitively pass forward a value until a callback handler is found. For instance, when a Promise only has an success handler, its rejection is passed to the next Promise in the chain, whose error callbacks will get the rejected value. This happens not only with rejections, but also with resolutions.

Another point about chaining is that when there is a rejection, the next catch handler will actually catch it, and the catch handler's own return value will be treated as resolution, not rejection.

When an exception is thrown from a Promise callback, this should cause the next rejection handler in the chain to be invoked.

So, when a Promise callback returns a value, that value becomes the resolution of th next Promise in the chain. And when a Promise callback throws an exception, that exception becomes the rejection of the next Promise in the chain.

A Deferred may be resolved with another Promise, and in that case the Deferred's resolution is dependent on the resolution of the other Promise.

#### Finally method
The finally method takes a callback, in which you can do whatever cleanup work you need to do at the end of your asynchronous task. The callback is invoked when the Promise is resolved, and it will not receive any arguments.

An important aspect of finally is that its return value should be ignored. Finally is only meant for cleaning up resources and it does not participate in the formation of a Promise chain’s eventual value. That means that any value a Promise chain has been resolved to should flow through intermediate finally handlers untouched.


#### Working with Promise Collections - $q.all
The $q.all method takes a collection of Promises as its input. It returns a single Promise that resolves to an array of results. The resulting array has an item for each of the Promises in the argument array. This makes $q.all a very useful tool for waiting on a number of simultaneous asynchronous tasks to finish.
What should $q.all do when one or more of the Promises given to it are rejected? What it does is reject the returned Promise. You effectively lose the results of all the Promises if one of them rejects.
Not every item in the collection given to $q.all actually has to be a Promise.

#### ES6-Style Promises
With ES6 promises you replace this:

var deferred = Q.defer();
doAsyncStuff(function(err){
  if(err){
    deferred.reject();
  }else{
    deferred.resolve();
  }
});
return deferred.promise;

With this:

return new Promise(function(resolve,reject){
  doAsyncStuff(function(err){
    if(err){
      reject(err);
    }else{
      resolve():
    }
  });
});

#### Promises without $digest intergration: $$q
$$q is used by Angular internally by the $timeout and $interval services when you invoke them with the skipApply flag. It is also used by ngAnimate for some of its async work.

#### Promise的一些总结

1. Promise被rejected的情况:
  * 调用deferred.reject()
  * 在Promise chain中，上一个Promise的callback抛出异常
  * 在Promise chain中，上一个Promise的callback返回$q.reject();
2. What if a Promise callback returns another Promise?
    We should connect the Promise returned by the callback to the next callback in the chain.

### $http

$http Promise 被rejected的情况：
1.返回码大于等于200，且小于等于300
2.请求失败，没有任何response返回（比如：网络故障，CORS限制，明确地中止请求）

Headers are needed for all kinds of information we want the server to konw about, like authentication tokens, preferred content types, and HTTP cache control.

If $http encounters a function as a header value, it invokes that function, giving it the request configration object as an argument.

Most of the things that need to be done with CORS don't actually involve JavaScript code, It's pretty much all done between the web server and the web browser. By default, cross-domain requests do not include any cookies or authentication headers. If either of those is needed, the withCredentials flag needs to be set on the XMLHttpRequest.

#### Request Transforms
When you communicate with a server, you often need to preprocess your data 
somehow so that it is in a format that the server can understand ,such as
JSON,XML,or some custom format.
A request transform is a function that will be invoked with the request's body before it's sent out. The return value of the transform will replace the original request body.  

#### Response Transforms
It can be useful to transform responses when they arrive from the server, before they are handed to application code. A typical use case for this would be parsing data from some serialization format to live JavaScript objects.

#### JSON Serialization And Parsing
If you attach a JavaScript object/array as the request data, what goes into the actual request is a JSON-serialized representation of that object.

A couple of exceptions: Blob, FormData, File

If the server indicates a JSON content type in the respose, what you get as the response data is JavaScript data structure parsed from the response. Angular also try to parse responses as JSON if they look like JOSN, even when the server fails to indicate their content type as JSON.

#### URL Parameters
Some URL parameters will have characters in them that are not safe to append to a URL directly. This includes characters like = and & because they would be confused by the parameter separators themselves. For this reason, both the names and values of the parameters need to be escaped before they’re appended.

If there are many parameters included whose values are null or undefined, they are left out of the resulting URL.


HTTP supports having multiple values for a given parameter name in query parameters. This is done by just repeating the parameter name for each of the values. ( ?a=42&a=43 )

#### Interceptors

Interceptors are a more high-level and fully-featured API than transforms, and really allow for any arbitrary execution logic to be attached to HTTP request and response processing. With interceptors you can freely modify or replace requests and responses. Since interceptors are Promise-based, you can do asynchronous work in them - something you cannot do with transforms.

Interceptors are created by factory functions. To register an interceptor, you need to append its factory function into the interceptors array held by $httpProvider. This means interceptor registration must happen at configuration time. Once the $http service is created, all registered interceptor factory functions are invoked.

How interceptors are registered? 
How interceptors are integrated into the $http's request proccessing?

Interceptors are objects that have one or more of four keys: request, rquestError, response, and responseError. The values of those keys are functions that get called at different points during the processing of an HTTP request.


The requestError methods are invoked when something goes wrong before the request is actually sent out, which is to say, there's an error in one of the preceding interceptors.

Response error interceptors will catch errors that happen after we have an HTTP response. Just like response interceptors, they are invoked in reverse order, so they receive errorsfrom either the actual HTTP response, or from response interceptors registered before them.

##Directives

The idea of directives is simple but powerful: An extensible DOM. In addition to the HTML elements and attributes implemented by browsers and standardized by the W3C, we can make our own HTML elements and attributes with special meaning and functionality.

### DOM Compilation and Basic Directives


The process of applying directives to the DOM is called compilation, the DOM compiler takes DOM structures as input and produces transformed DOM structures as output.

There may be several directives with the same name. So, you cannot override a directive by just providing  another directive with the same name. To alter an existing directive you'll need to use a decorator.

The argument given to $compile is by no means limited to a single DOM element. It can, for example, be a collection of several elements.


So, unlike with other kinds of components, you cannot override a directive by just providing another directive with the same name. To alter an existing directive you’ll need to use a decorator. The reason for allowing multiple directives with the same name is that directive names are used for matching them with DOM elements and attributes.

Prioritizing Directives

When multiple directives are used on an element, the order in which they're applied often makes a big difference. One directive may depend on the effects of another to be already applied.

Every directive definition object has a priority attribute, and for each node all the matched directives are sorted by this attribute before they’re compiled.

1.Priorities are numeric, and a larger number means higher priority - i.e. for compilation, directives are sorted in descending order by priority.
2.When two directives have the same priority, the tie is broken by comparing by name, so that even when priorities are the same, the application order is stable and predictable
3.When there are two directives for which both priorities and names are the same, they are applied in the order in which they were registered

Basically, the ng-attr- prefix and -start suffix cannot be used at the same time.

1.巧妙处理一个名称对应多个指令
2.巧妙的处理嵌套的my-dir-start指令

使用decorator来修改一个已存在的directive

1.注册指令
2.获得指令
3.应用指令

Terminal directive：
it terminates the compilation right away, and any further directives on the element are not compiled.



## Directive Attributes
Attributes can be used to configure directives and to pass information to them. Directives also often manipulate the attributes of their elements to change how they look or behave in the browser.In addition to this, attributes also provide a means for directive-to-directive communication, using a mechanism called observing.

Boolean attributes are special in that they don't really have an explicit value. Their mere presence in an element means they should be interpreted as "true".


The attributes object is shared by all the directives of an element. The Attributes object provides a means of communication between the directives of a single element. Attribute changes made by one directive can be seen by another.

It would also be useful for one directive to get notified of an attribute change made by another directive, so that when a change happens we would know right away. Attribute observing is a traditional application of the Observer Pattern. 

Note that $observers do not react to attribute changes that happen outside of the Attribute object.If you set an attribute to the underlying element using jQuery or raw DOM access, no $observers will fire.


The class manipulation in Attributes also intergrates tightly with the Angular animation system.

Notes
1. when there is a class directive, that directive’s name will be present in attributes.
2. so do comment directives. (there may only be one directive per comment node)



## Directive Linking and Scopes
Linking is the process of combining the compiled DOM tree with scope objects. By association, this combines the DOM tree with all the application data and functions attached to those scope objects, as well as the watch-based dirty checking system.

In general, applying Angular directives to a DOM tree is a two-step process:
  1.Compile the DOM tree
  2.Link the compiled DOM tree to Scopes

When you call $compile, no linking occurs. Instead, when you call $compile, it returns you a function that you can call later to initiate linking. This function is called the public link function.

Public link function
The main job of the public link function is to initiate the actual linking of directives to the DOM. This is where directive link functions come in.


-The public link function is used to link the whole DOM tree that we’re compiling
– The composite link function links a collection of nodes
* The node link function links all the directives of a single node
· The directive link function links a single directive.

When you have a DOM tree with directives on serveral levels, the directives on lower levels will actually get linked first.

Within one element: Prelink functions are called in the directive priority order, but postlink functions should actually be called in reverse directive priority order.

#### Linking And Scope Inheritance
When there is at least one directive on an element that requests an inherited scope, all directives on that element will receive that inherited scope.

When there is scope inheritance involved with an element, two things are attached to the element:
  1.An ng-scope CSS class
  2.The new Scope object as jQuery/jqLite data

Directives may ask new scopes to be created, in which case the elements where the directives are applied - as
well as all of their children - get the inherited scope.

#### Isolate Scopes

  Scope inheritance
  1.prototype inheritance
  2.non-prototypal, isolated inheritance

Isolate scopes are scopes that participate in the scope hierarchy but do not inherit the attributes of their parents.
They participate in event propagation and digest cycles along with other scopes,
but you cannot use them to share arbitrary data from parents to descendants.
When you use an isolate scope with a directive, it is easier to make the directive more modular, as you can make sure
that your directive is more or less isolated from its surrounding environment.

    1.The scope of that directive will be a child of the scope from the surrounding context, but it will not prototypally inherit from it

    2.An important point about isolate scope directives, which makes them different from plain inherited scope directives, is that if one directive uses an isolate scope, that scope is not given to other directives on the same element. The scope is isolated for the directive, not for the whole element. The same rule also applies to the children of the element. The children are not given the isolate scope.(There are exceptions to this rule: Sometimes the children of an element do share the isolate scope. This happens when the children are created by the isolated directive’s own template)

    3.The isolate scope is not shared with other directives on the same element or child elements,Furthermore, only one directive on an element is allowed to make an isolate scope for itself.Trying to use more than that will throw during compilation.

    4.Actually, if there is a directive with an isolate scope on an element, other directives are not allowed to have even non-isolated, inherited scopes. 

    5.Applying an isolate scope directive causes the element to receive the ng-isolate-scope CSS class.(whereas it will not receive the ng-scope class) and the scope object itself as jQuery data with the $isolateScope key.


####Isolate Attribute Bindings

1.Have scope attributes that are bound to values in the element's attributes. These scpe attributes will be observed using the attribute observer mechanism. so that whenever the element's attribute is $set, the scope attribute gets updated.

#### Controller
Controllers in AngularJS are always created using constructor functions. Controllers are instantiated for each directive individually, and there are no restrictions about having serveral directives with different controllers on the same element.

Controllers are instantiated for each directive individually, and there are no restrictions about having several directives with different controllers on the same element. 

An interesting additional feature of directive-controller integration is that when you have an attribute directive
and specify the controller name as the string '@', the controller is looked up using the value of the directive attribute
in the DOM. This can be useful when you want to specify the directive controller not when the directive is registered, but
when the directive is used. Effectively, this allows you to plug in different controllers for the same directive.

##### Attaching Directive controllers on The Scope
This enables the application pattern of publishing controller data and functions on this instead of $scope while still make
them available to interpolation expression in the DOM, as well as child directives and controllers.

#### Templates
A directive may define a template attribute in its directive definition object.
An isolate scope is only ever used for directive that asks for it - not for other directives on the element or its children.
When a directive defines both an isolate scope and a template, the directives used inside the template will receive the isolate scope (or one of its descendants).

No more than one directive to apply a template to the same element.



#### Interpolation
What interpolation adds to it is a way to easily attach the value of the expression into the DOM, and to automatically update the DOM when the expression’s value changes over time.



#### Transclusion
Transclusion allows passing a DOM structure to a directive, and lets the directive decide where and how to internally use it. The transclusion function is really a link function.



独立作用域: $parent指向父scope对象，但是原型链不指向父scope的prototype


[
 {
  nodeLinkFn:nodeLinkFn,
  childLinkFn:{
   nodeLinkFn:nodeLinkFn,

  },
  idx:i
 }
]














































