/* global angular */
(function(angular){
    'use strict';
    
    angular.module('myApp',[
        'restangular-hateoas'
    ])
    .value('apiUrl','http://example.com/api')
    .factory('myApi',[
        'HateoasApi',
        'apiUrl',
        function myApiFactory(HateoasApi, apiUrl){
            var myApi   =   new HateoasApi({
                url:        apiUrl,
                map:        {
                    links:      '_links',
                    selfRef:    'self',
                    href:       'href',
                    embedded:   '_embedded'
                }
            });
            return myApi;
        }
    ])
    .factory('myModel',[
        'myApi',
        function myModelFactory(myApi){
            var myModel         =   myApi.service('myEndpoint');
            myModel.myMethod    =   function(myArgument){
                return myArgument;
            };
            return myModel;
        }
    ])
    .factory('myUsers',[
        'myApi',
        function myUsersFactory(myApi){
           var defaultUser     =   {
                firstName:  '',
                lastName:   '',
                userType:   null
            };
            var usersService        =   myApi.service('users');
            usersService.createUser =   function(properties){
                return myApi.restangularizeElement(null,angular.extend(angular.copy(defaultUser),properties),'users');
            };
            
            return usersService;            
        }
    ])
    .controller('UserCtrl',[
        '$scope',
        'myUsers',
        function UserCtrl($scope,myUsers){
            // If we are creating a user, we can attach the user to the scope.
            // Now, $scope.newUser.save() will POST the user to the /users endpoint
            // and return the newly created user
            $scope.newUser      =   myUsers.createUser();
            
            // If we want to display an ng-repeated list of users, we can attach the list object to the scope.
            // Now, in our ng-repeat="user in users" we can reference user.userType.name 
            // or user.userType.roleType.creator.favoriteCharacters[0].author.sisters[2].brothers[0].mother.uncles[3].hairColor
            // and angular's template will be okay with it. The above crazy accessor, would make 10 API calls and when they were
            // all resolved you would have some dude's hair color, provided all of the data did actually exist.
            $scope.listOfUsers  =   myUsers.getList().$object;
            
            // This would act the same as any of the users in the list above.
            $scope.specificUser =   myUsers.one(777).get().$object;
        }
    ]);
    
}(angular));