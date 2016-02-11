# Restangular-HATEOAS

[Martin Gontovnikas (mgonto)] (http://gon.to) created a very powerful and well though out angular module to consume REST APIs easily called [restangular](https://github.com/mgonto/restangular). 
Recently, I started a project to communicate to an API driven by [Spring Data REST](http://projects.spring.io/spring-data-rest). Out of the box, it implements HATEOAS/HAL, which is great.
The problem came in when I didn't want to have these hefty services with boiler plate traversal when all of the information was already right there.
I wanted a system which would grab a known endpoint, a user let's say, and whenever a hyperlinked property was needed, it would just go get it on it's own. 
Now if you have ever worked with relational data through an API on a large project which didn't implement hyperlinked properties, you may have run into a problem where an API request was megabytes in size.
This is not an ideal solution and a big driver in hyperlinked properties. The point of this module, is to simplify that interaction, by creating lazy-loaded, hyperlinked JavaScript object properties.
This way, if the property is not accessed, it does not need to send another request to the API, and at the same time, you don't need extremely large API requests. 

#Table of contents

- [Dependencies](#dependencies)
- [Purpose](#purpose)
- [Caveats](#caveats)
- [Providers](#providers)
  - [HateoasConfigurationProvider](#hateoasconfigurationprovider)
- [Services](#services)
  - [HateoasConfiguration](#hateoasconfiguration)
  - [HateoasApi](#hateoasapi)
  - [HateoasDecorator](#hateoasdecorator)
  - [HateoasCommon](#hateoascommon)

## Dependencies

- [AngularJS](https://angularjs.org)
- [Restangular](https://github.com/mgonto/restangular)
- [lodash](https://lodash.com/)

## Purpose

Let's say you have a data structure like this:

```json
{
    "id": "parent_id",
    "someProperty": "someValue",
    "someChild": {
        "id": "child_id"
        "childProperty": "childValue",
        "grandChild": {
            "id": "grandChild_id"
            "grandChildProperty": "grandChildValue"
        }
    },
    "relatedChildren": [
        {
            "id": "relatedChild1_id"
            "relatedChildProperty": "relatedChildValue"
        },
        {
            "id": "relatedChild2_id"
            "relatedChildProperty": "anotherRelatedChildValue"
        }
    ]
}
```

Your API might have the following endpoints:

* parents/parent_id
* parents/parent_id/someChild
* parents/parent_id/relatedChildren
* children/child_id
* children/child_id/grandChild
* grandChildren/grandChild_id
* relatedChildren/relatedChild1_id
* relatedChildren/relatedChild2_id

HATEOAS output from the parent endpoint ( *parents/parent_id* ) would look something like this:

```json
{
    "id": "parent_id",
    "someProperty": "someValue",
    "_links": {
        "self": {
            "href": "parents/parent_id"
        },
        "someChild": {
            "href": "parents/parent_id/someChild"
        },
        "relatedChildren": {
            "href": "prents/parent_id/relatedChildren"
        }
    }
}
```

This reduces request size by sending only the root object and linking to any child objects or collections. 
Traditionally, this can be handled with Restangular, though with some overhead. Imagine this AngularJS controller:

```javascript
angular.module('myModule', ['restangular'])
    .config(function (RestangularProvider) {
        RestangularProvider.setBaseUrl('http://myUrl');
    })
    .controller('myController', function ($scope, Restangular) {
        $scope.parent = Restangular.one('parent', 'parent_id').get().$object;
        $scope.child = Restangular.one('parent', 'parent_id').one('child').get().$object;
        $scope.grandChild = Restangular.one('parent', 'parent_id').one('child').one('grandChild').get().$object;
        $scope.relatedChildren = Restangular.one('parent', 'parent_id').all('relatedChildren').getList().$object;
    });
```

```html
<div ng-controller="myController">
    <div> Some Property: {{parent.someProperty}} </div>
    <div> Child Property: {{child.childProperty}} </div>
    <div> Grand Child Property: {{grandChild.grandChildProperty}} </div>
    <div>
        <div> Related Children: ( {{relatedChildren.length}} )</div>
        <div ng-repeat="relatedChild in relatedChildren">
            Related Child Property: {{relatedChild.relatedChildProperty}}
        </div>
    </div>
</div>
```

As you can see, there is a bit of a nuisance in getting all of these properties. 
This is exactly what this library aims to fix.
By dynamically assigning child links as object properties, they can be resolved through AngularJS's scope digest cycle.
This allows changing the template to access these properties without the need to modify the controller and have it fetch the needed data.
For example:

```javascript
angular.module('myModule', ['restangular-hateoas'])
    .factory('myApi', function (HateoasApi) {
        return new HateoasApi('http://myUrl');
    })
    .controller('myController', function (myApi) {
        $scope.parent = myApi.one('parent', 'parent_id').get().$object;
    });
```

```html
<div ng-controller="myController">
    <div> Some Property: {{parent.someProperty}} </div>
    <div> Child Property: {{parent.child.childProperty}} </div>
    <div> Grand Child Property: {{parent.child.grandChild.grandChildProperty}} </div>
    <div>
        <div> Related Children: ( {{parent.relatedChildren.length}} )</div>
        <div ng-repeat="relatedChild in parent.relatedChildren">
            Related Child Property: {{relatedChild.relatedChildProperty}}
        </div>
    </div>
</div>
```

In this way, the dynamic properties will initiate the HTTP GET requests by simply accessing them and resolve through the scope digest.
If during our development, we no longer needed the related children, for example, we simply remove it from the template, and the HTTP GET request will never be made.
In the traditional fashion, we would have to remove the *$scope.relatedChildren* and subsequent request as well in order to not have an unnecessary GET request.

## Caveats

While it is save to access any depth of linked children with a template and have it resolved through the scope digest, accessing them through JavaScript requires some additional care. 
Because objects may be passed through directives, service methods, etc... it is important to keep this in mind, just as one would when dealing with Restangular's promise fill objects.
Sending the promise fill object to the scope and template works well in its simple form, but consider the following traditional Restangular example:

```javascript
angular.module('myModule', ['restangular'])
    .controller('myController', function (Restangular) {
        $scope.parent = Restangular.one('parent', 'parent_id').get().$object;

        if ($scope.parent.someProperty === 'someValue' ) {
            $scope.isSomeValue = true;
        } else {
            $scope.isSomeValue = false;
        }
    });
```

*$scope.isSomeValue* would never be *true* because the parent has not yet been resolved during the predicate's examination. 
Therefore, it must be handled after promise resolution:

```javascript
angular.module('myModule', ['restangular'])
    .config(function (RestangularProvider) {
        RestangularProvider.setBaseUrl('http://myUrl');
    })
    .controller('myController', function (Restangular) {
        Restangular.one('parent', 'parent_id').get().then(function (parent) {
            $scope.parent = parent;
            if (parent.someProperty === 'someValue') {
                $scope.isSomeValue = true;
            } else {
                $scope.isSomeValue = false;
            }
        });
    });
```

So to must this be considered when using child properties dynamically loaded:

```javascript
angular.module('myModule', ['restangular-hateoas'])
    .factory('myApi', function (HateoasApi) {
        return new HateoasApi('http://myUrl');
    })
    .controller('myController', function (myApi, $q) {
        myApi.one('parent', 'parent_id').get().then(function (parent) {
            $scope.parent = parent;
            $q.when(parent.child).then(function (child) {
                if (child.childProperty === 'childValue') {
                    $scope.isChildValue = true;
                } else {
                    $scope.isChildValue = false;
                }
            });
        });
    });
```

Notice the use of *$q* to resolve the child property. While restangular-hateoas does attach a then onto its promise fill objects, it may or may not have already been resolved.
Therefore, it is safer to use *$q.when* while accessing child properties. 
However, this may become cumbersome when accessing grand children, great grand children, etc...
Because of this, resolved HATEOAS objects have a resolve method, which will allow waiting until all defined paths are resolved:

```javascript
angular.module('myModule', ['restangular-hateoas'])
    .factory('myApi', function (HateoasApi) {
        return new HateoasApi('http://myUrl');
    })
    .controller('myController', function (myApi) {
        myApi.one('parent', 'parent_id').get().then(function (parent) {
            $scope.parent = parent;
            parent.resolve(['child.grandChild']).then(function (grandChild) {
                if (grandChild.grandChildProperty === 'grandChildValue') {
                    $scope.isGrandChildValue = true;
                } else {
                    $scope.isGrandChildValue = false;
                }
            });
        });
    });
```

In the above example, the array passed into the *resolve* method gives an indication of the property paths that must be resolved.
While we do have access to the *parent* object within the resolve callback, it should be avoided as it introduces a race condition.
Consider the following:

```javascript
angular.module('myModule', ['restangular-hateoas'])
    .factory('myApi', function (HateoasApi) {
        return new HateoasApi('http://myUrl');
    })
    .controller('myController', function (myApi) {
        myApi.one('parent', 'parent_id').get().then(function (parent) {
            $scope.parent = parent;
            parent.resolve(['child.grandChild']).then(function (grandChild) {
                if (parent.child.childProperty === 'childValue') {
                    $scope.isChildValue = true;
                } else {
                    $scope.isChildValue = false;
                }
            });

            parent.child = {};
        });
    });
```

The *$scope.isChildValue* property can never be *true* because prior to it being resolved, the variable parent has been mutated.
To avoid this, again we rely on the *$q* service:


```javascript
angular.module('myModule', ['restangular-hateoas'])
    .factory('myApi', function (HateoasApi) {
        return new HateoasApi('http://myUrl');
    })
    .controller('myController', function (myApi, $q) {
        myApi.one('parent', 'parent_id').get().then(function (parent) {
            $scope.parent = parent;
            $q.all({
                parent: parent,
                child: parent.child,
                grandChild: parent.resolve(['child.grandChild'])
            }).then(function (resolutions) {
                var parent = resolutions.parent,
                    child = resolutions.child,
                    grandChild = resolutions.grandChild;

                if (child.childProperty === 'childValue') {
                    $scope.isChildValue = true;
                } else {
                    $scope.isChildValue = false;
                }

                if (grandChild.grandChildProperty === 'grandChildValue') {
                    $scope.isGrandChildValue = true;
                } else {
                    $scope.isGrandChildValue = false;
                }
            });

            parent.child = {};
        });
    });
```
While we are still mutating the parent object within the controller, the parent, child, and grandChild within our resolution callback are what is expected.
When going into this much depth, it may seem cumbersome, but it is no more than what would already exist when using traditional Restangular:

```javascript
angular.module('myModule', ['restangular'])
    .config(function (RestangularProvider) {
        RestangularProvider.setBaseUrl('http://myUrl');
    })
    .controller('myController', function (Restangular, $q) {
        $q.all({
            parent: Restangular.one('parent', 'parent_id').get(),
            child: Restangular.one('parent', 'parent_id').one('child').get(),
            grandChild: Restangular.one('parent', 'parent_id').one('child').one('grandChild').get()
        }).then(function (resolutions) {
            var parent = resolutions.parent,
                child = resolutions.child,
                grandChild = resolutions.grandChild;

            if (child.childProperty === 'childValue') {
                $scope.isChildValue = true;
            } else {
                $scope.isChildValue = false;
            }

            if (grandChild.grandChildProperty === 'grandChildValue') {
                $scope.isGrandChildValue = true;
            } else {
                $scope.isGrandChildValue = false;
            }
        });
    });
```
This provides a basic understanding of the purpose and use of restangular-hateoas, how it can simplify the use of view models attached to scope, and the slight differences in handling resolutions.

## Providers

### HateoasConfigurationProvider

A global restangularHateoas configuration which is used to assign instantiated services' additional properties

#### Methods

* **setConfiguration(property:String, value:*)** - Set a configuration property to a specified value
* **setConfiguration(configuration:Object)** - Merge existing configuration with specified options
* **getConfiguration()** - Retrieve a copy of the existing configuration object

**Configuration:**
```javascript
{
    map: { // A map of key value pairs defining method names and overrides
        restangularCollection:  '$restangularCollection', // The property name defining if an object is a collection
        restangularElement:     '$restangularElement', // The property name defining if an object is an element
        save:                   '$restangularSave', // The re-mapped key name for restangular's save method
        service:                '$restangularService', // The re-mapped key name for restangular's service method
        embedded:               '_embedded', // The expected container array key name for collection endpoints
        links:                  '_links', // The expected key name for non-embedded link references
        selfLink:               '_links.self.href', // The path to the object's endpoint
        nextLink:               '_links.next.href', // The path to a collection's endpoint to retrieve the next page of results
        original:               '_original', // The property name which will contain an object's original values as sent by the API
        changed:                '_changed', // The property name indicating if the object has been mutated
        fromServer:             '_fromServer', // The property name indicating if the object was retrieved / exists on the API server
        hiddenPromise:          '_promise' // The property name containing the hidden promise for fetching 
    }
}
```

## Services

### HateoasConfiguration

The configuration service injected into HateoasApi instances

#### Properties

* **map** - The configuration object storing property keys. see [HateoasConfigurationProvider](#HateoasConfigurationProvider)

### HateoasApi

*(CLASS) Injectable*

An API communication layer to a specific REST server

#### Methods

* **constructor(baseUrl:String):HateoasApi** - Instantiate an API communication service with the base URL
* **setAuthToken(token:String):undefined** - Set the authorization token for the instance to use for HTTP requests

#### Properties

* **authorization** - An authorization object used to authenticate HTTP requests
* **ModelService** *(CLASS)* (see [ModelService](#ModelService))

### ModelService

*(CLASS) Not Injectable*

An API communication layer to a specific endpoint of a REST server

### Methods
* **constructor(route:String, [modelDefaults:Object, configuration:Object]):ModelService** - Instantiate a model service for a given endpoint / route
* **create([properties:Object]):modelInstance** - Create a restangular element from this service's endpoint (see [ModelInstance](#modelInstance))

#### Properties

* **_modelDefaults** - An object containing the default property values for created elements
* **_route** - The route governed by the service instance

###modelInstance

*Not Injectable*

An element created through a call to a ModelService instance's create method. This is a restangular element.

#### Methods

* **getId():String** - A method to retrieve the element's id
* **save():[Promise](#PromiseFill)** - A method which will POST for new elements and PATCH changed properties for existing elements
* **revert():modelInstance** - A method which will modify the elements properties and reset them to the last state communicated to or from the REST server
* **getChangedProperties():Object** - A method which will return an object containing only the properties and values that have changed since the last communication to or from the REST server
* **resolve(propertyPaths:Array):[Promise](#PromiseFill)** - A method which will attempt to resolve the element / child element properties from the paths provided. The promise will resolve with the element once all paths have been resolved
* **get([queryParams:Object, headers:Object]):[Promise](#PromiseFill)** - A method to get the element. This is a passthrough to restangular element's get method.
* **getList(subElement:String, [queryParams:Object, headers:Object]):[Promise](#PromiseFill)** - A method to get a nested collection. This is a passthrough to restangular element's getList method.
* see [Restangular Element Methods](https://github.com/mgonto/restangular/blob/master/README.md#element-methods)

#### Properties

* **$restangularCollection:Boolean** *(FALSE)* - Is this object a restangular collection
* **$restangularElement:Boolean** *(TRUE)* - Is this object a restangular element
* **_changed** - Has this object changed since the last communication to / from the REST server

### collectionInstance

*Not Injectable*

A collection created by retrieving a set of elements from a REST server. This is a restangular collection.

#### Methods

* **hasNext():Boolean** - Returns true if the collection has more results not loaded from the REST server
* **getNext([queryParams:Object]):[Promise](#PromiseFill)** - Fetches the next page of results from the REST server and appends them to the collection. The promise will resolve with the current collection once the next page has been fetched.
* **resolve(propertyPaths:Array):[Promise](#PromiseFill)** - A method which will attempt to resolve the properties from the paths provided for all element members. The promise will resolve with the collection once all paths for all elements have been resolved
* **get([id:String]):Promise** - A method to get an element from the collection. This is a passthrough to restangular collection's get method.
* **getList([queryParams:Object, headers:Object]):[Promise](#PromiseFill)** - A method to get the collection again. This is a passthrough to restangular collection's getList method.
* see [Restangular Collection Methods](https://github.com/mgonto/restangular/blob/master/README.md#collection-methods)

#### Properties

* **$restangularCollection:Boolean** *(TRUE)* - Is this object a restangular collection
* **$restangularElement:Boolean** *(FALSE)* - Is this object a restangular element
* **_changed** - Has this object changed since the last communication to / from the REST server

### PromiseFill

*Not Injectable*

The promise fill object are temporary accessors to what will be an element or collection.
see [Restangular Enhanced Promises](https://github.com/mgonto/restangular/blob/master/README.md#enhanced-promises).
This library uses these promise fill objects to allow sending an element to the template and allowing Angular's scope digest to force the resolution of linked properties.
Restangular's promise fills are enhanced by making them "thenable" and able to be resolved using the $q service.
see [Angular's $q Service](https://docs.angularjs.org/api/ng/service/$q)

#### Methods

* **then(successCallback:Function, [errorCallback:Function]):Promise** - A method to chain actions once a resolution is finished.
* **catch(errorCallback:Function):[Promise](#PromiseFill)** - A method to catch errors in the promise chain.
* **finally(callback:Function)** - A method to execute once the promise chain is complete regardless.

#### Properties

* **$object:Array** - The promise fill object which can be sent to the scope. It is an array because an Array is an Object, but an Object is not an Array. There is no way for the system to know if a child property will be a collection or an element. 

### HateoasDecorator

*Injectable*

A utility used by the HateoasApi service to decorate restangular elements and collections.

#### Methods

* **decorate(restangularObject:Object, isCollection:Boolean):Object** - The entrypoint to decorate a restangular object. Returns the mutated object.
* **decorateElement(restangularElement:Object):Object** - The entrypoint to decorate a restangular element. Returns the mutated element.
* **decorateCollection(restangularCollection:Array):Array** - The entrypoint to decorate a restangular collection. Returns the mutated collection.

### HateoasCommon

*Injectable*

A collection of utility methods used throughout the library to manipulate HATEOAS objects, links, and properties.

#### Methods

* **getId(restangularElement:Object):String** - The common method used to get an element's ID
* **applyHateoasChild(restangularElement:Object, childName:String)** - Used to apply the dynamic promise fill for a linked child object.
* **cleanTemplatedLinks(links:Object|String):Object|String** - Used to parse link templates and remove template structures.
* **convertFromHateoas(restangularObject:Object):Object** - Used to apply lazy-loading promise fills for linked child objects. Returns the mutated object.
* **convertToHateoas(restangularObject:Object|Array):Object|Array** - Used to replace nested child objects with HATEOAS references. Returns an object for restangular elements, and an array for collections.
* **isRestangularProperty(propertyName:String):Boolean** - Used to determine if a property is part of the system's operation.
* **defineChildValue(object:Object, childName:String, value:*):Object** - Used to apply a property with *childName*, having *value* to *object*. Returns the mutated object.
* **defineHiddenChildValue(object:Object, childName:String, value:*):Object** - Used to apply a non-enumerable, property with *childName*, having *value* to object. Returns the mutated object.


##TL;DR;

The Restangular-HATEOAS module builds Restangularized objects with dynamic linked properties which will lazy-load when accessed.

*_(WIP)_*


