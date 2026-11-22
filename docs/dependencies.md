# Dependency wiring

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

The framework binds the edit and read-only renderers through
`initCoreTransformers({ editComponents, outputComponents })`. To replace the UI, bind a renderer with the same
signature and submit dotted row paths with the collection marker and existing row IDs.

Import `@itrocks/edit-components/build.js` in the browser entry. It uses `@itrocks/build` to
activate tables on initial load and when a form is inserted dynamically, and loads
`edit-components.css` when needed. Load the browser registrations from `@itrocks/form-controls`
for controls that need JavaScript, such as date pickers and object suggestions.
