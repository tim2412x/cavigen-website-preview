# CAVIGEN website concept

Design preview of a proposed CAVIGEN website. This is a concept presentation, not the official company website. The current company website remains at [cavigen.eu](https://cavigen.eu/).

The preview includes a guided product finder, animated illustrations of CaviSphere inserts and films, and a brand application study. Product geometry is approximated from photographs; the illustrations are not CAD models, microscopy or experimental results.

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
```

The enquiry form prepares an email draft. It does not send messages or store enquiry text. Finder answers remain in the current page's memory; only the motion preference may be stored locally.

## Assets and licences

The CAVIGEN name, original logo and brand assets belong to their respective rights holders; this repository does not grant rights to reuse them. Raleway is covered by the included SIL Open Font License. Three.js is covered by the included MIT licence. The product illustrations were created for this concept.

No original product photographs, internal design planning documents or meeting notes are included.
