# Maker photos

Drop one square-ish JPG per maker, named by their handle. The polaroids on the landing
page pick them up automatically — no code change, no markup edit.

    assets/makers/tergel.jpg
    assets/makers/shanara.jpg
    assets/makers/weisean.jpg
    assets/makers/falcon.jpg
    assets/makers/ivy.jpg
    assets/makers/chiamaka.jpg
    assets/makers/janey.jpg
    assets/makers/andrea.jpg
    assets/makers/miguel.jpg
    assets/makers/fredy.jpg
    assets/makers/angela.jpg

Source: the submitted photos in the "Silk Road 001" ledger
(demo.drex.style/z/2020eaf7-.../ledger — login required, which is why they can't be
pulled automatically).

Spec: square crop, face reasonably centred, >= 400x400. They render at ~200-260px.

Until a file exists, that polaroid shows the maker's initial and a "photo soon" stamp.
initMakerPhotos() in app.js probes each one and only swaps on a successful decode, so a
missing file degrades to the placeholder rather than a broken image.

The red play dot marks makers we filmed. Wire .mv-vid to open that clip when the
interview videos are ready.
