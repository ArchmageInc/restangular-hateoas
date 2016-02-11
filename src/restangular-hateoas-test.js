/* global jasmine, expect, _, Object, Function */

(function () {
    'use strict';
    describe('Restangular HATEOAS module > ', function () {
        function init(mocks) {
            mocks = _.extend({}, mocks);
            var inj = {};
            _.defaults(mocks, {

            });
            module('restangular-hateoas', function ($provide, HateoasConfigurationProvider) {
                _.forEach(mocks, function (mock, mockName) {
                    $provide.constant(mockName, mock);
                    inj[mockName] = mock;
                });
                inj.HateoasConfigurationProvider = HateoasConfigurationProvider;
            });
            inject(function ($rootScope, $timeout, HateoasConfiguration, HateoasApi, HateoasCommon) {
                _.defaults(inj, {
                    $scope: $rootScope.$new(),
                    $timeout: $timeout,
                    HateoasConfiguration: HateoasConfiguration,
                    HateoasApi: HateoasApi,
                    HateoasCommon: HateoasCommon
                });
            });

            return inj;
        }

        function mockRestangularElement(data, childData, url) {
            return _.merge({
                $restangularElement: true,
                all: jasmine.createSpy('all').andReturn({
                    getList: jasmine.createSpy('getList').andReturn(mockPromise(childData))
                }),
                getRestangularUrl: jasmine.createSpy('getRestangularUrl').andReturn(url),
                $object: {}
            }, data);
        }

        function mockRestangularCollection(data) {
            var collection = [];
            return _.merge(collection, data, {
                $restangularCollection: true,
                $object: []
            });
        }

        function mockThen(reject, data, sFn, eFn) {
            if (reject) {
                eFn(reject);
            } else {
                sFn(data);
            }
            return mockPromise(data, reject);
        }

        function mockCatch(reject, eFn) {
            if (reject) {
                eFn(reject);
            }
        }

        function mockFinally(fFn) {
            fFn();
        }

        function mockPromise(data, reject) {
            return {
                then: _.partial(mockThen, reject, data),
                catch: _.partial(mockCatch, reject),
                finally: _.partial(mockFinally),
                $object: {
                    then: _.partial(mockThen, reject, data)
                }
            };
        }

        describe('Configuration > ', function () {
            it('Allows setting configuration options as a hash', function () {
                var inj = init();

                inj.HateoasConfigurationProvider.setConfiguration({
                    map: {
                        service: 'firstTest',
                        save: 'secondTest'
                    }
                });
                

                expect(inj.HateoasConfiguration.map.service).toEqual('firstTest');
                expect(inj.HateoasConfiguration.map.save).toEqual('secondTest');
            });

            it('Allows setting configuration options individually', function () {
                var inj = init();

                inj.HateoasConfigurationProvider.setConfiguration('map.service', 'thirdTest');
                expect(inj.HateoasConfiguration.map.service).toEqual('thirdTest');
            });

            it('Does not error if invalid set paramaters are sent', function () {
                var inj = init();

                expect(_.partial(inj.HateoasConfigurationProvider.setConfiguration, 5, 'forthTest')).not.toThrow();
            });
        });
        describe('Common Utilities > ', function () {
            describe('getId() > ', function () {
                it('Pulls the id from the restangularUrl of an element', function () {
                    var inj = init(),
                        element = {
                            getRestangularUrl: _.constant('http://somedomain.com:443/somepath/myId')
                        };

                    expect(inj.HateoasCommon.getId(element)).toEqual('myId');
                });
                it('Returns the id if a url string is passed', function () {
                    var inj = init(),
                        url = 'http://somedomain.com:443/somepath/myId';

                    expect(inj.HateoasCommon.getId(url)).toEqual('myId');
                });
                it('Returns undefined with no paramaters', function () {
                    var inj = init();

                    expect(inj.HateoasCommon.getId()).toBeUndefined();
                });
                it('Returns undefined if not passed a proper url', function () {
                    var inj = init(),
                        url = 'somedomain.com';

                    expect(inj.HateoasCommon.getId(url)).toBeUndefined();
                });

            });
            describe('applyHateoasChild() > ', function () {
                it('Applies a configurable, non-enumerable, child property with a getter and setter', function () {
                    var inj = init(),
                        element = mockRestangularElement();

                    inj.HateoasCommon.applyHateoasChild(element, 'child');

                    expect(Object.getOwnPropertyDescriptor(element, 'child').configurable).toBeTruthy();
                    expect(Object.getOwnPropertyDescriptor(element, 'child').enumerable).toBeFalsy();
                    expect(Object.getOwnPropertyDescriptor(element, 'child').get).toEqual(jasmine.any(Function));
                    expect(Object.getOwnPropertyDescriptor(element, 'child').set).toEqual(jasmine.any(Function));
                });
                it('Applies a getter which returns a promise', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            data: 'mockData'
                        }, {
                            childData: 'mockChildData'
                        });

                    inj.HateoasCommon.applyHateoasChild(element, 'child');

                    expect(element.child.then).toEqual(jasmine.any(Function));
                    
                });
                it ('Applies a getter which assigns the value to the property after resolution', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            data: 'mockData'
                        }, {
                            childData: 'mockChildData'
                        }),
                        spy = jasmine.createSpy('check child').andCallFake(function (child) {
                            expect(child).toBe(element.child);
                        });

                    inj.HateoasCommon.applyHateoasChild(element, 'child');

                    element.child.then(spy);

                    expect(spy).toHaveBeenCalled();
                    expect(element.child.childData).toEqual('mockChildData');
                });
                it ('Will assign a value and remove the promise', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            data: 'mockData'
                        }, {
                            childData: 'mockChildData'
                        }),
                        child = {
                            newChildData: 'mockNewChildData'
                        };

                    inj.HateoasCommon.applyHateoasChild(element, 'child');

                    element.child = child;

                    expect(element.child.then).toBeUndefined();
                    expect(element.child).toBe(child);
                });
            });
            describe('cleanTemplatedLinks() > ', function () {
                it('Will remove templates from a url', function () {
                    var inj = init(),
                        url = 'http://somehost.com:443/somepath{?option,option,option}',
                        expectation = 'http://somehost.com:443/somepath';

                    expect(inj.HateoasCommon.cleanTemplatedLinks(url)).toEqual(expectation);
                });
                it('Will preserve existing query parameters', function () {
                    var inj = init(),
                        url = 'http://somehost.com:443/somepath?someparam=somevalue{&option,option,option}',
                        expectation = 'http://somehost.com:443/somepath?someparam=somevalue';

                    expect(inj.HateoasCommon.cleanTemplatedLinks(url)).toEqual(expectation);
                });
                it('Will recurse through an object and remove templates from all strings', function () {
                    var inj = init(),
                        url = 'http://somehost.com:443/somepath?someparam=somevalue{&option,option,option}',
                        expectation = 'http://somehost.com:443/somepath?someparam=somevalue',
                        links = {
                            first: url,
                            second: {
                                url: url
                            }
                        },
                        results = inj.HateoasCommon.cleanTemplatedLinks(links);

                    expect(results.first).toEqual(expectation);
                    expect(results.second.url).toEqual(expectation);
                });
                it('Will not affect non-strings', function () {
                    var inj = init(),
                        value = function () {},
                        url = 'http://somehost.com:443/somepath?someparam=somevalue{&option,option,option}',
                        expectation = 'http://somehost.com:443/somepath?someparam=somevalue',
                        links = {
                            first: url,
                            second: value
                        },
                        results = inj.HateoasCommon.cleanTemplatedLinks(links);

                    expect(links.second).toBe(value);
                    expect(links.first).toEqual(url);

                    expect(results.first).toEqual(expectation);
                    expect(results.second).toBeUndefined();
                });
            });
            describe('convertFromHateoas() > ', function () {
                it('Returns an unmodified object if it contains no links', function () {
                    var inj = init(),
                        element = mockRestangularElement(),
                        check = _.clone(element);

                    expect(inj.HateoasCommon.convertFromHateoas(element)).toEqual(check);
                });
                it('Applies link children', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            _links: {
                                firstChild: {
                                    href: 'firstLink'
                                },
                                secondChild: {
                                    href: 'secondLink'
                                }
                            }
                        });

                    inj.HateoasCommon.convertFromHateoas(element);

                    expect(element.firstChild).toBeDefined();
                });
                it('Does not recursivly get itself', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            _links: {
                                firstChild: {
                                    href: 'firstLink'
                                },
                                self: {
                                    href: 'selfLink'
                                }
                            }
                        });

                    inj.HateoasCommon.convertFromHateoas(element);

                    expect(element.self).toBeUndefined();
                });
                it('Applies links to existing children', function () {
                    var inj = init(),
                        element = mockRestangularElement({
                            child: {
                                data: 'value'
                            },
                            _links: {
                                child: {
                                    href: 'childLink'
                                }
                            }
                        });

                    inj.HateoasCommon.convertFromHateoas(element);
                    expect(element.child._links.self.href).toEqual(element._links.child.href);
                });
            });
            describe('isRestangularProperty() > ', function () {
                it('Returns true for defined restangular properties', function () {
                    var inj = init();

                    expect(inj.HateoasCommon.isRestangularProperty('$restangularCollection')).toBeTruthy();
                });
                it('Returns false for non-restangular properties', function () {
                    var inj = init();

                    expect(inj.HateoasCommon.isRestangularProperty('someOtherProperty')).toBeFalsy();
                });
            });
            describe('convertToHateoas() > ', function () {
                describe('Elements > ', function () {
                    it('Converts child objects to a url', function () {
                        var inj = init(),
                            child = mockRestangularElement({}, {}, 'childUrl'),
                            parent = mockRestangularElement({
                                child: child
                            }, {}, 'parentUrl'),
                            hateoasElement = inj.HateoasCommon.convertToHateoas(parent);

                        expect(hateoasElement.child).toEqual('childUrl');
                    });
                    it('Maintains non-object properties', function () {
                        var inj = init(),
                            element = mockRestangularElement({
                                stringProperty: 'value',
                                numericProperty: 42,
                                nullProperty: null,
                                dateProperty: new Date()
                            }),
                            hateoasElement = inj.HateoasCommon.convertToHateoas(element);

                        expect(hateoasElement.stringProperty).toEqual('value');
                        expect(hateoasElement.numericProperty).toEqual(42);
                        expect(hateoasElement.nullProperty).toEqual(null);
                        expect(hateoasElement.dateProperty).toEqual(jasmine.any(Date));
                    });
                    it('Converts empty strings to null', function () {
                        var inj = init(),
                            element = mockRestangularElement({
                                emptyString: ''
                            }),
                            hateoasElement = inj.HateoasCommon.convertToHateoas(element);

                        expect(hateoasElement.emptyString).toBeNull();
                    });
                });
                describe('Collections > ', function () {
                    it('Converts child objects to a url', function () {
                        var inj = init(),
                            child = mockRestangularElement({}, {}, 'childUrl'),
                            parent = mockRestangularCollection([
                                child
                            ]),
                            hateoasElement = inj.HateoasCommon.convertToHateoas(parent);

                        expect(hateoasElement[0]).toEqual('childUrl');
                    });
                });
                
            });
            describe('defineChildValue() > ', function () {
                it('Returns undefined if no object', function () {
                    var inj = init();

                    expect(inj.HateoasCommon.defineChildValue()).toBeUndefined();

                });
                it('Defines an enumerable, configurable, writable property', function () {
                    var inj = init(),
                        object = {};

                    inj.HateoasCommon.defineChildValue(object, 'child', 'value');
                    expect(Object.getOwnPropertyDescriptor(object, 'child').configurable).toBeTruthy();
                    expect(Object.getOwnPropertyDescriptor(object, 'child').enumerable).toBeTruthy();
                    expect(Object.getOwnPropertyDescriptor(object, 'child').writable).toBeTruthy();
                    expect(object.child).toEqual('value');
                });
            });
            describe('defineHiddenChildValue() > ', function () {
                it('Returns undefined if no object', function () {
                    var inj = init();

                    expect(inj.HateoasCommon.defineHiddenChildValue()).toBeUndefined();

                });
                it('Defines a non-enumerable, configurable, writable property', function () {
                    var inj = init(),
                        object = {};

                    inj.HateoasCommon.defineHiddenChildValue(object, 'child', 'value');
                    expect(Object.getOwnPropertyDescriptor(object, 'child').configurable).toBeTruthy();
                    expect(Object.getOwnPropertyDescriptor(object, 'child').enumerable).toBeFalsy();
                    expect(Object.getOwnPropertyDescriptor(object, 'child').writable).toBeTruthy();
                    expect(object.child).toEqual('value');
                });
            });
        });
    });
}());
