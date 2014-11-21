/* global angular, Object */

(function(angular,Object){
    'use strict';
    
    angular.module('restangular-hateoas',[
        'restangular'
    ])
    .factory('HateoasApi',[
        'Restangular',
        function hateoasApiFactory(Restangular){
            var defaultFieldMappings   =   {
                hMap: {
                    save:       'save',
                    revert:     'revert',
                    links:      '_links',
                    selfRef:    'self',
                    href:       'href',
                    baseUrl:    'baseUrl',
                    $original:  '$originial',
                    embedded:   '_embedded'
                },
                raMap: {
                    selfLink:   '_links.self.href',
                    save:       'raSave'
                }
            };
            
            /**
             * safely Attempt to retrieve a value from an object by reference.
             * 
             * @param {object} element The object from which to extract a value
             * @param {string} path The string representation of the property path
             * @returns {unresolved} Returns the value of the property at the path, or undefined if it cannnot
             */
            function getVal(element,path){
                var value;
                
                path    =   String(path).split('.');
                
                try{
                    value   =   element;
                    for(var i=0;i<path.length;i++){
                        value   =   value[path[i]];
                    }
                }catch(ex){}
                return value;
            }
            
            function setVal(element,path,value){
                var obj =   {},
                    ref =   obj;
                path    =   String(path).split('.');
                for(var i=0;i<path.length-1;i++){
                    ref[path[i]]    =   {};
                    ref             =   ref[path[i]];
                }
                ref[path[i+1]]  =   value;
                angular.extend(element,obj);
            }
            
            function setConfiguration(inst,newConfiguration){
                inst[getMap(inst,'baseUrl')]    =   newConfiguration.url;
                if(newConfiguration.map){
                    var hMap    =   inst.fieldMappings.hMap;
                    var raMap   =   inst.fieldMappings.raMap;
                    for(var property in newConfiguration.map){
                        hMap[property]    =   newConfiguration.map[property] || hMap[property];
                    }
                    raMap.selfLink   =   hMap.links+hMap.selfRef+hMap.href;
                }
            }
            
            
            function getMap(inst,name,mapType){
                mapType =   mapType || 'hMap';
                return getVal(inst,'fieldMappings.'+mapType+'.'+name);
            }
            
            
            /**
             * Apply a HATEOAS child object to a parent element
             * 
             * This method applies a HATEOAS property (an API endpoint) as a lazy-loaded property.
             * When the property is accessed, it will return a promise fill object (array) which is suitable for template binding. 
             * Once the promise resolves, the property becomes the Restangularized object and further calls are no longer needed.
             * It is important to note that until the promise is resolved, the property must not be enumerable as digests will
             * recurse through every property, effectivly pulling every possible linked piece of data from the API, including circular references.
             * 
             * @param {object} parent The parent object on which the HATEOAS child will be applied
             * @param {string} name The property name
             * @returns {object} Returns the parent object
             */
            function applyChild(parent,name){
               Object.defineProperty(parent,name,{
                   enumerable:      false,
                   configurable:    true,
                   get:             function(){
                       var promise  =   parent.all(name).getList();
                       Object.defineProperty(parent,name,{
                           enumerable:      false,
                           configurable:    true,
                           value:           promise.$object
                       });
                       promise.then(function(result){
                           Object.defineProperty(parent,name,{
                               enumerable:      true,
                               configurable:    true,
                               value:           result
                           });
                           return result;
                       });
                       return promise.$object;
                   }
               });
               return parent;
            }
            
            /**
             * Convert any child objects into HATEOAS references
             * 
             * @param {HateoasApi} inst the api instance
             * @param {object} element The Restangularized element
             * @returns {object} Returns a Restangularized element with HATEOAS reference properties
             */
            function convertToHATEOAS(inst,element){
                var result  =   {};
                angular.forEach(element,function(value,property){
                   if(value && typeof value==='object' && value.getRestangularUrl){
                       result[property] =   value.getRestangularUrl();
                   }
                   if(typeof value!=='object'){
                       result[property] =   value;
                   }
                });
                return result;
            }
            
            /**
             * Investigate an object for HATEOAS references and apply the property as a HATEOAS child object
             * 
             * @param {HateoasApi} inst the api instance
             * @param {object} element The element to investigate
             * @returns {object} Returns the element with the applied HATEOAS child objects
             */
            function convertFromHATEOAS(inst,element){
                if(!element[getMap(inst,'links')]){
                    return element;
                }
                angular.forEach(element[getMap(inst,'links')],function(value,property){
                    if(property!==getMap(inst,'selfRef')){
                        applyChild(element,property);
                    }
                });
                return element;
            }
            
            /**
             * Retrieves only the properties which have changed, since the object was loaded from the API
             * Including HATEOAS references
             * 
             * @param {HateoasApi} inst the api instance
             * @param {object} element The Restangularized element
             * @returns {object} Returns an object containing only changes
             */
            function getChangedProperties(inst,element){
                var result  =   convertToHATEOAS(inst,element);
                if(!element[getMap(inst,'$original')]){
                    return result;
                }
                angular.forEach(result,function(value,property){
                    if(property!==getMap(inst,'$original') && value===element[getMap(inst,'$original')][property]){
                       delete result[property];
                    }
                });
                return result;
            }
            
            function getElementDecorator(inst){
                return function elementDecorator(element,isCollection){
                    if(!isCollection && element[getMap(inst,'links')]){
                        convertFromHATEOAS(inst,element);
                    }
                    if(!isCollection){
                        element[getMap(inst,'save')]    =   function(){
                            if(this.fromServer){
                                return this.patch(getChangedProperties(this));
                            }
                            return this[getMap(inst,'save','raMap')]();
                        };
                        element[getMap(inst,'revert')]  =   function(){
                            if(this[getMap(inst,'$original')]){
                                angular.extend(this,angular.copy(this[getMap(inst,'$original')]));
                            }
                            return this;
                        };
                    }
                    return element;
                };
            }
            
            function getResponseInterceptor(inst){
                return function responseInterceptor(data, operation, what, url, response) {
                    operation   =   operation==='getList' && !data[getMap(inst,'embedded')] ? 'getListOne' : operation;
                    var extractedData = data,
                        href;
                    switch(operation){
                        case 'getListOne':
                            data[getMap(inst,'$original')]  =   angular.copy(data);
                            extractedData                   =   [data];
                            extractedData.falseCollection   =   true;
                            break;
                        case 'getList':
                            angular.forEach(data[getMap(inst,'embedded')][what],function(value, index){
                                data[getMap(inst,'embedded')][what][index][getMap(inst,'$original')]   =   angular.copy(value);
                            });
                            extractedData   =   data[getMap(inst,'embedded')][what];
                            break;
                        case 'update':
                        case 'post':
                        case 'put':
                        case 'patch':
                            href                                    =   getVal(extractedData,getMap(inst,'selfLink','raMap')) || response.headers('Location');
                            extractedData                           =   data || angular.copy(response.config.data);
                            extractedData[getMap(inst,'$original')] =   angular.copy(extractedData);
                            setVal(extractedData,getMap(inst,'selfLink','raMap'),href);
                            
                            break;
                        case 'options':
                        case 'delete':
                        case 'remove':
                            extractedData   =   undefined;
                            break;
                    }
                    return extractedData;
                };
            }
            
            function getRequestInterceptor(inst){
                return function requestInterceptor(element, operation) {
                    switch(operation){
                        case 'patch':
                        case 'update':
                            return getChangedProperties(inst,element);
                        case 'put':
                        case 'post':
                            return convertToHATEOAS(inst,element);
                        case 'delete':
                        case 'remove':
                            return undefined;
                        default:
                            return element;
                    }
                };
            }
            
            var raAPI   =   Restangular.withConfig(function(RestangularConfigurer){
                /**
                 * Because IDs are not sent back directly in the object body, URL building in parent-child relationships
                 * may require manual construction. This method will attempt to retrieve an object's ID from its API endpoint.
                 * 
                 * @param {object} element The Restangularized element 
                 * @returns {string || undefined} Returns the string ID if available, undefined otherwise
                 */
                RestangularConfigurer.configuration.getIdFromElem = function(element) {
                    var match   = element.getRestangularUrl().match(/\/(?:.(?!\/))+$/);
                    return match ? match[0].substr(1) : undefined;
                };
                
                /*
                 * Before an element is Restangularized, it is checked for the falseCollection flag. 
                 * If the flag is set, the real element is extracted.
                 * 
                 * Because HATEOAS references provide no indication if the endpoint is a list, or an entity untill after it is fetched,
                 * All HATEOAS child objects assume an array position for template purposes. All arrays are objects, but not all object are arrays.
                 * This means if a template attempts to iterate, the promise object container must be an array otherwise when it is resolved
                 * and converted into an object, the iteration will fail. 
                 */
                RestangularConfigurer.setOnBeforeElemRestangularized(function(element,isCollection){
                   if(isCollection && element.falseCollection){
                        element =   element[0];
                    }
                   return element;
                });
                
            });
            
            function HateoasApi(configuration){
                
                this.fieldMappings  =   angular.copy(defaultFieldMappings);
                
                this.setConfiguration(configuration);
                
                /*
                 * Set the base URL of the API
                 */
                this.setBaseUrl(this[this.fieldMappings.baseUrl]);
                
                /*
                 * Apply the field mappings
                 */
                this.setRestangularFields(this.fieldMappings.raMap);
                                
                /*
                 * After Restangular has processed an API response object, we apply HATEOAS child objects and attach a save method wrapper
                 * which will implement HTTP PATCH for updates instead of PUT. 
                 */
                this.setOnElemRestangularized(getElementDecorator(this));
                
                /*
                 * The response interceptor will notify downstream of the false collection, 
                 * add the $original property which is a copy of the object as seen from the server,
                 * and attempt to apply the self reference link if the object doesn't already have it
                 */
                this.addResponseInterceptor(getResponseInterceptor(this));
                
                /*
                 * The Request Interceptor will insure updates only send changes for PATCH
                 * and insure the object has been converted to HATEOAS references.
                 */
                this.addRequestInterceptor(getRequestInterceptor(this));
            }
            
            HateoasApi.prototype                =   raAPI;
            HateoasApi.prototype.constructor    =   HateoasApi;
            
            return HateoasApi;
        }
    ]);
    
}(angular,Object));