/* global angular, _ */

(function (angular, _) {
    'use strict';
    
    angular.module('restangular-hateoas')
    .factory('HateoasApi', function ($http, Restangular, HateoasConfiguration, HateoasCommon, HateoasDecorator) {
        var map = HateoasConfiguration.map;

        function beforeObjectRestangularized(object, isCollection) {
            if (isCollection && object.falseCollection) {
                object = object[0];
            }
            return object;
        }

        function afterObjectRestangularized(object, isCollection) {
            isCollection = isCollection && _.isArray(object);
            if (!object) {
                return object;
            }
            if (!isCollection) {
                HateoasCommon.convertFromHateoas(object);
            }
            return HateoasDecorator.decorate(object, isCollection);
        }

        function responseInteceptor(apiInstance, data, operation, route, url, response, deferred) {
            route = _.get(response, 'config._route') || route;
            operation = operation === 'getList' && !_.get(data, map.embedded) && _.get(data, map.links) ? 'getListOne' : operation;
            data = data || _.get(response, 'config.data', {});

            var baseObject = _.clone(data, true);

            switch (operation) {
                case 'getListOne':
                    _.set(baseObject, map.original, _.clone(data, false));
                    baseObject = [baseObject];
                    baseObject.falseCollection = true;
                    break;
                case 'getList':
                    var extractedData = _.get(baseObject, map.embedded + '.' + route);
                    _.forEach(extractedData, function (element) {
                        _.set(element, map.original, _.clone(element, false));
                    });
                    _.set(extractedData, map.links, HateoasCommon.cleanTemplatedLinks(_.get(baseObject, map.links)));
                    baseObject = extractedData;
                    break;
                case 'post':
                case 'patch':
                    _.set(baseObject, map.original, _.clone(data, false));
                    _.set(baseObject, map.selfLink, response.headers('Location') || _.get(baseObject, map.selfLink));
                    break;
                case 'get':
                    _.set(baseObject, map.original, _.clone(data, false));
                    break;
                case 'remove':
                case 'delete':
                    baseObject = undefined;
                    break;
            }
            if (_.isObject(baseObject)) {
                baseObject.$object = deferred.promise.$object;
            }
            return baseObject;
        }

        function requestInterceptor(apiInstance, object, operation, route, url, headers, params, httpConfig) {
            headers = _.extend({}, _.get($http, 'default.headers.common'), headers);
            headers.Authorization = apiInstance.authorization.token;
            route = _.get(params, '_route', route);

            var baseObject,
                processRaw = httpConfig.processRaw;

            delete params._route;

            switch (operation) {
                case 'patch':
                case 'update':
                    baseObject = processRaw ? object : object.getChangedProperties();
                    break;
                case 'post':
                case 'put':
                    baseObject = processRaw ? object : HateoasCommon.convertToHateoas(object);
                    break;
            }

            _.extend(httpConfig, {
                _hateoas: true,
                _route: route,
                _model: object
            });

            return {
                headers: headers,
                params: params,
                element: baseObject,
                httpConfig: httpConfig
            };
        }

        function createElement(apiInstance, serviceInstance, properties) {
            properties = _.pick(properties, _.keys(serviceInstance._modelDefaults));

            var model = apiInstance.restangularizeElement(null, _.clone(serviceInstance._modelDefaults), serviceInstance._route);

            _.extend(model, properties);

            return model;
        }

        function elementTransformer(serviceInstance, object) {
            object._modelService = serviceInstance;
            return object;
        }

        function HateoasApi(baseUrl) {
            var apiInstance = this;
            _.extend(this, Restangular.withConfig(function (RestangularConfigurer) {
                RestangularConfigurer.setBaseUrl(baseUrl);
                RestangularConfigurer.setRestangularFields(map);
                RestangularConfigurer.configuration.getIdFromElem = HateoasCommon.getId;

                RestangularConfigurer.setOnBeforeElemRestangularized(beforeObjectRestangularized);
                RestangularConfigurer.setOnElemRestangularized(afterObjectRestangularized);
                RestangularConfigurer.addResponseInterceptor(_.partial(responseInteceptor, apiInstance));
                RestangularConfigurer.addFullRequestInterceptor(_.partial(requestInterceptor, apiInstance));
            }));
            _.set(this, map.service, this.service);

            this.ModelService = function (route, modelDefaults, configuration) {
                var serviceInstance = this;
                _.extend(this, apiInstance.all(route).withHttpConfig(configuration), {
                    _modelDefaults: modelDefaults,
                    _route: route,
                    create: _.bind(_.partial(createElement, apiInstance, serviceInstance), this)
                });

                apiInstance.addElementTransformer(route, _.partial(elementTransformer, serviceInstance));
            };

            this.authorization = {};
        }
        HateoasApi.prototype.setAuthToken = function (token) {
            this.authorization.token = token;
        }; 

        return HateoasApi;

    });
    
}(angular, _));
