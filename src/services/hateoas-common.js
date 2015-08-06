/* global angular, Object, _ */

(function (angular, Object, _) {
    'use strict';
    angular.module('restangular-hateoas')
    .factory('HateoasCommon', function (hateoasConfiguration) {
        var map = hateoasConfiguration.map;

        var HateoasCommon = {
                getId: function (restangularElement) {
                    if (!restangularElement) {
                        return;
                    }
                    var url = _.isString(restangularElement) ? restangularElement : restangularElement.getRestangularUrl(),
                        match = url.match(/\/(?:.(?!\/))+$/);

                    return match ? match[0].substr(1) : undefined;
                },
                applyHateoasChild: function (restangularElement, childName) {
                    Object.defineProperty(restangularElement, childName, {
                        enumerable: false,
                        configurable: true,
                        get: function () {
                            var promise = restangularElement.all(childName).getList(),
                                promiseFill = promise.$object;

                            HateoasCommon.defineChildValue(restangularElement, childName, promiseFill);
                            HateoasCommon.defineChildValue(restangularElement.$object, childName, promiseFill);

                            promise = promise.then(function (childObject) {
                                HateoasCommon.defineChildValue(restangularElement, childName, childObject);
                                HateoasCommon.defineChildValue(restangularElement.$object, childName, childObject);

                                return childObject;
                            });

                            HateoasCommon.defineChildValue(promiseFill, 'then', promise.then);
                            HateoasCommon.defineHiddenChildValue(promiseFill, map.hiddenPromise, promise);

                            return promiseFill;
                        },
                        set: function (value) {
                            HateoasCommon.defineChildValue(restangularElement, childName, value);
                            return value;
                        }
                    });
                },
                cleanTemplatedLinks: function (links) {
                    if (_.isPlainObject(links)) {
                        var returnLinks = {};
                        _.forEach(links, function (link, key) {
                            returnLinks[key]   =   HateoasCommon.cleanTemplatedLinks(link);
                        });
                        return returnLinks;
                    }

                    if (_.isString(links)) {
                        return links.replace(/(.+)\{[\?|&].+\}/, '$1');
                    }
                },
                convertFromHateoas: function (restangularObject) {
                    if (!_.get(restangularObject, map.links)) {
                        return restangularObject;
                    }

                    _.set(restangularObject, map.links, HateoasCommon.cleanTemplatedLinks(_.get(restangularObject, map.links)));
                    _.forEach(_.get(restangularObject, map.links), function (childLink, childName) {
                        if (childName !== 'self' && !_.get(restangularObject, childName)) {
                            HateoasCommon.applyHateoasChild(restangularObject, childName);
                        } else if (_.get(restangularObject, childName)) {
                            _.set(restangularObject, childName + '.' + map.selfLink.substring(0, map.selfLink.lastIndexOf('.')), childLink);
                        }
                    });
                    return restangularObject;
                },
                isRestangularProperty: function (propertyName) {
                    return !!_.includes(_.values(map), propertyName);
                },
                convertToHateoas: function (restangularObject) {
                    var result = _.get(restangularObject, map.restangularCollection) ? [] : {};
                    _.forEach(restangularObject, function (value, propertyName) {
                        if (_.isPlainObject(value) && _.get(value, map.restangularElement)) {
                            _.set(result, propertyName, value.getRestangularUrl());
                        }
                        if (_.isDate(value)) {
                            _.set(result, propertyName, value);
                        }
                        if (!HateoasCommon.isRestangularProperty(propertyName) && (_.isNull(value) || !_.isObject(value))) {
                            _.set(result, propertyName, value);
                        }
                        if (value === '') {
                            _.set(result, propertyName, null);
                        }
                    });
                    return result;
                },
                defineChildValue: function (object, childName, value) {
                    if (!object) {
                        return;
                    }
                    Object.defineProperty(object, childName, {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: value
                    });
                    return object;
                },

                defineHiddenChildValue: function (object, childName, value) {
                    if (!object) {
                        return;
                    }
                    Object.defineProperty(object, childName, {
                        enumerable: false,
                        configurable: true,
                        writable: true,
                        value: value
                    });
                    return object;
                }
            };

        return HateoasCommon;
    });
}(angular, Object, _));
