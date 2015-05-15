/* global angular, _ */

(function (angular, _) {
    'use strict';
    angular.module('restangular-hateoas')
    .provider('hateoasConfiguration', function () {
        var defaultConfiguration = {
            map: {
                restangularCollection:  '$restangularCollection',
                restangularElement:     '$restangularElement',
                save:                   '$restangularSave',
                service:                '$restangularService',
                embedded:               '_embedded',
                links:                  '_links',
                selfLink:               '_links.self.href',
                nextLink:               '_links.next.href',
                original:               '_original',
                changed:                '_changed',
                fromServer:             '_fromServer',
                hiddenPromise:          '_promise'
            }
        },
        configuration = _.clone(defaultConfiguration, true);

        function setProperties(properties, value) {
            if (_.isObject(properties)) {
                _.merge(configuration, properties);
            } else if (_.isString(properties) && _.get(configuration, properties, null) !== null) {
                _.set(properties, value);
            }
        }

        function getConfiguration() {
            return configuration;
        }

        this.set  = setProperties;
        this.$get = getConfiguration;
    });
}(angular, _));
