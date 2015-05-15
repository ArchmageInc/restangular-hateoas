(function (angular) {
    'use strict';
    angular.module('restangularHateoasExampleApp', [
        'config',
        'restangular-hateoas',
        'myApi'
    ])
    .run(function (ApiSvc) {
        console.log(ApiSvc);
    });
}(angular));
