<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Contributing to Library](#contributing-to-library)
  - [Repo Layout](#repo-layout)
  - [Feature Requests](#feature-requests)
  - [Testing](#testing)
  - [Code Conventions](#code-conventions)
- [Contributing Documentation](#contributing-documentation)
  - [Document Contributors](#document-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Contributing to Library

## Repo Layout
**`server`** contains all server-side code, including authentication, document
parsing, caching, and routing.

**`config`** contains configuration files. This includes the cloud datastore
configuration as well as a file containing the strings used throughout the app.

**`layouts`** contains `ejs` templates for all views and partials used by Library.

**`styles`** contains the scss files used to style Library. This sass will be
built and placed in `public/css` when `npm run build` is run.

**`public`** contains all client-side scripts and images. It also contains the
css compiled from `styles` after it is built.

**`custom`** contains overrides for server-side code, styling, and strings. The
checked in version of this folder should be empty besides the readme.

**`test`** contains all test files, organized by the test type (functional, unit)
and the module they are testing.

## Feature Requests
Before submitting a feature request, ensure that you can't already implement the
feature using any of Library's customization patterns. Custom middleware, cache,
styling, and strings are supported.

If you wish to propose a change, submit an issue describing your idea before
beginning development. It's worth making sure that a similar feature is not already
in process, or the feature has already been deemed out of scope of the project.

When contributing code, submit a PR describing the changes you have made. A
developer will review the changes and may approve the request or request changes
be made.

## Testing
Functional and/or unit test coverage is expected for any contributed code. Run
`npm run test` to run all tests, or `npm run test:cover` to generate a coverage
report. Ensure the majority, if not all branches are covered when writing tests.

Tests for specific modules should be named `moduleName.test.js`.

## Code Conventions
Before proposing changes, run `npm run lint` to ensure you are following all basic
code conventions. Additionally, the repo maintains a number of additional conventions:

**Naming**
- Use descriptive, logical names for variables
- Unless you are exporting a single object, prefer `exports.____` over `module.exports`.
- Environment variables should be capitalized and in snake_case.

**Comments**
- Use single-line comments where possible. Write descriptive, inline comments
  to explain your code.
- Do not use `jsdoc` style block comments.

**Asynchronous Functions & Promises**
- Prefer `async/await` over callbacks or `Promise...then()`.
- Avoid callbacks where possible.
- Favor `Promise.resolve().then(() => {})` over `new Promise((resolve, reject) => {})`
  for better readability.

**Style**
This is enforced by `eslint`. You can check your code by running `npm run lint`
- Begin all files with `use strict`.
- Use `const` when variables do not need reassignment.
- Avoid the use of `var`.
- Do not terminate lines with semicolons.
- Use two spaces to indent.
- Favor destructuring over dot notation when only accessing a few properties from an
  import.
- Favor arrow functions for lambdas unless access to the `this` context is required.

# Contributing Documentation
To add to or change any documentation in the [Library Demo](https://nyt-library-demo.herokuapp.com), please [propose a file change](https://help.github.com/en/articles/editing-files-in-another-users-repository) to this document. Change the file by adding your name to the list of contributors below. Then, in the pull request body, add your documentation changes/additions as well as a link to the page in the demo you wish to change *or* the title of the page you'd like to add.

## Document Contributors
