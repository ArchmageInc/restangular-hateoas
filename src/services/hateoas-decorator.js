/* global angular, Object, _ */

(function (angular, Object, _) {
    'use strict';
    angular.module('restangular-hateoas')
    .factory('HateoasDecorator', function (hateoasConfiguration, HateoasCommon, $q) {
        var map = hateoasConfiguration.map;

        function saveElement(restangularElement) {
            if (_.get(restangularElement, map.fromServer)) {

                return restangularElement.patch(restangularElement.getChangedProperties()).then(function () {
                    _.merge(_.get(restangularElement, map.original), restangularElement.plain());
                    return restangularElement;
                });
            } else {
                return _.get(restangularElement, map.save)().then(function (result) {
                    _.merge(_.get(restangularElement, map.links), _.get(result, map.links));
                    _.set(restangularElement, map.fromServer, true);
                    _.merge(_.get(restangularElement, map.original), HateoasCommon.convertToHateoas(restangularElement));
                    return restangularElement;
                });
            }
        }

        function getElementChangedProperties(restangularElement) {
            var hateoasObject = HateoasCommon.convertToHateoas(restangularElement),
                result = {};

            if (!_.get(restangularElement, map.original)) {
                return restangularElement;
            }

            _.forEach(_.get(restangularElement, map.original), function (originalValue, propertyName) {
                if (_.get(hateoasObject, propertyName) !== originalValue) {
                    _.set(result, propertyName, _.get(hateoasObject, propertyName));
                }
            });

            return result;
        }

        function revertElement(restangularElement) {
            if (_.get(restangularElement, map.original)) {
                _.extend(restangularElement, _.clone(_.get(restangularElement, map.original)));
            }
            return restangularElement;
        }

        function resolveObjectProperty(restangularElement, propertyName) {
            if (!propertyName || !restangularElement) {
                return;
            }

            var parts = propertyName.split('.'),
                part = parts.shift(),
                remain = parts.join('.');

            if (_.get(restangularElement, part + '.' + map.hiddenPromise)) {
                return restangularElement[part].then(function (child) {
                    if (remain) {
                        return resolveObjectProperties(child, [remain]);
                    } else {
                        return child;
                    }
                }, function () {
                    return null;
                });
            } else if (_.get(restangularElement, part) && remain) {
                return resolveObjectProperties(_.get(restangularElement, part), [remain]);
            } else if (_.get(restangularElement, part)) {
                return _.get(restangularElement, part);
            }

        }
        
        function collectionHasNext(restangularCollection) {
            return !!_.get(restangularCollection, map.nextLink);
        }

        function getCollectionNext(restangularCollection, params) {
            if (restangularCollection.hasNext()) {
                return restangularCollection.allUrl(restangularCollection.route, _.get(restangularCollection, map.nextLink)).getList(params).then(function (result) {
                    _.set(restangularCollection, map.nextLink, _.get(result, map.nextLink));
                    restangularCollection.push.apply(restangularCollection, result);
                    return restangularCollection;
                });
            } else {
                return $q.when(restangularCollection);
            }
        }

        function resolveObjectProperties(restangularObject, propertyNameArray) {
            var promises,
                i;

            if (_.isArray(restangularObject)) {
                promises = [];
                for (i = 0; i < restangularObject.length; i++) {
                    promises.push(resolveObjectProperties(restangularObject[i], propertyNameArray));
                }
            } else {
                promises = {};
                for (i = 0; i < propertyNameArray; i++) {
                    promises[propertyNameArray[i]] = $q.when(resolveObjectProperty(restangularObject, propertyNameArray[i]));
                }
            }

            return $q.all(promises).then(_.constant(restangularObject));
        }
        
        function hateoasGetList(restangularObject, restangularGetListFn) {
            var args = Array.prototype.slice.call(arguments, 2),
                result = restangularGetListFn.apply(restangularObject, args);

            HateoasCommon.defineHiddenChildValue(result.$object, 'then', result.then);
            return result;

        }
        function hateoasGet(restangularObject, restangularGetFn) {
            var args = Array.prototype.slice.call(arguments, 2),
                result = restangularGetFn.apply(restangularObject, args);

            HateoasCommon.defineHiddenChildValue(result.$object, 'then', result.then);
            return result;
        }



        var HateoasDecorator = {
            decorateElement: function (restangularElement) {
                _.set(restangularElement, map.restangularCollection, false);
                _.set(restangularElement, map.restangularElement, true);
                _.set(restangularElement, map.changed, false);
                
                _.extend(restangularElement, {
                    getId: _.partial(HateoasCommon.getId, restangularElement),
                    save: _.partial(saveElement, restangularElement),
                    revert: _.partial(revertElement, restangularElement),
                    getChangedProperties: _.partial(getElementChangedProperties, restangularElement),

                    resolve: _.partial(resolveObjectProperties, restangularElement),
                    get: _.partial(hateoasGet, restangularElement, restangularElement.get),
                    getList: _.partial(hateoasGetList, restangularElement, restangularElement.getList)
                });

                return restangularElement;
            },
            decorateCollection: function (restangularCollection) {
                _.set(restangularCollection, map.restangularCollection, true);
                _.set(restangularCollection, map.restangularElement, false);
                _.set(restangularCollection, map.changed, false);

                _.extend(restangularCollection, {
                    hasNext: _.partial(collectionHasNext, restangularCollection),
                    getNext: _.partial(getCollectionNext, restangularCollection),

                    resolve: _.partial(resolveObjectProperties, restangularCollection),
                    get: _.partial(hateoasGet, restangularCollection, restangularCollection.get),
                    getList: _.partial(hateoasGetList, restangularCollection, restangularCollection.getList)
                });

                return restangularCollection;
            },
            decorate: function (restangularObject, isCollection) {
                return isCollection ? HateoasDecorator.decorateCollection(restangularObject) : HateoasDecorator.decorateElement(restangularObject);
            }
        };

        return HateoasDecorator;
    });
}(angular, Object, _));
