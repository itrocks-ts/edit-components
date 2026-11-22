# Dependency wiring

The framework binds `editComponents` as the component collection renderer in
`initCoreTransformers({ editComponents })`. To replace the UI, bind a renderer with the same
signature and submit dotted row paths with the collection marker and existing row IDs.

Import `@itrocks/edit-components/build.js` in the browser entry. It uses `@itrocks/build` to
activate tables on initial load and when a form is inserted dynamically, and loads
`edit-components.css` when needed. Load the browser registrations from `@itrocks/form-controls`
for controls that need JavaScript, such as date pickers and object suggestions.
