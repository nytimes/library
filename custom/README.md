# Customizing Library

## The `custom` Directory

The `custom` directory mirrors the directory structure of `server`. For certain
files, overrides can be created to allow for custom implementations.
Custom middleware is also supported.

A `custom` directory using all overrides will have the following structure:
```
custom/
├── package.json       // for any npm modules required for custom code
├── cache
│   └── store.js
├── middleware
│   ├── middleware1.js // pre/postload exports will be included as middleware
│   └── middleware2.js
├── strings.yaml
├── styles
│   ├── _theme.scss
│   └── _custom.scss
└── userAuth.js        // authentication middleware overrides
```

A `custom` directory demo is [available on GitHub](https://github.com/nytimes/library-customization-example).

## Styles
Sass variable overrides can be placed in `custom/styles/_theme.scss`. This allows
for setting custom values for colors and fonts across the entire application. An
example theme file could look like this:

```scss
// Font imports
@import url('https://fonts.googleapis.com/css?family=Alfa+Slab+One|Open+Sans:400,400i,700,700i&subset=latin-ext');

 // Example Light Theme
 $font-branding:                "Alpha Slab One", cursive;
 $font-headline:                "Open Sans", arial, helvetica, sans-serif;
 $font-sans:                    "Open Sans", sans-serif;
 $masthead-background:          $gray-10;
 $main-homepage-background:     $white;
 $main-homepage-icon-color:     $black;
 $main-homepage-icon-border:    $black;
 $main-page-text-color:         $gray-35;
 $main-page-btn-color:          $gray-45;
 $search-container-background:  #e6e2e2;
 $search-container-hover:       $gray-70;
 $btn-homepage-background:      $white;
 $btn-homepage-border:          $black;
 $btn-default-background:       $white;
 $btn-default-background-hover: $accent;
 $btn-default-border:           $black;
 $btn-default-text-color:       $black;
 $btn-default-text-hover:       $black;
 $btn-user-initial:             $gray-50;
 $elem-link-color:              $gray-50;
 $elem-active-link-color:       $gray-50;
 $elem-link-accent:             $accent;
 $nav-text-color:               $gray-40;
 ```


If you would like to use the default theme but want to override some styling,
you can add a `_custom.scss` file to the styles folder. There, you can place
scss to override any styles you see fit.

## Text, Language, and Branding
The site name, logo, and most of the text on the website can be modified from the
`strings.yaml` file. Any value in `config/strings.yaml` can be overridden by
placing a value for the same key in `custom/strings.yaml`, with a custom string,
Javascript function, or image path.

## Middleware
Middleware can be added to the beginning or end of the request cycle by placing
files into `custom/middleware`. These files can export `preload` and `postload`
functions. These functions must be valid middleware with params
`(res, req, next)`.

`preload` exports will be added to the beginning of the request cycle, while
`postload` exports are added near the end.


## Cache Client
By default, Library uses an in-memory cache. A custom cache client can be written
to be used in its place.

A custom cache client can be used by placing a `store.js` file in the `custom/cache`
directory. This file must export an object with the methods
- `set(key, value, callback)`, where `callback` takes `(err, success)`
- `get(key, callback)`, where `callback` takes `(err, value)`

## Authentication
By default, Library uses Google oAuth and [`passport`](http://www.passportjs.org/) to authenticate users. Different authentication systems can be used by overriding `custom/userAuth.js`, and can easily be implemented using
a different [`passport` strategy](http://www.passportjs.org/packages/) that fits
needs of your organization.

This file must export an express router or middleware that contains all authentication
logic. The logic placed in this file is run early in the middleware chain, allowing
you to ensure a user is authenticated before they are able to access site content.
