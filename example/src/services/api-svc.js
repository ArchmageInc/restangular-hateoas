(function (angular) {
    'use strict';
    angular.module('myApi')
    .factory('ApiSvc', function (config, HateoasApi) {
        var ApiSvc = new HateoasApi(config.api.baseUrl);

        console.log(ApiSvc);
        return ApiSvc;
    });
}(angular));
