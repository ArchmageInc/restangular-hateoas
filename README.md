# Restangular-HATEOAS

[Martin Gontovnikas (mgonto)] (http://gon.to) created a very powerful and well though out angular module to consume REST APIs easily called [restangular](https://github.com/mgonto/restangular). 
Recently, I started a project to communicate to an API driven by [Spring Data REST](http://projects.spring.io/spring-data-rest). Out of the box, it implements HATEOAS/HAL, which is great.
The problem came in when I didn't want to have these hefty services with boiler plate traversal when all of the information was already right there.
I wanted a system which would grab a known endpoint, a user let's say, and whenever a hyperlinked property was needed, it would just go get it on it's own. 
Now if you have ever worked with relational data through an API on a large project which didn't implement hyperlinked properties, you may have run into a problem where an API request was megabytes in size.
This is not an ideal solution and a big driver in hyperlinked properties. The point of this module, is to simplify that interaction, by creating lazy-loaded, hyperlinked JavaScript object properties.
This way, if the property is not accessed, it does not need to send another request to the API, and at the same time, you don't need extremely large API requests. 

## TL;DR;

The Restangular-HATEOAS module builds Restangularized objects with dynamic linked properties which will lazy-load when accessed.

## Dependencies
- [AngularJS](https://angularjs.org)
- [Restangular](https://github.com/mgonto/restangular)



*_(WIP)_*


