# CAVIGEN website concept

Design preview of a proposed CAVIGEN website. This is a concept presentation, not the official company website. The current company website remains at [cavigen.eu](https://cavigen.eu/).

The preview includes a guided product finder, animated illustrations of CaviSphere inserts and films, and a brand application study. Product geometry is approximated from photographs; the illustrations are not CAD models, microscopy or experimental results.

## Product animation update · 11 November 2026

The homepage opens with one continuous scroll journey: MicroSphere cavity field → non-adherent coating → PoroSphere fine pores and medium/nutrient exchange → SensoSphere oxygen-sensing invitation. MicroSphere remains labelled through the first two chapters. Glow is a visual explanation of a coating, not a statement of visible physical emission. The new hero pores have more than three times smaller illustrative radii than the earlier macro view.

PoroSphere porosity now opens earlier. A gently widening view reveals two neighbouring cultures, translucent moving medium streams and coloured nutrient markers. Streams enter and leave through actual pore centres; retained cells remain still. Camera-tracked labels explain the porous structure and cell-to-cell signalling. Flow geometry and particle colours are illustrative.

The logo and navigation stay visible throughout the journey. The lower bar offers MicroSphere, PoroSphere and SensoSphere directly. A sliding white selection follows the active product; culture and coating both stay under MicroSphere. A camera-tracked leader labels the coated inner wall and explains its non-adherent function.

Normal page scrolling controls the camera; chapter buttons allow direct navigation. With motion paused, the same buttons switch explanatory still views. Without WebGL, all chapters remain readable with matching product stills. The SensoSphere invitation currently links to the existing oxygen application section; a separate SensoSphere page is deferred.

All cell aggregates retain the shared compact, opaque 79-cell geometry. The insert is unchanged pending supplied production assets. Cell counts, pore dimensions, chip layouts and optical colours are schematic, not measured data. The brand page documents the updated motion direction.

## Preview with GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, then **main** and **/ (root)**. Save. The entry point is `index.html`; `.nojekyll` keeps the static files unchanged. No installation or build is needed for deployment.

The published site is publicly accessible. The pages contain `noindex,nofollow`, which is not access control.

## Local preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/ in a browser.

## Modify the 3D models

```sh
npm ci
npm run build:models
npm run test:models
```

Edit `src/product-model.js`. The built `product-model.js` is checked in and uses locally bundled Three.js. No CDN or external font request is required.

## Checks

```sh
python3 tests/check_site.py
node tests/check_finder.cjs
node tests/check_inquiry.cjs
node tests/check_models.cjs
node tests/check_motion.cjs
```

The enquiry form prepares an email draft. It does not send messages or store enquiry text. Finder answers remain in the current page's memory; only the motion preference may be stored locally.

## Assets and licences

The CAVIGEN name, original logo and brand assets belong to their respective rights holders; this repository does not grant rights to reuse them. Raleway is covered by the included SIL Open Font License. Three.js is covered by the included MIT licence. The product illustrations were created for this concept.

Original founder portraits and the labelled microscopy composite are sourced from cavigen.eu. The animated cell aggregates and measurement schematic are illustrations, not experimental data. No internal design planning documents or meeting notes are included.
